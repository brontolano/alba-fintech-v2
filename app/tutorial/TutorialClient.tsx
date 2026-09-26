"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TUTORIAL_GROUPS } from "./data";

export default function TutorialClient() {
  const first = TUTORIAL_GROUPS[0].items[0];
  const [activeId, setActiveId] = useState(first.id);
  const active =
    TUTORIAL_GROUPS.flatMap((g) => g.items).find((t) => t.id === activeId) ??
    first;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
              ALBA Finance v7
            </p>
            <h1 className="text-lg font-bold leading-tight">
              Tutorial Pengguna
            </h1>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            Masuk Aplikasi
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        {/* Pemilih pengguna */}
        <div className="mt-4 space-y-3">
          {TUTORIAL_GROUPS.map((g) => (
            <div key={g.group}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                {g.group}
              </p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                      t.id === activeId
                        ? "border-emerald-600 bg-emerald-600 text-white shadow"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {t.user}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Identitas tutorial aktif */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{active.user}</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {active.role}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {active.unit}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{active.summary}</p>
          <p className="mt-2 text-sm">
            <span className="font-semibold">Email:</span>{" "}
            <span className="font-mono text-[13px]">{active.email}</span>
            <span className="text-slate-500">
              {" "}
              · Password: minta ke admin
            </span>
          </p>
        </div>

        {/* Langkah-langkah */}
        <div className="mt-4 space-y-4">
          {active.sections.map((s, i) => (
            <section
              key={s.title}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-base font-bold">{s.title}</h3>
              </div>
              <ol className="space-y-2 px-4 py-3 text-[15px] leading-relaxed">
                {s.steps.map((step, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-0.5 font-bold text-emerald-700">
                      {j + 1}.
                    </span>
                    <span>{step}</span>
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
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          © 2026 Pondok Pesantren Al-Basyariyah · Panduan ini untuk pemakaian
          internal. Password akun tidak ditampilkan di halaman publik.
        </p>
      </main>
    </div>
  );
}
