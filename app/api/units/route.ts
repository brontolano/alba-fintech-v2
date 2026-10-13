import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const units = await prisma.unit.findMany({
      include: { users: true, santris: true },
    });
    return NextResponse.json(units);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, description, type, isActive } = body;
    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }
    const unit = await prisma.unit.create({
      data: {
        name,
        code,
        description,
        type: type || 'KPAK',
        isActive: isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
