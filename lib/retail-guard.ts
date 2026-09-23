/**
 * Guard + resolver untuk semua route retail (shift, konsinyasi, inventory).
 * Pola mengikuti app/api/pos/shift/route.ts (guard kuartal) namun dengan footprint kecil
 * agar mudah diuji dan tidak mengubah file beku.
 */

const RETAIL_ROLES = ["SUPERADMIN", "PIMPINAN", "MANAGER", "STAFF"] as const;

export function guardRetail(session: any): boolean {
  const role = session?.user?.role || "";
  if (!(RETAIL_ROLES as readonly string[]).includes(role)) return false;
  // MANAGER/STAFF wajib unit retail; SUPERADMIN/PIMPINAN boleh pantau lintas unit.
  if (role === "MANAGER" || role === "STAFF") {
    return session.user.unitIsRetail === true;
  }
  return true;
}

/** MANAGER/STAFF memakai unit mereka sendiri; role atas via `requested`. */
export async function resolveUnitId(
  session: any,
  requested?: string | null,
): Promise<string | null> {
  const role = session.user.role;
  if (role === "MANAGER" || role === "STAFF") return session.user.unitId;
  return requested || session.user.unitId || null;
}

/** True untuk aksi tulis konsinyasi & inventory: staff & manager retail. */
export function canOperateRetail(session: any): boolean {
  return guardRetail(session) && session.user.role !== "SUPERADMIN";
}