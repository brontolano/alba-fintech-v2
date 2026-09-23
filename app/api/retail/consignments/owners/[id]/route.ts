import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { guardRetail, resolveUnitId } from "@/lib/retail-guard";

const params = (request: NextRequest) => request.nextUrl.pathname.split("/");

const ownerPatchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

async function getOwnerOrNext(id: string, unitId: string, res: NextResponse) {
  const owner = await prisma.consignmentOwner.findFirst({
    where: { id, unitId },
  });
  return owner;
}

/** PATCH /api/retail/consignments/owners/[id] — update pemilik */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = params(request).pop();
  const unitId = await resolveUnitId(session, null);
  if (!id || !unitId)
    return NextResponse.json({ error: "Owner tidak ditemukan" }, { status: 404 });

  const owner = await getOwnerOrNext(id, unitId, NextResponse.next());
  if (!owner)
    return NextResponse.json({ error: "Owner tidak ditemukan" }, { status: 404 });

  const parsed = ownerPatchSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Data tidak valid" },
      { status: 400 },
    );

  const updated = await prisma.consignmentOwner.update({
    where: { id },
    data: {
      name: parsed.data.name?.trim() ?? undefined,
      phone: parsed.data.phone === undefined ? undefined : parsed.data.phone,
      address:
        parsed.data.address === undefined ? undefined : parsed.data.address,
      isActive: parsed.data.isActive,
    },
  });
  return NextResponse.json({ data: updated });
}

/** DELETE /api/retail/consignments/owners/[id] — nonaktifkan (penghapusan fisik dilarang bila ada payout) */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!guardRetail(session))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.user.role === "SUPERADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = params(request).pop();
  const unitId = await resolveUnitId(session, null);
  if (!id || !unitId)
    return NextResponse.json({ error: "Owner tidak ditemukan" }, { status: 404 });

  const owner = await prisma.consignmentOwner.findFirst({
    where: { id, unitId },
    include: { payouts: { select: { id: true } }, items: { select: { id: true } } },
  });
  if (!owner)
    return NextResponse.json({ error: "Owner tidak ditemukan" }, { status: 404 });
  if (owner.payouts.length > 0)
    return NextResponse.json(
      { error: "Owner memiliki riwayat pembayaran — gunakan nonaktifkan" },
      { status: 409 },
    );

  // Hapus item titipannya dulu, lalu owner (transaksi inventori tidak dihapus).
  await prisma.$transaction([
    prisma.consignmentItem.deleteMany({ where: { id: { in: owner.items.map(i => i.id) } } }),
    prisma.consignmentOwner.delete({ where: { id } }),
  ]);
  return NextResponse.json({ data: { deleted: true } });
}