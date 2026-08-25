import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100).optional(),
  email: z.string().email('Format email tidak valid').optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  role: z.enum(['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF']).optional(),
  unitId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/users/:id
// Get single user detail. SUPERADMIN: any user. MANAGER: own unit's user.
export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const role = session.user.role;
  const userId = session.user.id;
  const userUnitId = session.user.unitId;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        unit: { select: { name: true, code: true, isActive: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // RBAC check
    if (role === 'MANAGER' && user.unitId !== userUnitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('[GET /api/users/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/:id
// Update user. SUPERADMIN: full access. MANAGER: only own unit's users.
export async function PATCH(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const userId = session.user.id;
  const userUnitId = session.user.unitId;

  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    // Validate input
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Fetch existing user
    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // RBAC check
    if (role === 'MANAGER' && existing.unitId !== userUnitId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Role escalation protection
    if (role === 'MANAGER') {
      // Managers cannot change roles or assign to different units
      if (parsed.data.role !== undefined || parsed.data.unitId !== undefined) {
        return NextResponse.json(
          { error: 'Manager tidak bisa mengubah role atau unit' },
          { status: 403 }
        );
      }
    }

    // Check for duplicate email (if being updated)
    if (parsed.data.email) {
      const dup = await prisma.user.findFirst({
        where: { 
          email: parsed.data.email.toLowerCase(),
          id: { not: id }
        },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json(
          { error: 'Email sudah terdaftar pada user lain' },
          { status: 409 }
        );
      }
    }

    // Verify unit exists if being changed
    if (parsed.data.unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: parsed.data.unitId },
        select: { id: true, isActive: true },
      });
      if (!unit || !unit.isActive) {
        return NextResponse.json(
          { error: 'Unit tidak valid atau tidak aktif' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.email && { email: parsed.data.email.toLowerCase() }),
      ...(parsed.data.role && { role: parsed.data.role }),
      ...(parsed.data.unitId !== undefined && { unitId: parsed.data.unitId }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    };

    // Hash password if being updated
    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        unitId: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'user',
        entityId: id,
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json({
      data: updated,
      message: 'User berhasil diupdate',
    });
  } catch (error) {
    console.error('[PATCH /api/users/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/:id
// Soft-delete user (isActive = false). SUPERADMIN only.
export async function DELETE(request: Request) {
  const { pathname } = new URL(request.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden — Superadmin only' }, { status: 403 });
  }

  const userId = session.user.id;

  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Prevent self-deletion
  if (id === userId) {
    return NextResponse.json(
      { error: 'Tidak bisa menonaktifkan akun Anda sendiri' },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!existing.isActive) {
      return NextResponse.json(
        { error: 'User sudah tidak aktif' },
        { status: 400 }
      );
    }

    // Soft delete
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, email: true, isActive: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_SOFT',
        entity: 'user',
        entityId: id,
        oldData: JSON.stringify(existing),
        newData: JSON.stringify(updated),
      },
    });

    return NextResponse.json({
      message: 'User berhasil dinonaktifkan',
      data: updated,
    });
  } catch (error) {
    console.error('[DELETE /api/users/:id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
