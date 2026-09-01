import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * GET /api/units/{unitId}/reconciliation/today
 * Dapatkan transaksi status DRAFT/PENDING hari ini untuk unit manager
 *
 * Akses:
 *   - MANAGER: hanya unit miliknya
 *   - PIMPINAN: bisa lihat semua unit (dengan filter unitId)
 *   - STAFF: tidak diizinkan
 */

const paramsSchema = z.object({
  unitId: z.string().min(1, 'Unit ID wajib diisi'),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedParams = paramsSchema.safeParse({
    unitId: searchParams.get('unitId') || searchParams.get('id'),
  });

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: 'Invalid params', details: parsedParams.error.errors },
      { status: 400 }
    );
  }

  const { unitId } = parsedParams.data;
  const role = session.user.role;
  const userUnitId = session.user.unitId;

  // RBAC check
  if (role === 'STAFF') {
    return NextResponse.json(
      { error: 'Staff tidak memiliki akses ke reconciliation' },
      { status: 403 }
    );
  }

  // Supervisor: PIMPINAN/MANAGER - check unit access
  if (role === 'MANAGER') {
    if (userUnitId !== unitId) {
      return NextResponse.json(
        { error: 'Manager hanya boleh melihat unit miliknya' },
        { status: 403 }
      );
    }
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        unitId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['DRAFT', 'PENDING'],
        },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        reference: true,
        photoUrl: true,
        approvals: {
          select: {
            id: true,
            status: true,
            comment: true,
            createdAt: true,
            approver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary
    const summary = transactions.reduce(
      (acc, t) => {
        if (t.status === 'DRAFT') {
          acc.draftCount += 1;
          acc.draftAmount += t.amount;
        } else if (t.status === 'PENDING') {
          acc.pendingCount += 1;
          acc.pendingAmount += t.amount;
        }
        return acc;
      },
      {
        draftCount: 0,
        draftAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
      }
    );

    return NextResponse.json({
      data: {
        transactions,
        summary,
        total: transactions.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/units/{unitId}/reconciliation/today]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}