import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { resolveApprover } from '@/lib/approvalRouting';


// Schema for approval actions
const _approvalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  comment: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'PIMPINAN' && role !== 'MANAGER' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedStatus = searchParams.get('status');
    const status = requestedStatus
      ? z.enum(['PENDING', 'APPROVED', 'REJECTED']).safeParse(requestedStatus)
      : null;
    if (status && !status.success) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    // Build where clause
    const where: any = status?.success ? { status: status.data } : {};

    // Role-based filtering:
    //  - MANAGER melihat pengajuan yang DITUJUKAN kepadanya (approval transaksi Staff)
    //  - PIMPINAN melihat pengajuan untuknya + semua pengajuan di lembaganya
    //    (visibilitas penuh sebagai otoritas lembaga; kewenangan memutuskan
    //    divalidasi ketat di PATCH /api/approvals/[id])
    //  - SUPERADMIN melihat semua pengajuan
    if (role === 'MANAGER') {
      where.approverId = session.user.id;
    } else if (role === 'PIMPINAN') {
      const unitIds = await prisma.unit
        .findMany({ where: { lembagaId: session.user.lembagaId }, select: { id: true } })
        .then((units) => units.map((u) => u.id));
      where.OR = [
        { approverId: session.user.id },
        { unitId: { in: unitIds } },
      ];
    }

    // Fetch approvals with related data
    const approvals = await prisma.approval.findMany({
      where,
      include: {
        transactions: {
          include: {
            units: true,
            users_transactions_createdByIdTousers: {
              select: { name: true, email: true, role: true },
            },
          },
        },
        units: true,
        users: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const data = approvals.map((approval) => ({
      ...approval,
      type: approval.transactions.type,
      amount: Number(approval.transactions.amount),
      description: approval.transactions.description,
      reference: approval.transactions.reference,
      submittedBy: approval.transactions.users_transactions_createdByIdTousers,
    }));

    return NextResponse.json({
      data,
      summary: {
        total: data.length,
        pending: data.filter((a) => a.status === 'PENDING').length,
        approved: data.filter((a) => a.status === 'APPROVED').length,
        rejected: data.filter((a) => a.status === 'REJECTED').length,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Approvals API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    const role = session.user.role;
    if (role !== 'MANAGER' && role !== 'STAFF' && role !== 'PIMPINAN' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = z.object({
      transactionId: z.string(),
    }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Check if transaction exists and belongs to user's unit/scope
    const transaction = await prisma.transaction.findUnique({
      where: { id: parsed.data.transactionId },
      select: {
        id: true,
        unitId: true,
        status: true,
        createdById: true,
        users_transactions_createdByIdTousers: {
          select: { id: true, role: true },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Validate transaction ownership against role scope
    if (role === 'STAFF' || role === 'MANAGER') {
      if (transaction.unitId !== session.user.unitId) {
        return NextResponse.json({ error: 'Forbidden - transaksi tidak berada di unit Anda' }, { status: 403 });
      }
    }

    // Prevent duplicate approval requests
    const existingApproval = await prisma.approval.findFirst({
      where: { transactionId: parsed.data.transactionId, status: 'PENDING' },
    });
    if (existingApproval) {
      return NextResponse.json({ error: 'Permintaan persetujuan sudah ada' }, { status: 409 });
    }

    // Resolve the correct approver from the transaction creator's role,
    // NOT from the submitter — root cause approvals never reached Pimpinan:
    //   dibuat STAFF   -> MANAGER unit
    //   dibuat MANAGER -> PIMPINAN lembaga
    const creatorRole = transaction.users_transactions_createdByIdTousers?.role ?? 'STAFF';
    const approverId = await resolveApprover(transaction.unitId, creatorRole);

    if (!approverId) {
      return NextResponse.json(
        { error: 'Tidak ditemukan penyetuju untuk transaksi ini' },
        { status: 400 },
      );
    }

    if (approverId === transaction.createdById) {
      return NextResponse.json(
        { error: 'Pembuat dan penyetuju tidak boleh orang yang sama' },
        { status: 400 },
      );
    }

    // Update transaction status to pending approval
    await prisma.transaction.update({
      where: { id: parsed.data.transactionId },
      data: { status: 'PENDING' },
    });

    // Create approval
    const approval = await prisma.approval.create({
      data: {
        transactionId: parsed.data.transactionId,
        approverId,
        unitId: transaction.unitId,
        status: 'PENDING',
      },
      include: {
        transactions: {
          select: {
            id: true,
            unitId: true,
            type: true,
            amount: true,
            description: true,
            date: true,
            status: true,
          },
        },
        units: true,
        users: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: approval }, { status: 201 });
  } catch (error) {
    console.error('[Approvals API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}