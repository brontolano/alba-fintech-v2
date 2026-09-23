import prisma from "@/lib/prisma";

const WIB = 7 * 3600 * 1000;

/**
 * Gate shift retail: cek apakah user punya shift aktif hari ini (WIB) di unitnya.
 * `service` opsional — saat check-in layanan POS/INVENTORY diset via /api/retail/shift.
 * Kebijakan: staff retail WAJIB check-in (POS/INVENTORY) sebelum bertugas;
 * manager tidak dibatasi gate ini (pengaturan ada di route).
 */
export async function hasActiveRetailShift(
  unitId: string,
  userId: string,
  service?: "POS" | "INVENTORY",
): Promise<boolean> {
  const dateStr = new Date(Date.now() + WIB).toISOString().slice(0, 10);
  const row = await prisma.shiftAttendance.findUnique({
    where: {
      unitId_userId_date: {
        unitId,
        userId,
        date: new Date(`${dateStr}T00:00:00.000Z`),
      },
    },
  });
  if (!row || row.checkOutAt) return false;
  if (service && row.service && row.service !== service) return false;
  return true;
}

/** True bila user adalah staff unit retail (`isRetail` aktif). */
export function isRetailUser(sessionUser: any): boolean {
  return (sessionUser as any)?.unitIsRetail === true;
}