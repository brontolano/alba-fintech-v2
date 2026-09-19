"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  height?: number;
  loading?: boolean;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  action,
  height,
  loading = false,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-card/90",
        "shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_16px_34px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      <div className="flex items-start justify-between border-b border-border/60 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action && <div className="ml-3 flex-shrink-0">{action}</div>}
      </div>

      <div className={cn("flex-1 p-4 sm:p-5", height && `h-[${height}px]`)}>
        {loading ? (
          <div className="animate-pulse">
            <div className="mb-4 h-5 w-3/4 rounded-lg bg-border/30" />
            <div className="mb-3 h-3 w-1/2 rounded-md bg-border/30" />
            <div className="space-y-2">
              <div className="h-3 rounded-md bg-border/30" />
              <div className="h-3 w-5/6 rounded-md bg-border/30" />
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
