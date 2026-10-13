import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allowedRoles = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU', 'PIMPINAN'];

function getRoleFromRequest(req: NextRequest): string {
  return req.headers.get('x-user-role') || 'SUPERADMIN';
}

function canAccessTagihan(role: string): boolean {
  return allowedRoles.includes(role);
}

// GET - List tagihan with pagination, search, filter
export async function GET(req: NextRequest) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTagihan(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const unitId = searchParams.get('unitId');
    const santriId = searchParams.get('santriId');
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');

    const where: any = {};
    if (santriId) where.santriId = santriId;
    if (unitId) where.unitId = unitId;
    if (status) where.status = status;
    if (templateId) where.templateId = templateId;
    if (search) {
      where.OR = [
        { santri: { name: { contains: search, mode: 'insensitive' } } },
        { santri: { studentNumber: { contains: search, mode: 'insensitive' } } },
        { template: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [tagihans, total] = await Promise.all([
      prisma.tagihan.findMany({
        where,
        include: {
          santri: {
            select: { id: true, studentNumber: true, name: true, className: true, unit: { select: { id: true, name: true } } }
          },
          template: { select: { id: true, name: true, type: true } },
          tagihanItem: true,
          pembayaran: { select: { id: true, nominal: true, status: true, tanggal: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tagihan.count({ where }),
    ]);

    return NextResponse.json({
      data: tagihans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET tagihans error:', error);
    return NextResponse.json({ error: 'Failed to fetch tagihans' }, { status: 500 });
  }
}

// POST - Generate tagihan from template (existing logic)
export async function POST(req: NextRequest) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTagihan(role) || !['SUPERADMIN', 'MANAGER KPAK'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const body = await req.json();
    const { templateId, santriIds, tanggal } = body;

    if (!templateId || !Array.isArray(santriIds) || santriIds.length === 0) {
      return NextResponse.json(
        { error: 'templateId and at least one santriId are required' },
        { status: 400 }
      );
    }

    const template = await prisma.tagihanTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    if (!template.isActive) {
      return NextResponse.json({ error: 'Template is inactive' }, { status: 400 });
    }

    const items = await prisma.tagihanTemplateItem.findMany({
      where: { templateId },
    });
    const totalPerItem = items.reduce((sum, it) => sum + it.nominal, 0);

    const tagihans = [];
    for (const santriId of santriIds) {
      const santri = await prisma.santri.findUnique({
        where: { id: santriId },
      });
      if (!santri) {
        return NextResponse.json({ error: `Santri ${santriId} not found` }, { status: 404 });
      }
      if (!santri.isActive) {
        return NextResponse.json({ error: `Santri ${santriId} is inactive` }, { status: 400 });
      }

      const tagihan = await prisma.tagihan.create({
        data: {
          unitId: santri.unitId,
          santriId,
          templateId,
          tanggal: tanggal ? new Date(tanggal) : new Date(),
          totalNilai: totalPerItem,
          status: 'UNPAID',
          tagihanItem: {
            create: items.map((it) => ({
              kode: it.kode,
              nama: it.nama,
              nominal: it.nominal,
              kategori: it.kategori,
              periode: it.periode,
              urutan: it.urutan,
            })),
          },
        },
        include: { tagihanItem: true, santri: true, template: true },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          entityType: 'Tagihan',
          entityId: tagihan.id,
          action: 'CREATE',
          userId: req.headers.get('x-user-id') || 'system',
          newData: JSON.stringify(tagihan),
        }
      });

      tagihans.push(tagihan);
    }

    return NextResponse.json({
      tagihans,
      total: tagihans.reduce((sum, t) => sum + t.totalNilai, 0),
    });
  } catch (error) {
    console.error('POST tagihans error:', error);
    return NextResponse.json({ error: 'Failed to generate tagihan' }, { status: 500 });
  }
}