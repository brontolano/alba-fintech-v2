export type ApprovalScopeInput = {
  role: string;
  userId?: string | null;
  userUnitId?: string | null;
  lembagaId?: string | null;
  requestedUnitId?: string | null;
  lembagaUnitIds?: string[];
};

export function buildApprovalScope(
  input: ApprovalScopeInput,
): Record<string, unknown> {
  const {
    role,
    userId,
    userUnitId,
    lembagaId,
    requestedUnitId,
    lembagaUnitIds = [],
  } = input;
  const scope: Record<string, unknown> = { status: "PENDING" };

  if (role === "MANAGER") {
    if (userId) {
      scope.approverId = userId;
    }
    if (requestedUnitId) {
      scope.unitId = requestedUnitId;
    }
    return scope;
  }

  if (role === "PIMPINAN" && lembagaId) {
    const unitIds = requestedUnitId ? [requestedUnitId] : lembagaUnitIds;
    scope.OR = [
      ...(userId ? [{ approverId: userId }] : []),
      ...(unitIds.length > 0 ? [{ unitId: { in: unitIds } }] : []),
    ];

    if (requestedUnitId) {
      scope.unitId = requestedUnitId;
    }

    return scope;
  }

  if (role === "STAFF") {
    const unitIds = requestedUnitId
      ? [requestedUnitId]
      : userUnitId
        ? [userUnitId]
        : [];
    scope.OR = [
      ...(unitIds.length > 0 ? [{ unitId: unitIds[0] }] : []),
      ...(userId ? [{ transactions: { createdById: userId } }] : []),
    ];

    if (requestedUnitId) {
      scope.unitId = requestedUnitId;
    }

    return scope;
  }

  if (requestedUnitId) {
    scope.unitId = requestedUnitId;
  }

  return scope;
}
