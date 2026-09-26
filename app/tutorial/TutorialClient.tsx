"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TUTORIAL_GROUPS } from "./data";

const ALL = TUTORIAL_GROUPS.flatMap((g) =>
  g.items.map((t) => ({ ...t, group: g.group })),
);

export default function TutorialClient() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const active = ALL.find((t) => t.id === activeId) ?? null;

  const pick = (id: string) => {
    setActiveId(id);
    setStep(0);
    setDone(false);
  };

  const backToPick = () => {
    setActiveId(null);
    setStep(0);
    setDone(false);
  };

  // Layar 1: pilih pengguna
  if (!active) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white px-4 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            ALBA Finance v7
          </p>
          <h1 className="mt-1 text-2xl font-bold">Tutorial Pengguna</h1>
          <p className="mt-1 text-base text-slate-600">
            Siapa yang memakai HP ini?
          </p>
        </header>
        <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
          {TUTORIAL_GROUPS.map((g) => (
            <div key={g.group}>
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                {g.group}
              </p>
              <div className="grid grid-cols-1 gap-3">
                {g.items.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pick(t.id)}
                    className="min-h-16 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99] active:bg-emerald-50"
                  >
                    <span className="block text-lg font-bold">{t.user}</span>
                    <span className="mt-0.5 block text-[15px] text-slate-600">
                      {t.summary}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Link
            href="/login"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow"
          >
            Masuk Aplikasi
          </Link>
        </main>
      </div>
    );
  }

  const total = active.sections.length;

  // Layar akhir: selesai
  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-4xl font-bold text-white">
            ✓
          </span>
          <h2 className="mt-5 text-2xl font-bold">Selesai!</h2>
          <p className="mt-2 text-lg text-slate-600">
            Anda sudah membaca {total} langkah untuk{" "}
            <span className="font-bold text-slate-900">{active.user}</span>.
          </p>
          <p className="mt-1 text-base text-slate-500">
            Email: <span className="font-mono text-sm">{active.email}</span> ·
            Password: minta ke admin
          </p>
          <div className="mt-8 grid w-full grid-cols-1 gap-3">
            <Link
              href="/login"
              className="flex min-h-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow"
            >
              Masuk Aplikasi
            </Link>
            <button
              onClick={backToPick}
              className="min-h-14 rounded-2xl border border-slate-300 bg-white text-lg font-bold text-slate-700"
            >
              Ganti Pengguna
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Layar panduan: satu langkah satu layar
  const s = active.sections[step];
  const isLast = step === total - 1;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Progress */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pb-3 pt-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={backToPick}
              className="min-h-11 rounded-full px-3 text-base font-bold text-emerald-700"
              aria-label="Ganti pengguna"
            >
              ← Pengguna
            </button>
            <p className="text-base font-bold">
              Langkah {step + 1} dari {total}
            </p>
            <button
              onClick={() => setDone(true)}
              className="min-h-11 rounded-full px-3 text-base font-bold text-slate-500"
            >
              Lewati
            </button>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold text-slate-500">
            {active.user}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-xl font-bold">{s.title}</h2>
          </div>
          <ol className="space-y-3 px-4 py-4 text-lg leading-relaxed">
            {s.steps.map((text, j) => (
              <li key={j} className="flex gap-3">
                <span className="font-bold text-emerald-700">{j + 1}.</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          {s.img && (
            <div className="border-t border-slate-100 bg-slate-50 p-3">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <Image
                  src={s.img}
                  alt={s.title}
                  width={780}
                  height={1688}
                  className="h-auto w-full"
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Navigasi bawah */}
      <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
          <button
            onClick={() => setStep((v) => Math.max(0, v - 1))}
            disabled={step === 0}
            className="min-h-14 rounded-2xl border border-slate-300 bg-white text-lg font-bold text-slate-700 disabled:opacity-40"
          >
            ← Kembali
          </button>
          {isLast ? (
            <button
              onClick={() => setDone(true)}
              className="min-h-14 rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow"
            >
              Selesai ✓
            </button>
          ) : (
            <button
              onClick={() => setStep((v) => Math.min(total - 1, v + 1))}
              className="min-h-14 rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow"
            >
              Lanjut →
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
