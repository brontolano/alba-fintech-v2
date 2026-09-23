# Desain Integrasi Smart Card (RFID) — Pembayaran Darurat & POS

Dokumen ini adalah rancangan (belum implementasi penuh) integrasi pembayaran
dengan kartu santri berbasis RFID/NFC. Fase sekarang: **backend debit saldo
atomik** — tanpa perubahan UI POS. UI menyusul di fase berikutnya.

---

## 1. Latar Belakang

Pondok Pesantren Al-Basyariyah mengelola saldo santri (`SavingsAccount`) yang
dipakai untuk belanja di unit retail (Koperasi Buku, Kantin Umi, Kantin Baru).
Setiap santri bisa punya kartu dengan UID unik. Tujuan: kasir cukup **tap
kartu** di reader → saldo didebit otomatis → transaksi tercatat → stok berkurang,
semuanya atomik.

Target yang sudah tersedia di schema:

| Entitas | Kolom | Catatan |
|---------|-------|---------|
| `Student` | `cardUid String? @unique` | UID kartu (di-uppercase saat simpan/lookup) |
| `SavingsAccount` | `balance Decimal`, `status SavingsAccountStatus` | `ACTIVE / CLOSED / FROZEN` |
| `SavingsTransaction` | `type SavingsMutationType`, `balanceBefore/After`, `reference`, `cardUid`, `channel String?` | Hanya `DEPOSIT / WITHDRAWAL` |
| `Transaction` | `paymentMethod String?`, `order_items OrderItem[]` | INCOME + order items = pembukuan POS |
| `InventoryItem` | `currentStock`, `unitPrice`, `isActive` | Stok dikurangi atomik saat checkout |

Tidak ada migrasi DB yang dibutuhkan — semua kolom sudah ada.

---

## 2. Desain Endpoint

### `POST /api/smartpay`

Menerima pembayaran kartu santri dan menyelesaikan seluruh pembukuan dalam
**satu transaksi Prisma** (atomic + rollback penuh jika gagal).

### Request body

```json
{
  "cardUid": "A1B2C3D4",
  "unitId": "unit_kantin_1",
  "items": [
    { "itemId": "item_1", "quantity": 2 },
    { "itemId": "item_2", "quantity": 1 }
  ],
  "description": "Belanja siang"
}
```

- `cardUid`: wajib, dinormalisasi ke **uppercase** (sama seperti lookup kiosk).
- `unitId`: wajib. Untuk `MANAGER`/`STAFF` **dipaksa** ke `session.user.unitId`.
- `items`: minimal 1 item. Harga & total **selalu dihitung ulang dari DB**
  (`unitPrice`), bukan dari body — hindari manipulasi harga dari client.
- `description`: opsional (default: `Pembayaran kartu`).

### RBAC

| Role | Akses |
|------|-------|
| SUPERADMIN | Semua unit |
| PIMPINAN | Unit dalam lembaga miliknya |
| MANAGER / STAFF | Hanya unit sendiri | 

### Alur validasi (sebelum transaksi atomik)

1. Session valid + role diizinkan.
2. Unit target valid, `isRetail === true`, dan `UnitSetting.inventoryEnabled === true`.
3. Student ditemukan via `cardUid` (uppercase), `isActive === true`, dan
   `account` ada dengan `status === "ACTIVE"`.
4. Semua item ada di unit target, `isActive`, stok cukup.
5. `total = Σ (unitPrice × quantity)` (dari DB).
6. `account.balance >= total`.

### Alur transaksi atomik (`prisma.$transaction`)

