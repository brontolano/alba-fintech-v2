import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

// GET /api/units
// List units. Superadmin: full info + counts. Others: basic info (active only).
export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const role = session.user.role;
    let units;

    if (role === 'SUPERADMIN') {
      units = await prisma.unit.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            users: true,
            transactions: true,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      units = await prisma.unit.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, description: true },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ data: units });
  } catch (error) {
    console.error('[GET /api/units]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
