import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityType, entityId, action, userId, oldData, newData, ipAddress, userAgent } = body;

    if (!entityType || !entityId || !action || !userId) {
      return NextResponse.json({ error: 'entityType, entityId, action, userId required' }, { status: 400 });
    }

    const log = await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        oldData: oldData || {},
        newData: newData || {},
        ipAddress,
        userAgent,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}
