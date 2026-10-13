import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { retailUnitId, productId, countedQuantity, reason } = body;

    if (!retailUnitId || !productId || countedQuantity === undefined || !reason) {
      return NextResponse.json({ error: 'retailUnitId, productId, countedQuantity, reason wajib diisi' }, { status: 400 });
    }

    if (countedQuantity < 0) {
      return NextResponse.json({ error: 'countedQuantity tidak boleh negatif' }, { status: 400 });
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

    const difference = countedQuantity - inventory.quantity;

    // Use transaction to update inventory and create audit log
    const result = await prisma.$transaction(async (tx) => {
      const updatedInventory = await tx.retailInventory.update({
        where: { retailUnitId_productId: { retailUnitId, productId } },
        data: { quantity: countedQuantity },
      });

      // Update product stock field as well
      await tx.retailProduct.update({
        where: { id: productId },
        data: { stock: countedQuantity },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'RetailInventoryOpname',
          entityId: updatedInventory.id,
          action: 'STOCK_OPNAME',
          userId: body.userId || 'system',
          oldData: JSON.stringify({ 
            systemQuantity: inventory.quantity, 
            countedQuantity, 
            difference,
            reason 
          }),
          newData: JSON.stringify({ quantity: countedQuantity }),
        },
      });

      return updatedInventory;
    });

    return NextResponse.json({ 
      ...result, 
      difference,
      message: difference > 0 ? `Stok bertambah ${difference}` : difference < 0 ? `Stok berkurang ${Math.abs(difference)}` : 'Stok sama' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}