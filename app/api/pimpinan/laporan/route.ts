import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || startDate;

    const where: any = {
      createdAt: {},
      isDeleted: false,
    };
    if (unitId) where.unitId = unitId;
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);

    const reports = await prisma.report.findMany({
      where,
      include: {
        unit: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by type
    const aggregation: Record<string, any> = {};
    for (const r of reports) {
      if (!aggregation[r.type]) {
        aggregation[r.type] = { count: 0, total: 0, items: [] };
      }
      aggregation[r.type].count++;
      aggregation[r.type].items.push(r);
    }

    return NextResponse.json({
      data: reports,
      aggregation,
      pagination: { page: 1, limit: 20, total: reports.length },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unitId, type, data, notes, createdById } = body;

    if (!unitId || !type) {
      return NextResponse.json({ error: 'unitId dan type wajib diisi' }, { status: 400 });
    }

    const validTypes = ['LAPORAN_TABUNGAN', 'HER', 'DAFTAR_ULANG', 'DANA_KELUAR', 'LAPORAN_HARIAN'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'type tidak valid' }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        unitId,
        type,
        data: JSON.stringify(data || {}),
        notes,
        createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        unit: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        entityType: 'Report',
        entityId: report.id,
        action: `CREATE_${type}`,
        userId: createdById,
        newData: JSON.stringify({ unitId, type, notes }),
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}