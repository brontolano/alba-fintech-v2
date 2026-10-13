import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Role-based access control
const allowedRoles = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'];

function getRoleFromRequest(req: NextRequest): string {
  // In production, get from auth session/JWT
  // For now, use header or default
  return req.headers.get('x-user-role') || 'SUPERADMIN';
}

function canAccessTabungan(role: string): boolean {
  return allowedRoles.includes(role);
}

export async function GET(req: NextRequest) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTabungan(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const unitId = searchParams.get('unitId');
    const santriId = searchParams.get('santriId');

    const where: any = { isDeleted: false };
    if (santriId) where.santriId = santriId;
    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { santri: { name: { contains: search, mode: 'insensitive' } } },
        { santri: { studentNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (unitId) {
      where.santri = { ...where.santri, unitId };
    }

    const [tabungans, total] = await Promise.all([
      prisma.tabungan.findMany({
        where,
        include: {
          santri: {
            select: { id: true, studentNumber: true, name: true, className: true, unit: { select: { id: true, name: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tabungan.count({ where }),
    ]);

    return NextResponse.json({
      data: tabungans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET tabungans error:', error);
    return NextResponse.json({ error: 'Failed to fetch tabungans' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTabungan(role) || !['SUPERADMIN', 'MANAGER KPAK', 'MANAGER KOPERASI BUKU'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const body = await req.json();
    const { santriId, studentNumber, accountNumber, initialSaldo = 0, minSaldo = 0 } = body;

    // Resolve santri by ID or NIS (studentNumber)
    let santri = null;
    if (santriId) {
      santri = await prisma.santri.findUnique({ where: { id: santriId } });
    } else if (studentNumber) {
      santri = await prisma.santri.findUnique({ where: { studentNumber } });
    }

    if (!santri) {
      return NextResponse.json({ error: 'Santri not found' }, { status: 404 });
    }

    // Check if santri already has tabungan
    const existing = await prisma.tabungan.findFirst({ where: { santriId: santri.id, isDeleted: false } });
    if (existing) {
      return NextResponse.json({ error: 'Santri already has a tabungan account' }, { status: 400 });
    }

    // Auto-generate accountNumber from NIS if not provided
    let finalAccountNumber = accountNumber;
    if (!finalAccountNumber) {
      finalAccountNumber = `TBG-${santri.studentNumber}`;
    }

    // Check accountNumber unique
    const accExists = await prisma.tabungan.findUnique({ where: { accountNumber: finalAccountNumber } });
    if (accExists) {
      return NextResponse.json({ error: 'Account number already exists' }, { status: 400 });
    }

    const tabungan = await prisma.tabungan.create({
      data: {
        santriId: santri.id,
        accountNumber: finalAccountNumber,
        saldo: initialSaldo,
        minSaldo,
      },
      include: {
        santri: { select: { id: true, studentNumber: true, name: true, className: true } }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Tabungan',
        entityId: tabungan.id,
        action: 'CREATE',
        userId: req.headers.get('x-user-id') || 'system',
        newData: JSON.stringify(tabungan),
      }
    });

    return NextResponse.json(tabungan, { status: 201 });
  } catch (error) {
    console.error('POST tabungans error:', error);
    return NextResponse.json({ error: 'Failed to create tabungan' }, { status: 500 });
  }
}