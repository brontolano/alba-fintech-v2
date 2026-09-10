import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

// Schema for creating transactions
const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().positive('Jumlah harus positif'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  unitId: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  reference: z.string().optional(),
  date: z.string().optional(),
  photoUrl: z.string().optional(),
  orderItems: z.array(z.object({
    itemName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number().optional(),
    itemId: z.string().optional(),
  })).optional(),
});

// Schema for query parameters
const querySchema = z.object({
  unitId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    // Build where clause
    const where: any = {};
    const role = session.user.role as string;

    // Role-based filtering - STAFF and MANAGER can only see their unit
    if (role === 'STAFF' || role === 'MANAGER') {
      where.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      where.unit = {
        lembagaId: session.user.lembagaId,
      };
    }

    // Query parameter filtering (SUPERADMIN only can override role-based filters)
    if (parsed.data.unitId && role === 'SUPERADMIN') {
      where.unitId = parsed.data.unitId;
    }
    if (parsed.data.type) {
      where.type = parsed.data.type;
    }
    if (parsed.data.status) {
      where.status = parsed.data.status;
    }
    if (parsed.data.categoryId) {
      where.categoryId = parsed.data.categoryId;
    }
    // Use createdAt for date filtering for consistency
    if (parsed.data.startDate || parsed.data.endDate) {
      where.createdAt = {};
      if (parsed.data.startDate) {
        where.createdAt.gte = parsed.data.startDate;
      }
      if (parsed.data.endDate) {
        where.createdAt.lte = parsed.data.endDate;
      }
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        unit: true,
        account: true,
        category: true,
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    const total = await prisma.transaction.count({ where });

    return NextResponse.json({
      data: transactions,
      summary: {
        total,
        pages: Math.ceil(total / parsed.data.limit),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Transactions API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC - MANAGER, STAFF, PIMPINAN, SUPERADMIN can create transactions
    const role = session.user.role;
    if (role !== 'MANAGER' && role !== 'STAFF' && role !== 'PIMPINAN' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body - handle both JSON and multipart form data
    let body: any;
    const contentType = request.headers.get('content-type');
    let photoUrl: string | null = null;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      // Extract JSON string from form fields if present
      const transactionData = formData.get('transactionData') as string | null;
      if (transactionData) {
        body = JSON.parse(transactionData);
      }
      
      // Handle photo upload
      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0) {
        try {
          const uploadDir = join(process.cwd(), 'public', 'uploads', 'transactions');
          
          if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
          }

          const buffer = await photo.arrayBuffer();
          const fileName = `transaction_${uuidv4()}.jpg`;
          const filePath = join(uploadDir, fileName);
          
          const nodeBuffer = Buffer.from(buffer);
          const { promises: fsPromises } = require('fs');
          await fsPromises.writeFile(filePath, nodeBuffer);
          photoUrl = `/uploads/transactions/${fileName}`;
        } catch (error) {
          console.error('Error uploading photo:', error);
        }
      }
    } else {
      body = await request.json();
    }

    const parsed = createTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Use photoUrl from body or uploaded file
    const finalPhotoUrl = photoUrl || parsed.data.photoUrl || null;

    // Parse orderItems if present
    const orderItemsData = parsed.data.orderItems || [];

    // Validate inventory items if provided (for POS transactions)
    for (const item of orderItemsData) {
      if (item.itemId) {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId },
        });
        if (!inventoryItem) {
          return NextResponse.json(
            { error: `Item tidak ditemukan: ${item.itemName || item.itemId}` },
            { status: 400 }
          );
        }
        // Auto-calculate total price if not provided
        if (item.totalPrice === undefined && item.unitPrice && item.quantity) {
          item.totalPrice = item.unitPrice * item.quantity;
        }
      }
    }

    // Create transaction with orderItems
    const transaction = await prisma.transaction.create({
      data: {
        unitId: parsed.data.unitId!,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        accountId: parsed.data.accountId,
        reference: parsed.data.reference,
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
        createdById: session.user.id!,
        status: 'PENDING',
        photoUrl: finalPhotoUrl,
        orderItems: {
          create: orderItemsData.map((item: any) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            itemId: item.itemId,
          }))
        }
      },
      include: {
        unit: true,
        account: true,
        category: true,
        orderItems: true,
      },
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error: any) {
    console.error('[Transactions API] Error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal memproses data transaksi. Periksa koneksi database.' }, { status: 500 });
  }
}