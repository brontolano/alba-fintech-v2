import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unitId, title, message, targetRoles, createdById } = body;

    if (!unitId || !title || !message || !createdById) {
      return NextResponse.json({ error: 'unitId, title, message, createdById required' }, { status: 400 });
    }

    const notice = await prisma.notice.create({
      data: {
        unitId,
        title,
        message,
        targetRoles: targetRoles || 'STAFF,KASI',
        createdById,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');
    const userId = searchParams.get('userId');

    const where: any = {};
    if (unitId) where.unitId = unitId;

    const notices = await prisma.notice.findMany({
      where,
      include: { createdBy: true, reads: true },
      orderBy: { createdAt: 'desc' },
    });

    // Mark as read for user if userId provided
    if (userId) {
      const unreadNoticeIds = notices
        .filter(n => !n.reads.some(r => r.userId === userId))
        .map(n => n.id);
      
      if (unreadNoticeIds.length > 0) {
        await prisma.noticeRead.createMany({
          data: unreadNoticeIds.map(noticeId => ({ noticeId, userId })),
        });
      }
    }

    return NextResponse.json(notices);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });
  }
}
