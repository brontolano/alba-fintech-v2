'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: 'Selamat Datang',
    description:
      'ALBA Finance adalah sistem manajemen keuangan terpadu untuk Pondok Pesantren Al-Basyariyah.',
  },
  {
    title: 'Kecepatan & Akurasi',
    description:
      'Catat transaksi, kelola stok, dan lakukan rekonsiliasi harian dengan cepat melalui antarmuka modern.',
  },
  {
    title: 'Aman & Terpercaya',
    description:
      'Sistem dilengkapi kontrol akses berbasis peran dan audit trail untuk menjaga keamanan data.',
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Mark onboarding as seen
    localStorage.setItem('alba-onboarding-seen', 'true');
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Langkah {currentStep + 1} dari {steps.length}</span>
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-slate-600"
            >
              Lewati
            </button>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            {steps[currentStep].title}
          </h2>
          <p className="text-slate-600 leading-relaxed">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-800 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Kembali</span>
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
          >
            <span className="text-sm">{currentStep === steps.length - 1 ? 'Mulai' : 'Lanjut'}</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
