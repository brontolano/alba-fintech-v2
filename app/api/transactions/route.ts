import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

// Allowed file types for photo uploads
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

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
  search: z.string().optional(),
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
      where.units = {
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
    // Filter by transaction date, not createdAt
    if (parsed.data.startDate || parsed.data.endDate) {
      where.date = {};
      if (parsed.data.startDate) {
        where.date.gte = new Date(parsed.data.startDate);
      }
      if (parsed.data.endDate) {
        const end = new Date(parsed.data.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Text search on description and reference
    if (parsed.data.search) {
      where.OR = [
        { description: { contains: parsed.data.search, mode: 'insensitive' } },
        { reference: { contains: parsed.data.search, mode: 'insensitive' } },
      ];
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        unitId: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        status: true,
        reference: true,
        units: { select: { name: true } },
        bank_accounts: { select: { name: true } },
        financial_categories: { select: { name: true } },
        users_transactions_createdByIdTousers: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        date: 'desc',  // Order by transaction date, not creation date (for POS)
      },
      skip: (parsed.data.page - 1) * parsed.data.limit,
      take: parsed.data.limit,
    });

    const total = await prisma.transaction.count({ where });

    // Transform data to match frontend expectations
    const transformedTransactions = transactions.map(tx => ({
      ...tx,
      unitName: tx.units?.name,
      accountName: tx.bank_accounts?.name,
      categoryName: tx.financial_categories?.name,
      createdByName: tx.users_transactions_createdByIdTousers?.name,
    }));

    return NextResponse.json({
      data: transformedTransactions,
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
      // Support either a JSON 'transactionData' string or individual form fields
      const transactionData = formData.get('transactionData') as string | null;
      if (transactionData) {
        body = JSON.parse(transactionData);
      } else {
        body = {
          type: formData.get('type'),
          amount: parseFloat(formData.get('amount') as string || '0'),
          description: formData.get('description'),
          unitId: formData.get('unitId') || undefined,
          categoryId: formData.get('categoryId') || undefined,
          accountId: formData.get('accountId') || undefined,
          reference: formData.get('reference') || undefined,
          date: formData.get('date') || undefined,
          photoUrl: formData.get('photoUrl') || undefined,
          orderItems: formData.get('orderItems')
            ? JSON.parse(formData.get('orderItems') as string)
            : undefined,
        };
      }
      
      // Handle photo upload
      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0) {
        // Validate file type
        if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
          return NextResponse.json(
            { error: 'Tipe file tidak didukung. Hanya JPEG, PNG, dan WebP yang diizinkan.' },
            { status: 400 }
          );
        }

        // Validate file size
        if (photo.size > MAX_PHOTO_SIZE) {
          return NextResponse.json(
            { error: 'Ukuran file terlalu besar. Maksimal 5MB.' },
            { status: 400 }
          );
        }

        try {
          const uploadDir = join(process.cwd(), 'public', 'uploads', 'transactions');

          if (!fs.existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
          }

          const buffer = await photo.arrayBuffer();
          const extension = photo.type.split('/')[1] || 'jpg';
          const fileName = `transaction_${uuidv4()}.${extension}`;
          const filePath = join(uploadDir, fileName);

          const nodeBuffer = Buffer.from(buffer);
          const { promises: fsPromises } = await import('fs');
          await fsPromises.writeFile(filePath, nodeBuffer);
          photoUrl = `/uploads/transactions/${fileName}`;
        } catch (error) {
          console.error('Error uploading photo:', error);
          return NextResponse.json({ error: 'Gagal mengunggah foto' }, { status: 500 });
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

    // Auto-assign unit for MANAGER/STAFF (they belong to a single unit)
    const { unitId: clientUnitId, ...safeBody } = parsed.data;
    const unitId = (role === 'MANAGER' || role === 'STAFF')
      ? clientUnitId || session.user.unitId
      : clientUnitId;
    const parsedData = { ...safeBody, unitId } as typeof parsed.data & { unitId?: string };

    if (!parsedData.unitId) {
      return NextResponse.json({ error: 'Unit wajib dipilih' }, { status: 400 });
    }

    // Parse orderItems if present
    const orderItemsData = parsedData.orderItems || [];

    // Validate unit settings for POS transactions (orderItems)
    if (orderItemsData && orderItemsData.length > 0) {
      const unitSettings = await prisma.unitSetting.findUnique({
        where: { unitId: parsedData.unitId! },
      });
      if (!unitSettings?.inventoryEnabled) {
        return NextResponse.json(
          { error: 'Unit tidak memiliki inventory yang diaktifkan untuk POS' },
          { status: 400 }
        );
      }
    }

    // Validate inventory items if provided (for POS transactions)
    for (const item of orderItemsData) {
      // Auto-calculate totalPrice if not provided or invalid
      if (item.unitPrice !== undefined && item.quantity !== undefined) {
        item.totalPrice = Number(item.unitPrice) * Number(item.quantity);
      }
      
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
      }
    }

    // Create transaction with orderItems
    const transaction = await prisma.transaction.create({
      data: {
        unitId: parsedData.unitId!,
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
        order_items: {
          create: orderItemsData.map((item: any) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            itemId: item.itemId,
          }))
        }
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