"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type QuickAccessAction = {
  href: string;
  icon: LucideIcon;
  label: string;
  color?:
    | "islamic"
    | "amber"
    | "blue"
    | "purple"
    | "accent"
    | "green"
    | "orange"
    | "slate"
    | "red";
};

/**
 * Icon grid ala "Other Menu" Finzo — bukan card grid.
 * Lingkaran warna pastel + label kecil di bawah, tanpa bingkai kartu.
 * Grid 4 kolom di mobile, 6-8 kolom di layar besar.
 */
export function QuickAccessGrid({ actions }: { actions: QuickAccessAction[] }) {
  const colorMap = {
    islamic: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    blue: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    accent: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-5 lg:grid-cols-6">
      {actions.map((action) => {
        const Icon = action.icon;
        const tone = colorMap[action.color ?? "islamic"];

        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex flex-col items-center gap-2 text-center focus-visible-ring rounded-2xl"
          >
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white/50 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.03] group-active:scale-95 ${tone}`}
            >
              <Icon className="h-7 w-7" />
            </div>
            <span className="line-clamp-2 px-0.5 text-[11px] font-semibold leading-tight text-foreground">
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
