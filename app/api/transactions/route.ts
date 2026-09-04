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
});

// Helper function to handle photo upload
async function handlePhotoUpload(photoFile: File): Promise<string | null> {
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'transactions');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const buffer = await photoFile.arrayBuffer();
    const fileName = `transaction_${uuidv4()}.jpg`;
    const filePath = join(uploadDir, fileName);
    
    // Convert ArrayBuffer to Buffer for Node.js fs
    const nodeBuffer = Buffer.from(buffer);
    
    // Use fs.promises.writeFile with proper buffer handling
    const { promises: fsPromises } = require('fs');
    await fsPromises.writeFile(filePath, nodeBuffer);
    return `/uploads/transactions/${fileName}`;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
}

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

    // Role-based filtering
    if (role === 'STAFF' || role === 'MANAGER') {
      where.unitId = session.user.unitId;
    } else if (role === 'PIMPINAN') {
      where.unit = {
        lembagaId: session.user.lembagaId,
      };
    }

    // Query parameter filtering (override role-based filters)
    if (parsed.data.unitId) {
      // If unitId is specified, it takes precedence
      delete where.unit;
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
    if (parsed.data.startDate && parsed.data.endDate) {
      where.OR = [
        { createdAt: { gte: parsed.data.startDate, lte: parsed.data.endDate } },
        { date: { gte: parsed.data.startDate, lte: parsed.data.endDate } },
      ];
    } else if (parsed.data.startDate) {
      where.OR = [
        { createdAt: { gte: parsed.data.startDate } },
        { date: { gte: parsed.data.startDate } },
      ];
    } else if (parsed.data.endDate) {
      where.OR = [
        { createdAt: { lte: parsed.data.endDate } },
        { date: { lte: parsed.data.endDate } },
      ];
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

    // RBAC
    const role = session.user.role;
    if (role !== 'MANAGER' && role !== 'STAFF' && role !== 'PIMPINAN' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Determine unit
    let unitId = parsed.data.unitId;
    if (!unitId && (role === 'MANAGER' || role === 'STAFF')) {
      unitId = session.user.unitId!;
    }

    // Handle photo upload if present in FormData
    let photoUrl = null;
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const photo = formData.get('photo') as File | null;
      if (photo && photo.size > 0) {
        photoUrl = await handlePhotoUpload(photo);
      }
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        unitId: unitId!,
        type: parsed.data.type,
        amount: parsed.data.amount,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        accountId: parsed.data.accountId,
        reference: parsed.data.reference,
        date: parsed.data.date ? new Date(parsed.data.date) : undefined,
        createdById: session.user.id!,
        status: 'PENDING',
        photoUrl,
      },
      include: {
        unit: true,
        account: true,
        category: true,
      },
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    console.error('[Transactions API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}