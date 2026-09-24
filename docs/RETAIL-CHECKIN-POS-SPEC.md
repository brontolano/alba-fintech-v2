# Spesifikasi Check-In / Check-Out + Sesi POS — Unit Type Retail

Status: **Rancangan (belum implementasi)** — untuk direview pemilik sebelum ngoding.
Scope: unit retail (Koperasi Buku, Kantin Umi, Kantin Baru), role STAFF & MANAGER.
Bagian Agentic AI = **catatan dulu** (tidak diimplementasi tahap ini).

---

## 1. Gap analysis (kondisi existing)

| Aspek | Existing | Kebutuhan baru |
|---|---|---|
| Sesi shift | 1 baris/hari/user (`@@unique [unitId, userId, date]` di `ShiftAttendance`); check-in/out sekali, `set-service` POS/INVENTORY | Multi-session per hari; akumulasi durasi riil |
| Durasi kerja | Implisit (`checkOutAt - checkInAt`, 1 segmen) | Total = Σ segmen check-in→check-out per hari |
| Gate POS/Inventaris | Hanya guard role + `unitIsRetail` (`usePageGuard` di `pos/page.tsx`); tanpa cek status check-in | POS & Inventaris terkunci saat `Checked-Out` |
| Sesi POS (open/close) | Tidak ada; checkout langsung `POST /api/transactions` / `/api/smartpay` | `Open POS` (modal awal) → transaksi → `Close POS` (rekonsiliasi) |
| Atribusi transaksi | Sudah ada: `Transaction.createdById = session.user.id`, stok decrement atomik + guard `currentStock >= qty` | Wajib + ditautkan ke sesi POS aktif (`posSessionId`) |
| Riwayat shift | `GET /api/retail/shift?history=1` — 14 hari, durasi 1 segmen | Timeline kronologis multi-segmen + total jam aktif |

---

## 2. State Transition Diagram

```
                        ┌──────────────┐
                        │ CHECKED_OUT  │◄────────────────────────────┐
                        │ (awal hari / │                             │
                        │  usai shift) │                             │
                        └──────┬───────┘                             │
                               │ check-in                            │
                               ▼                                     │
                        ┌──────────────┐   check-out                  │
                   ┌───►│ CHECKED_IN   │──────────────┐               │
                   │    │ (idle, pilih │              │               │
                   │    │  layanan)    │              │               │
                   │    └──────┬───────┘              │               │
                   │           │ open-pos             │               │
                   │           │ (modal awal)         │               │
                   │           ▼                      │               │
                   │    ┌──────────────┐              │               │
                   │    │  POS_OPEN    │              │               │
                   │    │ (kasir aktif │              │               │
                   │    │  melayani)   │              │               │
                   │    └──────┬───────┘              │               │
                   │           │ transaksi            │               │
                   │           │ (INCOME + stok)      │               │
                   │           ▼                      │               │
                   │    ┌──────────────┐  close-pos   │               │
                   │    │ POS_CLOSING  │──────────────┤               │
                   │    │ (rekonsiliasi│  (wajib sblm │               │
                   │    │  kas)        │  check-out)  │               │
                   │    └──────────────┘              │               │
                   │                                  │               │
                   │    ATURAN TRANSISI               │               │
                   │    ───────────────               │               │
                   │    • check-in × N/hari: tiap      │               │
                   │      check-out menutup 1 segmen, │               │
                   │      check-in berikutnya buka    │               │
                   │      segmen baru (kembali ke     │               │
                   │      CHECKED_IN)                 │               │
                   │    • check-out DITOLAK bila      │               │
                   │      POS masih OPEN → wajib      │               │
                   │      close-pos dulu ATAU         │               │
                   │      mitigasi otomatis (butir 5) │               │
                   │    • INVENTORY (stock-in /       │               │
                   │      stocktake) hanya saat       │               │
                   │      CHECKED_IN atau POS_OPEN ───┘               │
                   └─────────────────────────────────────────────────┘
                        (istirahat / ganti kru / tutup sementara)
```

Status turunan (bukan state primer, dihitung):
- `POS_OPEN` = ada `PosSession` dengan `closedAt IS NULL` milik user+unit hari ini.
- `CHECKED_IN` = ada segmen shift terbuka (`checkOutAt IS NULL`) ATAU (multi-session: segmen terakhir terbuka).
- Durasi aktif hari ini = Σ(`checkOutAt − checkInAt`) segmen yang sudah tutup + (segmen berjalan: `now − checkInAt`, ditandai "berjalan").

---

## 3. Model data (usulan, migrasi manual — JANGAN `prisma db push`)

### 3a. Multi-session shift — OPSI A (disarankan): tabel baru, `ShiftAttendance` beku untouched

