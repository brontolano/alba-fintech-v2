/**
 * Fase operasional harian RETAIL (WIB) — linimasa kerja staf & manager unit retail:
 *   PERSIAPAN 06:00–06:30 → OPERASI 06:30–08:30 → PENERIMAAN 08:30–11:30
 *   → LAYANI 11:30–17:00 → HITUNG 17:00–19:00 → PENUTUPAN 19:00–22:00 → TUTUP 22:00–06:00.
 * Dipakai RetailStaffDashboard + RetailManagerDashboard agar urutan kerja mengikuti jam.
 */

export type RetailPhaseKey =
  | "persiapan"
  | "operasi"
  | "penerimaan"
  | "layani"
  | "hitung"
  | "penutupan"
  | "tutup";

export interface RetailPhase {
  key: RetailPhaseKey;
  label: string;
  hint: string;
}

export function nowWib(): string {
  return new Date().toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRetailPhase(at?: string): RetailPhase {
  const t = at || nowWib();
  if (t < "06:00")
    return {
      key: "tutup",
      label: "Tutup",
      hint: "Belum buka — staf siap-siap sebelum 06:00",
    };
  if (t <= "06:30")
    return {
      key: "persiapan",
      label: "Persiapan",
      hint: "Check-in, cek stok awal, siapkan kasir sebelum 06:30",
    };
  if (t <= "08:30")
    return {
      key: "operasi",
      label: "Operasi Pagi",
      hint: "Buka layanan kasir (POS) & layani pembeli",
    };
  if (t <= "11:30")
    return {
      key: "penerimaan",
      label: "Penerimaan Barang",
      hint: "Terima titipan dari UMKM & update stok (INVENTORY)",
    };
  if (t <= "17:00")
    return {
      key: "layani",
      label: "Layani Pembeli",
      hint: "Layani POS & kelola etalase — teman UMKM aktif",
    };
  if (t <= "19:00")
    return {
      key: "hitung",
      label: "Hitung Bukaan & Penjualan",
      hint: "Hitung kas, rekapitulasi penjualan, siapkan LPJ",
    };
  if (t <= "22:00")
    return {
      key: "penutupan",
      label: "Penutupan",
      hint: "Tutup kasir, serah terima ke manager, kunci stok",
    };
  return {
    key: "tutup",
    label: "Tutup",
    hint: "Hari operasional berakhir — pantau serah terima ke pimpinan",
  };
}