```ts
prisma.$transaction(async (tx) => {
  // 1. Re-check saldo di dalam transaksi (guard terakhir)
  const acct = await tx.savingsAccount.findUnique({ where: { id: account.id } });
  if (!acct || acct.status !== "ACTIVE" || Number(acct.balance) < total)
    throw new Error("Saldo tidak cukup / akun tidak aktif");

  // 2. Buat mutasi debit tabungan (WITHDRAWAL)
  const savingsTx = await tx.savingsTransaction.create({
    data: {
      accountId: acct.id,
      unitId,
      type: "WITHDRAWAL",
      amount: total,
      balanceBefore: acct.balance,
      balanceAfter: acct.balance.sub(total),
      cardUid,
      channel: "SMART_CARD",
      description,
      createdById: session.user.id,
    },
  });

  // 3. Update saldo
  await tx.savingsAccount.update({
    where: { id: acct.id },
    data: { balance: { decrement: total } },
  });

  // 4. Catat transaksi keuangan INCOME + order items
  const finTx = await tx.transaction.create({
    data: {
      unitId,
      type: "INCOME",
      amount: total,
      description,
      paymentMethod: "SMART_CARD",
      reference: savingsTx.id,           // tautkan ke mutasi tabungan
      status: "APPROVED",                // dana pembayaran sudah masuk (saldo terdebit)
      createdById: session.user.id,
      approvedById: session.user.id,
      approvedAt: new Date(),
      order_items: { create: itemsWithPriceFromDb },
    },
  });

  // 5. Kurangi stok atomik (guard currentStock >= qty) — pola sama seperti
  //    /api/transactions POST
  for (const s of stockDecrement) {
    const res = await tx.inventoryItem.updateMany({
      where: { id: s.id, currentStock: { gte: s.qty } },
      data: { currentStock: { decrement: s.qty } },
    });
    if (res.count === 0)
      throw new Error("Stok berubah saat checkout. Coba lagi.");
  }

  // 6. Update mutasi tabungan dengan ID transaksi keuangan (referensi silang)
  await tx.savingsTransaction.update({
    where: { id: savingsTx.id },
    data: { reference: finTx.id },
  });

  return { savingsTx, finTx, balanceAfter: acct.balance.sub(total) };
});
```

### Response sukses (200)

```json
{
  "data": {
    "transactionId": "clx...",
    "savingsTransactionId": "clx...",
    "student": { "id": "...", "name": "Ahmad", "studentNumber": "S0001" },
    "items": [
      { "itemId": "...", "itemName": "Buku Tulis", "quantity": 2, "unitPrice": 5000, "totalPrice": 10000 }
    ],
    "total": 10000,
    "balanceBefore": 50000,
    "balanceAfter": 40000
  }
}
```

### Error (subset)

| Status | Kasus |
|--------|-------|
| 401 | Belum login |
| 403 | Role/unit tidak berwenang |
| 400 | Unit non-retail / inventory nonaktif / data tidak valid |
| 404 | Santri / akun tidak ditemukan |
| 409 | Saldo tidak cukup, akun tidak aktif, stok tidak cukup, stok berubah saat checkout |

---

## 3. Keputusan Desain (Catatan untuk Implementasi)

1. **Harga selalu dari server.** Body hanya membawa `itemId + quantity`.
2. **`paymentMethod: "SMART_CARD"`** (upper-case, konsisten konvensi R1).
3. **`channel: "SMART_CARD"`** di `SavingsTransaction` — kolom bebas `VarChar(20)`.
4. **`status: "APPROVED"`** karena dana pembayaran tidak lagi "cash di tangan"
   — uang sudah masuk sistem (saldo santri terdebit). Tanpa approval manual.
5. **Referensi silang**: `Transaction.reference` = id mutasi tabungan, dan setelah
   transaksi keuangan dibuat, mutasi tabungan `.reference` di-set ke id transaksi
   keuangan (bisa null sesaat di dalam tx).
6. **Isolasi**: `$transaction` default serializer adequate; guard saldo/stok
   re-checked di dalam tx dengan `updateMany ... gte` untuk mencegah race.
7. **Tidak menyentuh file beku KPAK**: endpoint baru `app/api/smartpay/route.ts`,
   tidak mengubah `/api/savings/transactions` atau `/api/transactions`.
8. **Idempotensi / retry**: bila total saldo tidak berubah tapi stok gagal,
   seluruh transaksi rollback. UI nanti wajib memakai "generate sekali, jangan
   resubmit" (pending state) + refresh struk.

---

## 4. Roadmap

- [x] Dokumentasi desain (file ini)
- [ ] `POST /api/smartpay` — debit atomik (lihat §2)
- [ ] Verifikasi: `npx tsc --noEmit`, `npm test`, `npm run build`
- [ ] UI POS: tombol "Bayar Kartu" → input/tap UID → struk
- [ ] Opsional: portal wali (saldo, riwayat, top-up), notifikasi WhatsApp
- [ ] Opsional: batas belanja harian / kategori terlarang per santri