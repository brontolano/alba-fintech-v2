"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";

/* ============================================================
   Finzo UI primitives — design language dari Finzo Finance kit
   Light: bg #F7F8FA / card putih / primary hijau #0DA55E
   Dark : bg #16191E / card #20242D / primary #12B76A
   Semua warna lewat token Tailwind (dark: varian aktif otomatis)
   ============================================================ */

/** Class dasar input & select Finzo (dark-mode aware) */
export const finzoInputClass =
  "w-full px-3.5 py-2.5 rounded-xl border border-input bg-card text-foreground " +
  "placeholder:text-muted-foreground/70 text-sm outline-none transition " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

export const finzoSelectClass = finzoInputClass;

/* ---------------- Segmented Tabs ---------------- */

interface SegmentedTabsProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Pill tab ganda/triple ala Finzo ("Debit Card | Credit Card"). */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`w-full overflow-x-auto rounded-full bg-muted p-1 ${className}`}
    >
      <div className="inline-flex min-w-max items-center gap-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Buttons ---------------- */

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm",
  outline:
    "border border-border bg-card text-foreground hover:bg-muted active:scale-[0.98]",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.98]",
  danger:
    "bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98] shadow-sm",
};

interface FinzoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Tombol pill Finzo — radius penuh, min tinggi 44px (touch target). */
export function FinzoButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: FinzoButtonProps) {
  return (
    <button
      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Status Pill ---------------- */

const statusStyles: Record<string, string> = {
  APPROVED: "bg-income/10 text-income",
  PENDING: "bg-warning/10 text-warning",
  REJECTED: "bg-destructive/10 text-destructive",
  DRAFT: "bg-muted text-muted-foreground",
  COMPLETED: "bg-income/10 text-income",
  CANCELLED: "bg-destructive/10 text-destructive",
};

/** Pill status: latar tint tipis + teks warna (Finzo style). */
export function StatusPill({ status }: { status: string }) {
  const style = statusStyles[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${style}`}
    >
      {status}
    </span>
  );
}

/* ---------------- Stat Card ---------------- */

interface StatCardProps {
  label: string;
  value: string;
  tone?: "income" | "expense" | "neutral" | "positive" | "negative";
  icon?: React.ReactNode;
}

/** Kartu ringkasan Finzo: icon circle pastel + label kecil + nilai tebal. */
export function StatCard({
  label,
  value,
  tone = "neutral",
  icon,
}: StatCardProps) {
  const toneText = {
    income: "text-income",
    positive: "text-income",
    expense: "text-expense",
    negative: "text-expense",
    neutral: "text-foreground",
  }[tone];

  const toneBg = {
    income: "bg-income/10 text-income",
    positive: "bg-income/10 text-income",
    expense: "bg-expense/10 text-expense",
    negative: "bg-expense/10 text-expense",
    neutral: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-elevation-1 transition-colors">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toneBg}`}
          >
            {icon}
          </div>
        )}
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className={`mt-2 text-base font-bold tracking-tight leading-snug break-all sm:text-xl ${toneText}`}
      >
        {value}
      </p>
    </div>
  );
}

/* ---------------- Card ---------------- */

/** Permukaan kartu standar Finzo. */
export function FinzoCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl shadow-elevation-1 ${className}`}
    >
      {children}
    </div>
  );
}

/* ============================================================
   FinzoList — daftar baris ala Finzo (Transaction History):
   [icon/gambar] Judul\nSubjudul        nominal (+/-) [pill] ›
   ============================================================ */

export type FinzoListRowTone =
  "income" | "expense" | "transfer" | "neutral" | "warning" | "danger";

const toneCircle: Record<FinzoListRowTone, string> = {
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  transfer: "bg-info/10 text-info",
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

const toneAmount: Record<FinzoListRowTone, string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-info",
  neutral: "text-foreground",
  warning: "text-warning",
  danger: "text-destructive",
};

export interface FinzoListRowProps {
  /** Emoji/icon ReactNode untuk lingkaran kiri — dipakai jika tidak ada image */
  icon?: React.ReactNode;
  /** URL gambar (mis. foto produk inventory) — menimpa icon */
  image?: string | null;
  /** Warna lingkaran + nominal untuk mode icon */
  tone?: FinzoListRowTone;
  /** Baris pertama: judul */
  title: string;
  /** Baris kedua: subjudul kecil di bawah judul */
  subtitle?: string;
  /** Kanan: nominal berwarna (mis. "+ Rp 50.000") — opsional */
  amount?: string;
  /** Kanan: elemen status (pill) di bawah nominal */
  trailing?: React.ReactNode;
  /** Klik baris — jika ada, baris jadi button (chevron muncul) */
  onClick?: () => void;
  /** Link tujuan — jika ada, baris jadi Link (chevron muncul) */
  href?: string;
  /** Aksi tambahan kanan-most sebelum chevron (mis. dropdown ⋯) */
  actions?: React.ReactNode;
  /** Baris keterangan kecil di bawah (untuk detail expandable) */
  footer?: React.ReactNode;
}

/** Avatar baris: gambar produk dengan fallback icon bila kosong/gagal dimuat. */
function RowAvatar({
  image,
  icon,
  toneClass,
}: {
  image?: string | null;
  icon?: React.ReactNode;
  toneClass: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fallback = (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${toneClass}`}
    >
      {icon ?? <Package size={14} />}
    </div>
  );

  if (image && !failed) {
    return (
      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-white">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {icon ?? <Package size={14} />}
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt=""
          className={`relative w-full h-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return fallback;
}

/** Satu baris list Finzo. */
export function FinzoListRow({
  icon,
  image,
  tone = "neutral",
  title,
  subtitle,
  amount,
  trailing,
  onClick,
  href,
  actions,
  footer,
}: FinzoListRowProps) {
  // Chevron › hanya untuk navigasi (href). Untuk row expandable (onClick),
  // caller menyediakan affordance sendiri via `actions` (mis. ChevronDown).
  const chevron = href && (
    <ChevronRight size={16} className="text-muted-foreground shrink-0" />
  );

  const content = (
    <>
      {/* Kiri: avatar — gambar produk (fallback icon bila gagal) atau icon circle */}
      <RowAvatar image={image} icon={icon} toneClass={toneCircle[tone]} />

      {/* Tengah: judul + subjudul */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium leading-5 text-foreground truncate">
          {title}
        </p>
        {subtitle && (
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Kanan: nominal + trailing + chevron + actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-right">
          {amount && (
            <p
              className={`text-[14px] font-semibold leading-5 ${toneAmount[tone]}`}
            >
              {amount}
            </p>
          )}
          {trailing && <div className="mt-1 flex justify-end">{trailing}</div>}
        </div>
        {actions}
        {chevron}
      </div>
    </>
  );

  const baseClass =
    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40";

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        className={`${baseClass} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
      >
        {content}
      </div>
    );
  }
  return <div className={baseClass}>{content}</div>;
}

/** Wadah list: baris-baris dipisah divider halus, dibungkus kartu Finzo. */
export function FinzoList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FinzoCard
      className={`overflow-hidden divide-y divide-border ${className}`}
    >
      {children}
    </FinzoCard>
  );
}
