import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const retailUnit = await prisma.retailUnit.findUnique({
      where: { id },
      include: {
        unit: { select: { id: true, name: true, code: true } },
        products: { select: { id: true, name: true, code: true, price: true, minStock: true, isActive: true } },
      },
    });

    if (!retailUnit) {
      return NextResponse.json({ error: 'Unit retail tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(retailUnit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, code, type, description, unitId, isActive } = body;

    const existing = await prisma.retailUnit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Unit retail tidak ditemukan' }, { status: 404 });
    }

    // Check if code is being changed and if it already exists
    if (code && code !== existing.code) {
      const codeExists = await prisma.retailUnit.findUnique({ where: { code } });
      if (codeExists) {
        return NextResponse.json({ error: 'Kode unit retail sudah digunakan' }, { status: 400 });
      }
    }

    const retailUnit = await prisma.retailUnit.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(type && { type }),
        ...(description !== undefined && { description }),
        ...(unitId && { unitId }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(retailUnit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const existing = await prisma.retailUnit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Unit retail tidak ditemukan' }, { status: 404 });
    }

    // Check if has products or transactions
    const counts = await Promise.all([
      prisma.retailProduct.count({ where: { retailUnitId: id } }),
      prisma.retailTransaction.count({ where: { retailUnitId: id } }),
    ]);

    if (counts[0] > 0 || counts[1] > 0) {
      return NextResponse.json({ 
        error: 'Unit retail tidak bisa dihapus karena memiliki produk atau transaksi' 
      }, { status: 400 });
    }

    await prisma.retailUnit.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}