import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema for approval actions
const approvalActionSchema = z.object({
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

    // Build where clause
    const where: any = {
      status: 'PENDING',
    };

    // Role-based filtering
    if (role === 'PIMPINAN') {
      where.approverId = session.user.id;
    } else if (role === 'MANAGER') {
      where.unitId = session.user.unitId;
    }

    // Fetch approvals with related data
    const approvals = await prisma.approval.findMany({
      where,
      include: {
        transaction: {
          include: {
            unit: true,
            createdBy: {
              select: { name: true, email: true },
            },
          },
        },
        unit: true,
        approver: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      data: approvals,
      summary: {
        total: approvals.length,
        pending: approvals.filter((a) => a.status === 'PENDING').length,
        approved: approvals.filter((a) => a.status === 'APPROVED').length,
        rejected: approvals.filter((a) => a.status === 'REJECTED').length,
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

    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: parsed.data.transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    // Create approval
    const approval = await prisma.approval.create({
      data: {
        transactionId: parsed.data.transactionId,
        approverId: session.user.id,
        unitId: transaction.unitId,
        status: 'PENDING',
      },
      include: {
        transaction: true,
        unit: true,
      },
    });

    return NextResponse.json({ data: approval }, { status: 201 });
  } catch (error) {
    console.error('[Approvals API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
