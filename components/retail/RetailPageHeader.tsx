"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface RetailPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function RetailPageHeader({ title, subtitle, backHref, actions, breadcrumbs }: RetailPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link href={backHref} className="p-2 rounded-xl hover:bg-muted transition-colors" aria-label="Kembali">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-1" aria-label="Breadcrumb">
              {breadcrumbs.map((b, i) => (
                <span key={b.href || i} className="flex items-center gap-1">
                  {b.href ? <Link href={b.href} className="hover:text-foreground">{b.label}</Link> : <span className="font-medium text-foreground">{b.label}</span>}
                  {i < breadcrumbs.length - 1 && <span className="text-muted-foreground">/</span>}
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}