```prisma
model ShiftSession {
  id         String    @id @default(cuid()) @db.VarChar(36)
  unitId     String    @db.VarChar(36)
  userId     String    @db.VarChar(36)
  date       DateTime  @db.DateTime(0)          // awal hari WIB
  checkInAt  DateTime  @db.DateTime(0)
  checkOutAt DateTime? @db.DateTime(0)
  service    String?   @db.VarChar(20)          // POS | INVENTORY
  note       String?   @db.Text
  createdAt  DateTime? @default(now()) @db.DateTime(0)

  @@index([unitId, userId, date])
  @@map("shift_sessions")
}
```

Aturan:
- `check-in` → INSERT baris baru **hanya bila** tidak ada baris terbuka (`checkOutAt IS NULL`) milik user+unit itu.
- `check-out` → UPDATE baris terbuka (`SET checkOutAt = now()`). Menolak bila POS masih open (lihat butir 5).
- Total jam aktif = `SUM(checkOutAt − checkInAt)` + segmen berjalan.
- `ShiftAttendance` lama tetap dipakai read-only untuk histori (freeze), atau di-sinkron ringkas per hari (1 baris rekap). Keputusan saat implementasi.

### 3b. Sesi POS (cash drawer) — tabel baru

```prisma
model PosSession {
  id            String    @id @default(cuid()) @db.VarChar(36)
  unitId        String    @db.VarChar(36)
  userId        String    @db.VarChar(36)        // kasir penanggung jawab
  date          DateTime  @db.DateTime(0)        // awal hari WIB
  openedAt      DateTime  @db.DateTime(0)
  openingCash   Decimal   @db.Decimal(15, 2)     // modal awal (wajib > 0)
  closedAt      DateTime? @db.DateTime(0)
  expectedCash  Decimal?  @db.Decimal(15, 2)     // opening + INCOME cash − EXPENSE cash sesi ini
  countedCash   Decimal?  @db.Decimal(15, 2)     // hitung fisik saat close
  discrepancy   Decimal?  @db.Decimal(15, 2)     // counted − expected
  closeNote     String?   @db.Text
  autoClosed    Boolean?  @default(false)        // true bila mitigasi otomatis
  createdAt     DateTime? @default(now()) @db.DateTime(0)

  @@index([unitId, userId, date])
  @@map("pos_sessions")
}
```

Aturan:
- `open-pos` → wajib `CHECKED_IN` + belum ada sesi terbuka milik user+unit itu. `openingCash` wajib diisi (> 0).
- `close-pos` → wajib isi `countedCash`; sistem hitung `expectedCash` dari transaksi sesi; `discrepancy` tersimpan apa adanya (positif/negatif) untuk direview manager.
- 1 user+unit hanya boleh 1 sesi POS terbuka dalam satu waktu.

### 3c. Atribusi transaksi & stok (memanfaatkan yang sudah ada + 1 kolom baru)

- `Transaction.createdById` sudah = kasir (tetap, jangan diubah).
- Tambah kolom opsional `Transaction.posSessionId → PosSession.id` (`SET NULL` on delete) agar tiap penjualan tertaut absolut ke sesi POS. Backfill: NULL untuk data lama.
- Stok: alur existing (`orderItems` + decrement atomik + guard `currentStock >= qty` di `POST /api/transactions`, dan validasi unit di `POST /api/retail/inventory`) **tetap**; gate baru hanya menambah syarat sesi (butir 4), bukan mengganti mekanisme.

---

## 4. Aturan akuntabilitas (gate) — perilaku baru

| # | Aturan | Implementasi |
|---|---|---|
| R1 | POS & Inventaris hanya saat `CHECKED_IN` | `usePageGuard` halaman `pos/*` + `retail/inventory/*` cek `GET /api/retail/dashboard` → `shift.mine.active`; bila tidak aktif → redirect ke `/dashboard/retail/shift` + toast "Check-in dulu" |
| R2 | Transaksi POS hanya saat `POS_OPEN` | `POST /api/transactions` & `POST /api/smartpay`: bila `unitIsRetail` + role STAFF/MANAGER → wajib `posSessionId` milik user yang masih terbuka; selain itu 409 `POS_BELUM_DIBUKA` |
| R3 | Atribusi absolut | `createdById` (existing) + `posSessionId` (baru) di tiap transaksi; `stock-in`/`stocktake` existing sudah scope `unitId` + session — tambah catat `userId` pelaksana di respons/log |
| R4 | `check-out` final wajib `POS_CLOSED` | `POST /api/retail/shift {action: check-out}` menolak (409 `POS_MASIH_TERBUKA`) bila masih ada `PosSession` terbuka milik user |
| R5 | Mitigasi otomatis | Bila check-out dipaksa (kasus darurat / manager override): sistem auto-`close-pos` dengan `countedCash = expectedCash`, `autoClosed = true`, `discrepancy = 0`, catat `closeNote = "AUTO-CLOSE saat check-out paksa oleh {nama} ({alasan})"`, dan buat notifikasi ke manager. Selisih kas TIDAK boleh di-nol-kan manual tanpa jejak — auto-close selalu tercatat |

