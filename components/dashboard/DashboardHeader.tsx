"use client";

import { Calendar } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  systemStatus?: { server: string; sync: string };
}

export function DashboardHeader({
  title,
  subtitle,
  systemStatus,
}: DashboardHeaderProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-5 rounded-[22px] border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary/80">
            Overview
          </p>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="hidden sm:block">{dateStr}</span>
          </div>

          {systemStatus && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Server: {systemStatus.server}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Sync: {systemStatus.sync}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
