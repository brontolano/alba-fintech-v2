import assert from "node:assert/strict";
import test from "node:test";
import { buildApprovalScope } from "./scope";

test("MANAGER approval scope is confined to own approvals in the requested unit", () => {
  const scope = buildApprovalScope({
    role: "MANAGER",
    userId: "manager-1",
    userUnitId: "unit-A",
    requestedUnitId: "unit-A",
  });
  assert.equal(scope.status, "PENDING");
  assert.equal(scope.approverId, "manager-1");
  assert.equal(scope.unitId, "unit-A");
  assert.equal(scope.OR, undefined);
});

test("PIMPINAN approval scope stays inside their lembaga units", () => {
  const scope = buildApprovalScope({
    role: "PIMPINAN",
    lembagaId: "lembaga-1",
    lembagaUnitIds: ["unit-A", "unit-B"],
  }) as { status: string; OR: Record<string, unknown>[] };
  assert.equal(scope.status, "PENDING");
  assert.ok(Array.isArray(scope.OR));
  const unitClause = scope.OR.find((clause) => "unitId" in clause) as {
    unitId: { in: string[] };
  };
  assert.deepEqual(
    Array.from(unitClause.unitId.in).sort(),
    ["unit-A", "unit-B"],
  );
});

test("PIMPINAN scoped to a specific unit only sees that unit", () => {
  const scope = buildApprovalScope({
    role: "PIMPINAN",
    lembagaId: "lembaga-1",
    requestedUnitId: "unit-B",
    lembagaUnitIds: ["unit-A", "unit-B"],
  });
  assert.equal(scope.status, "PENDING");
  assert.equal(scope.unitId, "unit-B");
});

test("STAFF scopes to their own unit queue plus own submitted transactions", () => {
  const scope = buildApprovalScope({
    role: "STAFF",
    userId: "staff-1",
    userUnitId: "unit-A",
  }) as { OR: Record<string, unknown>[] };
  assert.ok(Array.isArray(scope.OR));
  const unitClause = scope.OR.find((clause) => "unitId" in clause) as {
    unitId: string;
  };
  assert.equal(unitClause.unitId, "unit-A");
  const createdClause = scope.OR.find((clause) => "transactions" in clause) as {
    transactions: { createdById: string };
  };
  assert.equal(createdClause.transactions.createdById, "staff-1");
});

test("SUPERADMIN has no approval filter beyond status", () => {
  const scope = buildApprovalScope({ role: "SUPERADMIN" });
  assert.deepEqual(Object.keys(scope).sort(), ["status"]);
});