---

## 5. Blueprint layout halaman detail Check-In/Out

Route: `/dashboard/retail/shift` (tulis ulang isi, file tetap — freeze existence).

```
┌─────────────────────────────────────────────────┐
│ ← Dashboard        SHIFT SAYA         [unit]     │
│ Unit Kantin Umi · Selasa, 24 Sep · 08:12 WIB    │
├─────────────────────────────────────────────────┤
│ ┌ STATUS CARD ────────────────────────────────┐ │
│ │ ● CHECKED-IN · Kasir POS                    │ │
│ │   Check-in 07:58 · berjalan 0j 14m          │ │
│ │   Total aktif hari ini: 3j 05m (2 sesi)     │ │
│ │   [ Check-out ]                             │ │
│ └─────────────────────────────────────────────┘ │
│ ┌ KONTROL POS ────────────────────────────────┐ │
│ │ POS: OPEN · dibuka 08:02 · modal Rp 200rb   │ │
│ │ Ekspektasi kas: Rp 347.500                  │ │
│ │ [ Close POS / Rekonsiliasi ]                │ │
│ │ ── atau bila CLOSED: ──                     │ │
│ │ POS: CLOSED · [ Open POS (modal awal) ]     │ │
│ └─────────────────────────────────────────────┘ │
│ ┌ AKSES CEPAT ────────────────────────────────┐ │
│ │ [ Buka Kasir POS ] [ Stok / Inventaris ]    │ │
│ │ (disabled + tooltip bila belum check-in /   │ │
│ │  POS belum open — sesuai R1/R2)             │ │
│ └─────────────────────────────────────────────┘ │
│ ┌ TIMELINE HARI INI ──────────────────────────┐ │
│ │ 07:58 ● Check-in (POS)                      │ │
│ │ 08:02 ● Open POS · modal Rp 200.000         │ │
│ │ 08:02–… 12 transaksi · Rp 147.500           │ │
│ │ 10:31 ● Check-out (istirahat) · 2j 33m      │ │
│ │ 13:05 ● Check-in (POS) …(berjalan)          │ │
│ │ ── Total aktif: 3j 05m ──                   │ │
│ └─────────────────────────────────────────────┘ │
│ ┌ KONSOL AI (catatan — nonaktif tahap ini) ───┐ │
│ │ placeholder panel: status "segera hadir"    │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

Widget wajib tahap ini: **Ringkasan Shift, Kontrol POS, Akses Cepat, Timeline**. Konsol AI hanya placeholder (catatan).

---

## 6. Spesifikasi data & API contract

Konvensi: session cookie (NextAuth v4); error `{ error: string }`; uang dalam rupiah integer (Decimal 15,2 di DB, kirim number).

### 6.1 Shift multi-session (baru — ganti/pelengkap `/api/retail/shift`)

`POST /api/retail/shift`
```jsonc
// check-in (segmen baru)
{ "action": "check-in", "service": "POS", "note": "opsional" }
// → 201 { "data": { "id": "…", "checkInAt": "…", "service": "POS" } }
// → 409 { "error": "Masih ada sesi shift terbuka" }

// check-out (tutup segmen berjalan)
{ "action": "check-out" }
// → 200 { "data": { "id": "…", "checkOutAt": "…", "durationMin": 153 } }
// → 409 { "error": "POS_MASIH_TERBUKA", "posSessionId": "…" }

// check-out paksa (manager override / darurat)
{ "action": "check-out", "force": true, "reason": "…" }
// → 200 { "data": { "…": "…", "autoClosedPos": true } }
```

`GET /api/retail/shift?history=1` — respons ditambah segmen & total:
```jsonc
{
  "data": {
    "today": {
      "segments": [
        { "id": "…", "service": "POS",
          "checkInAt": "…", "checkOutAt": "…", "durationMin": 153 }
      ],
      "totalActiveMin": 185,
      "runningSince": "…" // null bila tidak ada segmen berjalan
    },
    "history": [ /* per hari: date, segments, totalActiveMin, txCount */ ]
  }
}
```

### 6.2 Sesi POS (baru — `/api/retail/pos-session`)

```jsonc
// POST open
{ "action": "open", "openingCash": 200000 }
// → 201 { "data": { "id": "…", "openedAt": "…", "openingCash": 200000 } }
// → 409 { "error": "BELUM_CHECKIN" } | { "error": "POS_SUDAH_TERBUKA" }

