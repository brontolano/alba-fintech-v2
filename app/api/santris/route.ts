import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseFields(body: any) {
  const { studentNumber, name, className, cardUid, unitId, isActive, wali, kontak } = body;
  return {
    studentNumber: studentNumber?.toString()?.trim(),
    name: name?.toString()?.trim(),
    className: className?.toString()?.trim(),
    cardUid: cardUid?.toString()?.trim(),
    unitId: unitId?.toString(),
    isActive: typeof isActive === 'boolean' ? isActive : true,
    wali: wali?.toString()?.trim(),
    kontak: kontak?.toString()?.trim(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');
    const isActive = searchParams.get('isActive');
    const className = searchParams.get('className');
    const search = searchParams.get('search');

    const where: any = {};
    if (unitId) where.unitId = unitId;
    if (isActive !== null) where.isActive = isActive === 'true';
    if (className) where.className = className;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { studentNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const santris = await prisma.santri.findMany({
      where,
      orderBy: { studentNumber: 'asc' },
    });

    return NextResponse.json(santris);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch santris' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = parseFields(body);

    if (!data.studentNumber || !data.name || !data.unitId) {
      return NextResponse.json(
        { error: 'studentNumber, name, and unitId are required' },
        { status: 400 }
      );
    }

    const santri = await prisma.santri.create({ data });
    return NextResponse.json(santri, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'studentNumber already exists' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to create santri' }, { status: 500 });
  }
}
