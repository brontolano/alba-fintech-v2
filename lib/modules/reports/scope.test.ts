import assert from "node:assert/strict";
import test from "node:test";
import { buildReportScope } from "./scope";

test("STAFF is forbidden from requesting another unit's report", () => {
  const result = buildReportScope({
    role: "STAFF",
    userUnitId: "unit-A",
    requestedUnitId: "unit-B",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "Forbidden");
});

test("MANAGER without a unit cannot read reports", () => {
  const result = buildReportScope({ role: "MANAGER" });
  assert.equal(result.allowed, false);
});

test("STAFF with a unit is scoped to their own unit", () => {
  const result = buildReportScope({ role: "STAFF", userUnitId: "unit-A" });
  assert.equal(result.allowed, true);
  assert.equal(result.unitFilter, "unit-A");
});

test("PIMPINAN is forbidden from requesting a unit outside their lembaga", () => {
  const result = buildReportScope({
    role: "PIMPINAN",
    lembagaId: "lembaga-1",
    requestedUnitId: "unit-C",
    lembagaUnitIds: ["unit-A", "unit-B"],
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "Forbidden");
});

test("PIMPINAN scoped across all lembaga units when no unit requested", () => {
  const result = buildReportScope({
    role: "PIMPINAN",
    lembagaId: "lembaga-1",
    lembagaUnitIds: ["unit-A", "unit-B"],
  });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.unitFilter, { in: ["unit-A", "unit-B"] });
});

test("SUPERADMIN passes through with optional unit filter", () => {
  const unrestricted = buildReportScope({ role: "SUPERADMIN" });
  assert.equal(unrestricted.allowed, true);
  assert.equal(unrestricted.unitFilter, undefined);

  const scoped = buildReportScope({
    role: "SUPERADMIN",
    requestedUnitId: "unit-Z",
  });
  assert.equal(scoped.allowed, true);
  assert.equal(scoped.unitFilter, "unit-Z");
});