// POST close (rekonsiliasi)
{ "action": "close", "countedCash": 345000, "closeNote": "opsional" }
// → 200 { "data": {
///   "id": "…", "closedAt": "…",
///   "expectedCash": 347500, "countedCash": 345000,
///   "discrepancy": -2500, "txCount": 12, "txTotal": 147500 } }

// GET status
// → 200 { "data": { "open": { "id": "…", "openedAt": "…",
//   "openingCash": 200000, "expectedCash": 347500, "txCount": 12 }
//   | null } }
```

### 6.3 Transaksi dengan atribusi sesi (perluasan, bukan ganti)

`POST /api/transactions` dan `POST /api/smartpay` — tambah field opsional:
```jsonc
{ "type": "INCOME", "amount": 15000, "unitId": "…",
  "description": "Penjualan 2 item",
  "paymentMethod": "cash",
  "posSessionId": "…",             // ← baru, wajib bila kasir retail
  "orderItems": [ { "itemId": "…", "itemName": "…",
    "quantity": 2, "unitPrice": 7500 } ] }
```
Server (retail STAFF/MANAGER): verifikasi `posSessionId` milik `session.user.id` + terbuka → 409 `POS_BELUM_DIBUKA` bila tidak valid. `createdById` tetap dari session (existing).

### 6.4 Inventaris (gate saja, mekanisme tetap)

`POST /api/retail/inventory?action=stock-in|stocktake` — tambah prasyarat `CHECKED_IN` (409 `BELUM_CHECKIN` bila tidak). Body tidak berubah. Respons tambah `by` (nama pelaksana) untuk jejak akuntabilitas di UI.

---

## 7. Skenario Agentic AI (CATATAN — tidak diimplementasi tahap ini)

1. **Selisih kas**: saat `close-pos`, bila `|discrepancy| > ambang` (mis. > Rp 10rb atau > 2% omzet sesi) → AI menandai sesi "perlu review", menyusun narasi (jam transaksi, kasir, pola nominal), mengirim notifikasi ke manager. AI **tidak mengubah angka** — hanya menandai + menjelaskan.
2. **Anomali waktu vs volume**: AI membandingkan `totalActiveMin` vs `txCount`/omzet per kasir per hari; outlier (mis. shift 6 jam tanpa transaksi, atau 200 transaksi dalam 1 jam) memicu peringatan + saran (cek CCTV, cek stok, rotasi kru).
3. **Rekomendasi restock (velocity)**: AI menghitung kecepatan penjualan per item (`qty terjual / jam aktif`) selama sesi berjalan; bila proyeksi stok habis < 2 jam → kartu rekomendasi "Restock X sebanyak N" di dashboard + tombol aksi "Buat pengajuan belanja" (prefill).
4. **Penguncian otomatis**: bila terdeteksi pola mencurigakan (mis. void/refund beruntun, transaksi di luar jam shift, kasir ganda dalam 1 sesi POS) → AI dapat **mengunci kasir** (blokir `open-pos`/checkout sementara) + kirim peringatan ke manager; pembukaan kunci hanya oleh MANAGER/PIMPINAN dengan alasan tercatat.
5. **Otomasi pencatatan**: AI menyusun draf laporan harian unit (omzet, top item, selisih kas, jam aktif kru) dari data sesi — manager tinggal review & setujui, bukan input manual.

Prinsip: AI **read-only terhadap uang & stok** (analisis + rekomendasi + alert + kunci sementara); semua aksi mutasi tetap oleh manusia dengan jejak audit.

---

## 8. Rencana implementasi bertahap (usulan)

| Tahap | Isi | Sentuh freeze? |
|---|---|---|
| A | Migrasi manual SQL: `shift_sessions`, `pos_sessions`, kolom `transactions.posSessionId` (via phpMyAdmin, `CREATE TABLE IF NOT EXISTS`) | Tidak (tabel baru + kolom nullable baru) |
| B | `GET/POST /api/retail/pos-session` + gate R2 di transactions/smartpay + gate R4/R5 di shift | Tambah file baru; edit `transactions`/`smartpay` additive (validasi baru) |
| C | Tulis ulang `/dashboard/retail/shift` (widget + timeline) + gate R1 di halaman POS/Inventaris | File halaman tetap ada (freeze existence aman) |
| D | Dashboard retail tampilkan status POS + total jam aktif (perluas `/api/retail/dashboard`) | Additive |
| E (nanti) | Konsol AI + automasi butir 7 | Terpisah, setelah A–D stabil |

Kriteria terima tahap A–D:
- `npx tsc --noEmit` 0 error; `npm test` 67/67 hijau; `npm run build` sukses.
- Skenario uji manual: check-in → open-pos → 2 transaksi → close-pos (selisih tercatat) → check-out; check-in → check-out → check-in lagi (2 segmen, total terakumulasi); check-out saat POS open → ditolak 409; force check-out → auto-close tercatat + notifikasi.
