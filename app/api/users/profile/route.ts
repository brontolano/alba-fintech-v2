import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { getServerSession } from "next-auth";
import { z } from "zod";

// Schema for updating profile
const updateProfileSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").optional(),
  email: z.string().email("Format email tidak valid").optional(),
  unitId: z.string().nullable().optional(),
});

// Schema for changing password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Password saat ini wajib diisi"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

// Endpoint to get user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        units: {
          select: { id: true, name: true, code: true },
        },
        lembagas: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau akun sudah tidak ada. Silakan login ulang." },
        { status: 401 },
      );
    }

    // Get lembaga data
    let lembagaData = null;
    if (user.lembagaId && user.lembagas) {
      lembagaData = {
        id: user.lembagas.id,
        name: user.lembagas.name,
        code: user.lembagas.code,
      };
    }

    // Get unit data
    let unitData = null;
    if (user.unitId && user.units) {
      unitData = {
        id: user.units.id,
        name: user.units.name,
        code: user.units.code,
      };
    }

    return NextResponse.json(
      {
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          unitId: user.unitId,
          lembagaId: user.lembagaId,
          isActive: user.isActive,
          createdAt: user.createdAt,
          unit: unitData,
          lembaga: lembagaData,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Profile API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Endpoint to update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.email !== undefined && { email: parsed.data.email }),
        ...(parsed.data.unitId !== undefined && {
          unitId: parsed.data.unitId ?? null,
        }),
      },
    });

    return NextResponse.json(
      {
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          unitId: updatedUser.unitId,
          lembagaId: updatedUser.lembagaId,
          isActive: updatedUser.isActive,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[Profile API] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
