export type ReportScopeInput = {
  role: string;
  userUnitId?: string | null;
  lembagaId?: string | null;
  requestedUnitId?: string | null;
  lembagaUnitIds?: string[];
};

export function buildReportScope(input: ReportScopeInput) {
  const { role, userUnitId, lembagaId, requestedUnitId, lembagaUnitIds = [] } = input;

  if (role === "STAFF" || role === "MANAGER") {
    if (!userUnitId) {
      return { allowed: false, reason: "User tidak memiliki unit", unitFilter: null };
    }

    const targetUnitId = requestedUnitId ?? userUnitId;
    if (requestedUnitId && requestedUnitId !== userUnitId) {
      return { allowed: false, reason: "Forbidden", unitFilter: null };
    }

    return { allowed: true, reason: null, unitFilter: targetUnitId };
  }

  if (role === "PIMPINAN") {
    if (!lembagaId) {
      return { allowed: false, reason: "Pimpinan tidak memiliki lembaga", unitFilter: null };
    }

    const targetUnitIds = requestedUnitId ? [requestedUnitId] : lembagaUnitIds;
    if (requestedUnitId) {
      const isInsideLembaga = targetUnitIds.includes(requestedUnitId);
      if (!isInsideLembaga) {
        return { allowed: false, reason: "Forbidden", unitFilter: null };
      }
    }

    return {
      allowed: true,
      reason: null,
      unitFilter: targetUnitIds.length > 0 ? { in: targetUnitIds } : { in: [] },
    };
  }

  if (role === "SUPERADMIN") {
    return { allowed: true, reason: null, unitFilter: requestedUnitId ?? undefined };
  }

  return { allowed: false, reason: "Forbidden", unitFilter: null };
}
