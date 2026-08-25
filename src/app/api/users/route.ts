import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF']).default('STAFF'),
  unitId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100).optional(),
  email: z.string().email('Format email tidak valid').optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  role: z.enum(['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF']).optional(),
  unitId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/users
// List all users (SUPERADMIN only, or manager sees their unit's users)
export async function GET(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const unitId = session.user.unitId;

  try {
    let users;
    if (role === 'SUPERADMIN') {
      users = await prisma.user.findMany({
        include: { unit: true },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'MANAGER' && unitId) {
      users = await prisma.user.findMany({
        where: { unitId },
        include: { unit: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      data: users,
      meta: { count: users.length }
    });
  } catch (error) {
    console.error('[GET /api/users]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users
// Create new user. SUPERADMIN only.
export async function POST(request: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden — Superadmin only' }, { status: 403 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    
    // Validate input
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, email, password, role: userRole, unitId, isActive } = parsed.data;

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      );
    }

    // Verify unit exists if provided
    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        select: { id: true, isActive: true },
      });
      if (!unit || !unit.isActive) {
        return NextResponse.json(
          { error: 'Unit tidak valid atau tidak aktif' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: userRole,
        unitId: unitId || null,
        isActive: isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'user',
        entityId: user.id,
        newData: JSON.stringify(user),
      },
    });

    return NextResponse.json(
      { data: user, message: 'User berhasil dibuat' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/users]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
