import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const updateItemSchema = z.object({
  name: z.string().min(1, 'Nama barang wajib diisi').optional(),
  sku: z.string().min(1, 'SKU wajib diisi').optional(),
  category: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  unitPrice: z.number().positive('Harga jual harus positif').optional(),
  purchasePrice: z.number().positive('Harga beli harus positif').optional().nullable(),
  currentStock: z.number().int().min(0, 'Stok tidak boleh negatif').optional(),
  minStock: z.number().int().min(0, 'Stok minimum tidak boleh negatif').optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    if (!['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        units: { select: { id: true, name: true, code: true, lembagaId: true } },
        order_items: {
          select: { id: true, itemName: true, quantity: true, unitPrice: true, totalPrice: true },
          orderBy: { id: 'desc' },
          take: 20,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });
    }

    // Scope check: MANAGER/STAFF hanya unit-nya, PIMPINAN lembaganya
    const unitId = (session.user as any)?.unitId;
    const lembagaId = (session.user as any)?.lembagaId;
    if (role === 'MANAGER' || role === 'STAFF') {
      if (item.unitId !== unitId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (role === 'PIMPINAN' && item.units?.lembagaId !== lembagaId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: item }, { status: 200 });
  } catch (error) {
    console.error('[Inventory Item GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, unitId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });
    }
    if (role === 'MANAGER' && existing.unitId !== (session.user as any)?.unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: parsed.data.name,
        sku: parsed.data.sku,
        category: parsed.data.category,
        imageUrl: parsed.data.imageUrl,
        unitPrice: parsed.data.unitPrice,
        purchasePrice: parsed.data.purchasePrice,
        currentStock: parsed.data.currentStock,
        minStock: parsed.data.minStock,
        isActive: parsed.data.isActive,
      },
    });

    return NextResponse.json(
      { message: 'Barang berhasil diperbarui', data: updated },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Inventory Item PATCH] Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, unitId: true, imageUrl: true, _count: { select: { order_items: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });
    }
    if (role === 'MANAGER' && existing.unitId !== (session.user as any)?.unitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (existing._count.order_items > 0) {
      return NextResponse.json(
        { error: 'Barang sudah pernah dipakai dalam transaksi. Nonaktifkan saja (isActive=false).' },
        { status: 400 }
      );
    }

    // Hapus file gambar lokal jika ada
    if (existing.imageUrl && existing.imageUrl.startsWith('/uploads/inventory/')) {
      try {
        const { unlink } = await import('fs/promises');
        const { join } = await import('path');
        const filename = existing.imageUrl.split('/').pop();
        if (filename) {
          await unlink(join(process.cwd(), 'public', 'uploads', 'inventory', filename));
        }
      } catch {
        // File sudah tidak ada — abaikan
      }
    }

    await prisma.inventoryItem.delete({ where: { id } });
    return NextResponse.json({ message: 'Barang berhasil dihapus' }, { status: 200 });
  } catch (error: any) {
    console.error('[Inventory Item DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
