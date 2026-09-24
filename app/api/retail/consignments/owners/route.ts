import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const ownerSchema = z.object({
  name: z.string().min(1, "Nama pemilik wajib diisi").max(255),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  whatsappVerified: z.boolean().optional(),
});

/** Normalisasi + validasi nomor WA Indonesia (08… / 628…). */
export function normalizeWhatsapp(raw: unknown): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, "");
  const norm = digits.startsWith("62") ? digits : digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  if (!/^62\d{9,13}$/.test(norm)) return null;
  return norm;
}

/** GET /api/retail/consignments/owners — daftar pemilik titipan + ringkasan item. */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const unitId = await resolveUnitId(session, searchParams.get("unitId"));
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  const owners = await prisma.consignmentOwner.findMany({
    where: { unitId },
    include: { items: { where: { isActive: true }, select: { id: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    data: owners.map((o) => ({ ...o, itemCount: o.items.length })),
  });
}

/** POST /api/retail/consignments/owners — daftarkan pemilik (staff/manager). */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = ownerSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Data tidak valid" },
      { status: 400 },
    );

  const unitId = await resolveUnitId(session, null);
  if (!unitId)
    return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 400 });

  // Jalur titipan mewajibkan No WA aktif (format Indonesia).
  let phone: string | null = parsed.data.phone?.trim() || null;
  let waVerified = parsed.data.whatsappVerified ?? false;
  if (waVerified) {
    const norm = normalizeWhatsapp(phone);
    if (!norm) {
      return NextResponse.json(
        { error: "No Whatsapp aktif wajib diisi (format 08… / 628…)" },
        { status: 400 },
      );
    }
    phone = norm;
  }

  const owner = await prisma.consignmentOwner.create({
    data: {
      unitId,
      name: parsed.data.name.trim(),
      phone,
      address: parsed.data.address?.trim() || null,
      isActive: parsed.data.isActive ?? true,
      whatsappVerified: waVerified,
    },
  });
  return NextResponse.json({ data: owner }, { status: 201 });
}