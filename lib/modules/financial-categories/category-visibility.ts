export type CategoryVisibilityRole =
  "SUPERADMIN" | "PIMPINAN" | "MANAGER" | "STAFF" | string;

export function buildCategoryVisibilityWhere({
  role,
  lembagaId,
  unitId,
  sessionUnitId,
}: {
  role?: CategoryVisibilityRole;
  lembagaId?: string | null;
  unitId?: string | null;
  sessionUnitId?: string | null;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (role === "SUPERADMIN") {
    if (unitId) {
      where.unitId = unitId;
    }
    if (lembagaId) {
      where.lembagaId = lembagaId;
    }
    return where;
  }

  if (!lembagaId) {
    // Fallback: user tanpa lembaga (data lama) tapi punya unit —
    // tampilkan kategori unitnya saja agar operasional tidak mati total.
    if (
      (role === "STAFF" || role === "MANAGER") &&
      (unitId ?? sessionUnitId)
    ) {
      return { unitId: unitId ?? sessionUnitId };
    }
    return { id: "__EMPTY__" };
  }

  if (role === "STAFF" || role === "MANAGER") {
    where.lembagaId = lembagaId;
    const allowedUnitId = unitId ?? sessionUnitId;

    if (allowedUnitId) {
      where.OR = [{ unitId: allowedUnitId }, { unitId: null }];
    } else {
      where.OR = [{ unitId: sessionUnitId }, { unitId: null }];
    }

    return where;
  }

  if (role === "PIMPINAN") {
    where.lembagaId = lembagaId;
    if (unitId) {
      where.OR = [{ unitId }, { unitId: null }];
    }
    return where;
  }

  return {
    lembagaId,
    unitId: null,
  };
}
