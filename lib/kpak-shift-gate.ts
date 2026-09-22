import prisma from "@/lib/prisma";

const WIB = 7 * 3600 * 1000;

/** Shift aktif hari ini (WIB) untuk user di unit, opsional cocokkan layanan. */
export async function hasActiveShift(
  unitId: string,
  userId: string,
  service?: "TABUNGAN" | "KEUANGAN",
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

/** True bila user adalah staff unit KPAK (satu-satunya role yang dibatasi shift). */
export function isStaffKpak(sessionUser: any): boolean {
  return (
    sessionUser?.role === "STAFF" && (sessionUser as any)?.unitType === "KPAK"
  );
}
