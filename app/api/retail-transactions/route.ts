import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const retailUnitId = searchParams.get('retailUnitId');
    const santriId = searchParams.get('santriId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (retailUnitId) where.retailUnitId = retailUnitId;
    if (santriId) where.santriId = santriId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.retailTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          retailUnit: { select: { id: true, name: true, code: true, type: true } },
          santri: { select: { id: true, studentNumber: true, name: true } },
          user: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, code: true, price: true } } },
          },
        },
      }),
      prisma.retailTransaction.count({ where }),
    ]);

    return NextResponse.json({
      data: transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { retailUnitId, santriId, userId, items, paymentMethod, keterangan, splitPayment } = body;

    if (!retailUnitId || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
      return NextResponse.json({ error: 'retailUnitId, items[], paymentMethod wajib diisi' }, { status: 400 });
    }

    // Validasi payment method
    const validPaymentMethods = ['CASH', 'TABUNGAN', 'CARD', 'SPLIT'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json({ error: 'paymentMethod harus CASH, TABUNGAN, CARD, atau SPLIT' }, { status: 400 });
    }

    // Validasi produk & hitung total
    let totalAmount = 0;
    for (const item of items) {
      const product = await prisma.retailProduct.findUnique({ where: { id: item.productId } });
      if (!product) {
        return NextResponse.json({ error: `Produk ${item.productId} tidak ditemukan` }, { status: 400 });
      }
      if (!product.isActive) {
        return NextResponse.json({ error: `Produk ${product.name} tidak aktif` }, { status: 400 });
      }
      totalAmount += product.price * item.quantity;
    }

    // Handle SPLIT payment
    let tabungan: any = null;
    let tabunganAmount = 0;
    
    if (paymentMethod === 'SPLIT') {
      if (!splitPayment) {
        return NextResponse.json({ error: 'splitPayment wajib diisi untuk paymentMethod SPLIT' }, { status: 400 });
      }
      const { cash = 0, tabungan: tab = 0, card = 0 } = splitPayment;
      const splitTotal = cash + tab + card;
      
      if (splitTotal !== totalAmount) {
        return NextResponse.json({ error: `Total split payment (Rp ${splitTotal}) harus sama dengan total belanja (Rp ${totalAmount})` }, { status: 400 });
      }
      
      if (tab > 0) {
        if (!santriId) {
          return NextResponse.json({ error: 'santriId wajib untuk bagian pembayaran TABUNGAN' }, { status: 400 });
        }
        tabungan = await prisma.tabungan.findFirst({
          where: { santriId },
          include: { santri: true },
        });
        if (!tabungan) {
          return NextResponse.json({ error: 'Santri tidak memiliki rekening tabungan' }, { status: 404 });
        }
        if (tabungan.saldo < tab) {
          return NextResponse.json({ error: 'Saldo tabungan tidak mencukupi untuk bagian TABUNGAN' }, { status: 400 });
        }
        if (tabungan.saldo - tab < tabungan.minSaldo) {
          return NextResponse.json({ error: `Saldo tabungan akan di bawah minimum (Rp ${tabungan.minSaldo.toLocaleString('id-ID')})` }, { status: 400 });
        }
        tabunganAmount = tab;
      }
    } else if (paymentMethod === 'TABUNGAN') {
      if (!santriId) {
        return NextResponse.json({ error: 'santriId wajib untuk pembayaran TABUNGAN' }, { status: 400 });
      }
      tabungan = await prisma.tabungan.findFirst({
        where: { santriId },
        include: { santri: true },
      });
      if (!tabungan) {
        return NextResponse.json({ error: 'Santri tidak memiliki rekening tabungan' }, { status: 404 });
      }
      if (tabungan.saldo < totalAmount) {
        return NextResponse.json({ error: 'Saldo tabungan tidak mencukupi' }, { status: 400 });
      }
      if (tabungan.saldo - totalAmount < tabungan.minSaldo) {
        return NextResponse.json({ error: `Saldo akan di bawah minimum (Rp ${tabungan.minSaldo.toLocaleString('id-ID')})` }, { status: 400 });
      }
      tabunganAmount = totalAmount;
    }

    // Create transaction + items + update stock + deduct tabungan (transactional)
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.retailTransaction.create({
        data: {
          retailUnitId,
          santriId,
          userId,
          totalAmount,
          paymentMethod,
          keterangan,
          status: 'COMPLETED',
        },
      });

      // Create items & update stock
      for (const item of items) {
        const product = await tx.retailProduct.findUnique({ where: { id: item.productId } });
        await tx.retailTransactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product!.price,
            subtotal: product!.price * item.quantity,
          },
        });

        // Update product stock
        await tx.retailProduct.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Update/upsert inventory
        await tx.retailInventory.upsert({
          where: { retailUnitId_productId: { retailUnitId, productId: item.productId } },
          update: { quantity: { decrement: item.quantity } },
          create: { retailUnitId, productId: item.productId, quantity: 0 },
        });
      }

      // Handle tabungan deduction
      if (tabunganAmount > 0 && tabungan) {
        await tx.tabungan.update({
          where: { id: tabungan.id },
          data: { saldo: { decrement: tabunganAmount } },
        });

        await tx.tabunganTransaksi.create({
          data: {
            tabunganId: tabungan.id,
            santriId: tabungan.santriId,
            nominal: tabunganAmount,
            tipe: 'TARIK_TUNAI',
            kategori: 'RETAIL',
            channel: 'TABUNGAN',
            keterangan: `Pembelian retail: ${keterangan || 'Pembelian barang'}${paymentMethod === 'SPLIT' ? ` (Bagian tabungan: Rp ${tabunganAmount.toLocaleString('id-ID')})` : ''}`,
            status: 'LUNAS',
            referenceId: transaction.id,
            userId: userId,
          },
        });
      }

      // If SPLIT with cash/card, could create separate payment records or just note in keterangan
      if (paymentMethod === 'SPLIT') {
        await tx.auditLog.create({
          data: {
            entityType: 'RetailTransaction',
            entityId: transaction.id,
            action: 'CREATE_SPLIT_PAYMENT',
            userId: userId || 'system',
            newData: JSON.stringify({
              totalAmount,
              splitPayment,
              tabunganAmount,
            }),
          },
        });
      }

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}