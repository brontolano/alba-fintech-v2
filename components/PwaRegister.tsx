"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      try {
        void navigator.serviceWorker.register("/sw.js");
      } catch {
        // Gagal register — aplikasi tetap berjalan tanpa service worker.
      }
    };

    // Regis segera + retry saat load (idempoten, browser mendeduplikasi
    // scope+script sama) supaya SW aktif sedini mungkin untuk visitor & scanner.
    register();
    window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}