import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

// GET /api/audit-logs
// Returns audit trail (SUPERADMIN only).
export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'SUPERADMIN only' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (entity) where.entity = entity;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    return NextResponse.json({ data: logs, meta: { total, page, limit } });
  } catch (error) {
    console.error('[GET /api/audit-logs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
