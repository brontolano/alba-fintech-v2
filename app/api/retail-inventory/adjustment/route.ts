import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { retailUnitId, productId, quantity, type, reason } = body;

    if (!retailUnitId || !productId || !quantity || !type || !reason) {
      return NextResponse.json({ error: 'retailUnitId, productId, quantity, type, reason wajib diisi' }, { status: 400 });
    }

    if (!['IN', 'OUT'].includes(type)) {
      return NextResponse.json({ error: 'type harus IN atau OUT' }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'quantity harus > 0' }, { status: 400 });
    }

    const product = await prisma.retailProduct.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }

    if (product.retailUnitId !== retailUnitId) {
      return NextResponse.json({ error: 'Produk tidak milik unit retail ini' }, { status: 400 });
    }

    const inventory = await prisma.retailInventory.findUnique({
      where: { retailUnitId_productId: { retailUnitId, productId } },
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory tidak ditemukan' }, { status: 404 });
    }

    const newQuantity = type === 'IN' 
      ? inventory.quantity + quantity 
      : inventory.quantity - quantity;

    if (newQuantity < 0) {
      return NextResponse.json({ error: 'Stok tidak boleh negatif' }, { status: 400 });
    }

    // Use transaction to update inventory and create audit log
    const result = await prisma.$transaction(async (tx) => {
      const updatedInventory = await tx.retailInventory.update({
        where: { retailUnitId_productId: { retailUnitId, productId } },
        data: { quantity: newQuantity },
      });

      // Update product stock field as well
      await tx.retailProduct.update({
        where: { id: productId },
        data: { stock: newQuantity },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'RetailInventoryAdjustment',
          entityId: updatedInventory.id,
          action: type === 'IN' ? 'STOCK_IN' : 'STOCK_OUT',
          userId: body.userId || 'system',
          oldData: JSON.stringify({ quantity: inventory.quantity }),
          newData: JSON.stringify({ quantity: newQuantity, type, reason }),
        },
      });

      return updatedInventory;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}