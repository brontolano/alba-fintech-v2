"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export interface ShiftGate {
  /** true bila user adalah STAFF unit KPAK (satu-satunya yang dibatasi) */
  gated: boolean;
  loading: boolean;
  /** ada shift aktif (sudah check-in, belum checkout) */
  active: boolean;
  /** layanan shift aktif: TABUNGAN | KEUANGAN | null */
  service: string | null;
}

/**
 * Gerbang layanan staff KPAK:
 * - Tanpa check-in aktif: layanan disembunyikan/dikunci.
 * - Check-in Tabungan: hanya menu Tabungan. Keuangan: hanya Keuangan.
 * - Selain staff KPAK: selalu terbuka (active: true).
 */
export function useShiftGate(): ShiftGate {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const gated =
    role === "STAFF" && (session?.user as any)?.unitType === "KPAK";

  const [state, setState] = useState({ loading: true, active: false, service: null as string | null });

  useEffect(() => {
    if (status === "loading") return;
    if (!gated) {
      setState({ loading: false, active: true, service: null });
      return;
    }
    let on = true;
    setState((s) => ({ ...s, loading: true }));
    fetch("/api/kpak/shift")
      .then((r) => r.json())
      .then((j) => {
        if (!on) return;
        const mine = j?.data?.mine;
        setState({
          loading: false,
          active: !!mine && !mine.checkOutAt,
          service: mine?.service || null,
        });
      })
      .catch(() => {
        if (on) setState({ loading: false, active: false, service: null });
      });
    return () => {
      on = false;
    };
  }, [gated, status, pathname]);

  return { gated, ...state };
}
