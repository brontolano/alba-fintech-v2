/**
 * Fase operasional harian KPAK (WIB) — linimasa kerja manager:
 *  Pagi (< 08:00) → Operasional (08:00–16:00) → Penutupan (16:00–17:00) → Selesai (> 17:00).
 * Dipakai Pusat Kerja + Dashboard Manager agar urutan kerja mengikuti jam.
 */

export type KpakPhaseKey = "pagi" | "operasi" | "tutup" | "selesai";

export interface KpakPhase {
  key: KpakPhaseKey;
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

export function getKpakPhase(at?: string): KpakPhase {
  const t = at || nowWib();
  if (t < "08:00")
    return {
      key: "pagi",
      label: "Persiapan Pagi",
      hint: "Check-in, pastikan kru siap sebelum jam 08:00",
    };
  if (t <= "16:00")
    return {
      key: "operasi",
      label: "Operasional",
      hint: "Layani santri dan putuskan antrean yang masuk",
    };
  if (t <= "17:00")
    return {
      key: "tutup",
      label: "Penutupan",
      hint: "Tutup hari dan serah terima kas sebelum jam 17:00",
    };
  return {
    key: "selesai",
    label: "Selesai",
    hint: "Hari operasional berakhir — pantau status serah terima",
  };
}
