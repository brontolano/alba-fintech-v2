import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

// GET /api/users
// List all users (SUPERADMIN only, or manager sees their unit's users)
export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const unitId = session.user.unitId;

  try {
    let users;
    if (role === 'SUPERADMIN') {
      users = await prisma.user.findMany({
        include: { unit: true },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'MANAGER' && unitId) {
      users = await prisma.user.findMany({
        where: { unitId },
        include: { unit: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error('[GET /api/users]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
