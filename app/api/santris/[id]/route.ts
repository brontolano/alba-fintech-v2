import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const santri = await prisma.santri.findUnique({
      where: { id },
    });

    if (!santri) {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(santri);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal mengambil data santri' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { name, className, isActive, wali, kontak, unitId } = body;

    // Resolve unit if provided
    let unitIdResolved = unitId;
    if (unitId && typeof unitId === 'string') {
      // optional validation
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (className !== undefined) updates.className = className;
    if (isActive !== undefined) updates.isActive = isActive;
    if (wali !== undefined) updates.wali = wali;
    if (kontak !== undefined) updates.kontak = kontak;
    if (unitIdResolved !== undefined) updates.unitId = unitIdResolved;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 });
    }

    const updated = await prisma.santri.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'studentNumber sudah digunakan' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Gagal memperbarui santri' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Soft delete: set isActive = false
    const updated = await prisma.santri.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Gagal menghapus santri' }, { status: 500 });
  }
}
