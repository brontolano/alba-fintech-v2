'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Show splash for 2.5s, then fade out
    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for fade-out to complete before calling onFinish
      setTimeout(onFinish, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-6">
          <Image
            src="/logo-baru.png"
            alt="Logo Al-Basyariyah"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-emerald-700 tracking-tight">
            ALBA FINANCE
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Sistem Manajemen Keuangan Pesantren
          </p>
        </div>
      </div>
    </div>
  );
}
