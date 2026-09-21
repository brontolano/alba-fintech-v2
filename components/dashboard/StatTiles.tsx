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

const TONE_MAP: Record<StatTone, { bg: string; icon: string }> = {
  islamic: { bg: "bg-primary/10", icon: "text-primary" },
  green: { bg: "bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400" },
  red: { bg: "bg-rose-500/10", icon: "text-rose-600 dark:text-rose-400" },
  blue: { bg: "bg-sky-500/10", icon: "text-sky-600 dark:text-sky-400" },
  amber: { bg: "bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400" },
  income: { bg: "bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400" },
  expense: { bg: "bg-rose-500/10", icon: "text-rose-600 dark:text-rose-400" },
  warning: { bg: "bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400" },
  info: { bg: "bg-sky-500/10", icon: "text-sky-600 dark:text-sky-400" },
};

/** Grid tile statistik compact — 2 kolom di mobile, 4 di desktop. */
export function StatTiles({ stats }: { stats: StatTileItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        const t = TONE_MAP[s.tone];
        return (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-normal">
                  {s.label}
                </p>
                <p className="mt-1.5 text-base font-bold tracking-tight text-foreground sm:text-lg">
                  {s.value}
                </p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.bg}`}>
                <Icon className={`h-4 w-4 ${t.icon}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
