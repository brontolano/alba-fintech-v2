import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allowedRoles = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'];

function getRoleFromRequest(req: NextRequest): string {
  return req.headers.get('x-user-role') || 'SUPERADMIN';
}

function canAccessTabungan(role: string): boolean {
  return allowedRoles.includes(role);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTabungan(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const tabungan = await prisma.tabungan.findFirst({
      where: { id, isDeleted: false },
      include: {
        santri: {
          select: {
            id: true,
            studentNumber: true,
            name: true,
            className: true,
            unit: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!tabungan) {
      return NextResponse.json({ error: 'Tabungan not found' }, { status: 404 });
    }

    return NextResponse.json(tabungan);
  } catch (error) {
    console.error('GET tabungan error:', error);
    return NextResponse.json({ error: 'Failed to fetch tabungan' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTabungan(role) || !['SUPERADMIN', 'MANAGER KPAK', 'MANAGER KOPERASI BUKU'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { minSaldo, accountNumber } = body;

    const existing = await prisma.tabungan.findFirst({ where: { id, isDeleted: false } });
    if (!existing) {
      return NextResponse.json({ error: 'Tabungan not found' }, { status: 404 });
    }

    // Check accountNumber uniqueness if changing
    if (accountNumber && accountNumber !== existing.accountNumber) {
      const accExists = await prisma.tabungan.findUnique({ where: { accountNumber } });
      if (accExists) {
        return NextResponse.json({ error: 'Account number already exists' }, { status: 400 });
      }
    }

    const tabungan = await prisma.tabungan.update({
      where: { id },
      data: {
        ...(minSaldo !== undefined && { minSaldo }),
        ...(accountNumber && { accountNumber }),
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
        action: 'UPDATE',
        userId: req.headers.get('x-user-id') || 'system',
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(tabungan),
      }
    });

    return NextResponse.json(tabungan);
  } catch (error) {
    console.error('PUT tabungan error:', error);
    return NextResponse.json({ error: 'Failed to update tabungan' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getRoleFromRequest(req);
    if (!canAccessTabungan(role) || !['SUPERADMIN', 'MANAGER KPAK'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.tabungan.findFirst({ where: { id, isDeleted: false } });
    if (!existing) {
      return NextResponse.json({ error: 'Tabungan not found' }, { status: 404 });
    }

    // Soft delete
    const tabungan = await prisma.tabungan.update({
      where: { id },
      data: { isDeleted: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Tabungan',
        entityId: tabungan.id,
        action: 'DELETE',
        userId: req.headers.get('x-user-id') || 'system',
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(tabungan),
      }
    });

    return NextResponse.json({ message: 'Tabungan deleted (soft)' });
  } catch (error) {
    console.error('DELETE tabungan error:', error);
    return NextResponse.json({ error: 'Failed to delete tabungan' }, { status: 500 });
  }
}