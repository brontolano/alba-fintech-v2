"use client";

import type { LucideIcon } from "lucide-react";

export type StatTone =
  | "islamic"
  | "green"
  | "red"
  | "blue"
  | "amber"
  | "income"
  | "expense"
  | "warning"
  | "info";

export type StatTileItem = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: StatTone;
};

const TONE_MAP: Record<StatTone, { bg: string; text: string; value: string }> =
  {
    islamic: {
      bg: "bg-[#dfeef0]",
      text: "text-[#1d3d3a]",
      value: "text-[#1f2937]",
    },
    green: {
      bg: "bg-[#dffaf2]",
      text: "text-[#1bb0a6]",
      value: "text-[#1f2937]",
    },
    red: {
      bg: "bg-[#ffe7e5]",
      text: "text-[#e35d52]",
      value: "text-[#1f2937]",
    },
    blue: {
      bg: "bg-[#dfeefb]",
      text: "text-[#2c7be5]",
      value: "text-[#1f2937]",
    },
    amber: {
      bg: "bg-[#fff2d8]",
      text: "text-[#d97706]",
      value: "text-[#1f2937]",
    },
    income: {
      bg: "bg-[#dffaf2]",
      text: "text-[#1bb0a6]",
      value: "text-[#1f2937]",
    },
    expense: {
      bg: "bg-[#ffe7e5]",
      text: "text-[#e35d52]",
      value: "text-[#1f2937]",
    },
    warning: {
      bg: "bg-[#fff2d8]",
      text: "text-[#d97706]",
      value: "text-[#1f2937]",
    },
    info: {
      bg: "bg-[#dfeefb]",
      text: "text-[#2c7be5]",
      value: "text-[#1f2937]",
    },
  };

/** Grid tile statistik compact — 2 kolom di mobile, 4 di desktop. */
export function StatTiles({ stats }: { stats: StatTileItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        const t = TONE_MAP[s.tone];
        return (
          <div
            key={s.label}
            className="rounded-[22px] border border-[#e5e7eb] bg-[#f1f2f3] px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#5b6473] leading-relaxed">
                  {s.label}
                </p>
                <p
                  className={`mt-2 text-[1rem] font-bold tracking-[-0.04em] sm:text-[1.25rem] ${t.value}`}
                >
                  {s.value}
                </p>
              </div>

              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${t.bg}`}
              >
                <Icon className={`h-4 w-4 ${t.text}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
