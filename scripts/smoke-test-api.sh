#!/bin/bash
# Smoke test integrasi API ALBA Finance
BASE="http://localhost:57216"
JAR=".freebuff/jar-superadmin.txt"
JAR2=".freebuff/jar-manager.txt"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" == "$expected" ]; then
    echo "  OK   $name ($actual)"
    PASS=$((PASS+1))
  else
    echo "  FAIL $name (dapat $actual, harap $expected)"
    FAIL=$((FAIL+1))
  fi
}

# Ekstraksi field JSON secara aman: jsonget "data.0.id"
jsonget() {
  node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try {
    let v=JSON.parse(d);
    for (const k of process.argv[1].split('.')) v = v?.[k];
    console.log(typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''));
  } catch { console.log(''); }
});" "$1"
}

login() {
  local jar="$1" email="$2" pass="$3"
  local csrf
  csrf=$(curl -s -c "$jar" "$BASE/api/auth/csrf" | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')
  curl -s -o /dev/null -b "$jar" -c "$jar" -X POST "$BASE/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "User-Agent: Mozilla/5.0" \
    --data-urlencode "csrfToken=$csrf" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$pass" \
    --data-urlencode "json=true"
}

echo "== 1. Login =="
login "$JAR" "superadmin@alba.local" "bismillah"
login "$JAR2" "manager.kantin1@alba.local" "Bismillah123!"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/users/profile")
check "GET /api/users/profile (superadmin)" 200 "$code"

echo "== 2. Modul transaksi =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/transactions?limit=5")
check "GET /api/transactions" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/transactions?search=nasi")
check "GET /api/transactions?search" 200 "$code"

echo "== 3. Modul approvals =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/approvals")
check "GET /api/approvals" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/approvals/audit")
check "GET /api/approvals/audit" 200 "$code"

echo "== 4. Modul catatan keuangan + rekonsiliasi =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/financial-notes?limit=5")
check "GET /api/financial-notes" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/financial-notes?isReconciled=true")
check "GET /api/financial-notes?isReconciled" 200 "$code"

echo "== 5. Modul dashboard & laporan =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/dashboard/aggregates")
check "GET /api/dashboard/aggregates" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/reports/aggregations")
check "GET /api/reports/aggregations" 200 "$code"

echo "== 6. Modul master data =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/units")
check "GET /api/units" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/financial-categories")
check "GET /api/financial-categories" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/users")
check "GET /api/users" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/lembaga")
check "GET /api/lembaga" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/settings")
check "GET /api/settings" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/broadcast")
check "GET /api/broadcast" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/notifications")
check "GET /api/notifications" 200 "$code"

echo "== 7. Modul inventory + route baru =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/inventory?limit=5")
check "GET /api/inventory" 200 "$code"
INV_ID=$(curl -s -b "$JAR" "$BASE/api/inventory?limit=1" | jsonget "data.0.id")
if [ ${#INV_ID} -gt 10 ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$BASE/api/inventory/$INV_ID")
  check "GET /api/inventory/[id] (route baru)" 200 "$code"
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X PATCH "$BASE/api/inventory/$INV_ID" -H "Content-Type: application/json" -d '{"currentStock":150}')
  check "PATCH /api/inventory/[id] (route baru)" 200 "$code"
fi

echo "== 8. RBAC lintas role =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR2" "$BASE/api/settings")
check "GET /api/settings sebagai MANAGER (harap 403)" 403 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR2" "$BASE/api/users")
check "GET /api/users sebagai MANAGER" 200 "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/transactions")
check "GET /api/transactions tanpa login (harap 401)" 401 "$code"

echo "== 9. Integrasi POS -> stok =="
UNIT_ID=$(curl -s -b "$JAR2" "$BASE/api/users/profile" | jsonget "data.unitId")
ITEM_ID=$(curl -s -b "$JAR2" "$BASE/api/inventory?limit=1" | jsonget "data.0.id")
BEFORE=$(curl -s -b "$JAR2" "$BASE/api/inventory/$ITEM_ID" | jsonget "data.currentStock")
echo "  stok sebelum: $BEFORE"
csrf=$(curl -s -b "$JAR2" -c "$JAR2" "$BASE/api/auth/csrf" | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')
res=$(curl -s -b "$JAR2" -X POST "$BASE/api/transactions" -H "Content-Type: application/json" \
  -d "{\"type\":\"INCOME\",\"amount\":25000,\"description\":\"[smoke-test] POS penjualan\",\"unitId\":\"$UNIT_ID\",\"orderItems\":[{\"itemId\":\"$ITEM_ID\",\"itemName\":\"Smoke Test\",\"quantity\":2,\"unitPrice\":12500}]}")
TXN_ID=$(echo "$res" | jsonget "data.id")
AFTER=$(curl -s -b "$JAR2" "$BASE/api/inventory/$ITEM_ID" | jsonget "data.currentStock")
echo "  stok sesudah: $AFTER"
if [ $((BEFORE-AFTER)) -eq 2 ]; then
  echo "  OK   stok berkurang 2 (POS -> inventory terintegrasi)"
  PASS=$((PASS+1))
else
  echo "  FAIL stok tidak berkurang dengan benar ($BEFORE -> $AFTER)"
  FAIL=$((FAIL+1))
fi
# Stok berlebih harus ditolak
res=$(curl -s -b "$JAR2" -X POST "$BASE/api/transactions" -H "Content-Type: application/json" \
  -d "{\"type\":\"INCOME\",\"amount\":990000000,\"description\":\"[smoke-test] stok berlebih\",\"unitId\":\"$UNIT_ID\",\"orderItems\":[{\"itemId\":\"$ITEM_ID\",\"itemName\":\"Over\",\"quantity\":999999,\"unitPrice\":1}]}")
if echo "$res" | grep -q "Stok tidak mencukupi"; then
  echo "  OK   transaksi stok berlebih ditolak"
  PASS=$((PASS+1))
else
  echo "  FAIL transaksi stok berlebih tidak ditolak"
  FAIL=$((FAIL+1))
fi
# Hapus data uji (rollback smoke)
if [ ${#TXN_ID} -gt 10 ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X DELETE "$BASE/api/transactions/$TXN_ID")
  echo "  (cleanup transaksi uji: $code)"
  curl -s -b "$JAR" -X PATCH "$BASE/api/inventory/$INV_ID" -H "Content-Type: application/json" -d "{\"currentStock\":$BEFORE}" > /dev/null
  echo "  (stok dikembalikan ke $BEFORE)"
fi

echo ""
echo "==================================="
echo "HASIL: $PASS OK, $FAIL FAIL"
exit $FAIL
