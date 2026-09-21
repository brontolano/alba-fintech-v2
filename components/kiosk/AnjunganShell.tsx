import Link from "next/link";
import { ArrowRight, ChevronLeft, type LucideIcon } from "lucide-react";

const actionVariants = {
  emerald: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  sky: "bg-sky-100 text-sky-700 hover:bg-sky-200",
  amber: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  violet: "bg-violet-100 text-violet-700 hover:bg-violet-200",
  rose: "bg-rose-100 text-rose-700 hover:bg-rose-200",
  slate: "bg-slate-100 text-slate-700 hover:bg-slate-200",
} as const;

export interface AnjunganAction {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  variant: keyof typeof actionVariants;
}

export function AnjunganShell({
  logo: Logo,
  title,
  description,
  actions,
  footer,
  children,
}: {
  logo: LucideIcon;
  title: string;
  description: string;
  actions: AnjunganAction[];
  footer?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-primary/10 to-background px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
            <Logo size={40} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </header>

        <nav className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${actionVariants[action.variant]}`}
              >
                <action.icon size={26} />
              </span>
              <span className="flex-1">
                <span className="block text-base font-semibold">{action.label}</span>
                <span className="block text-sm text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <ArrowRight
                size={18}
                className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </nav>

        {children}

        <div className="flex justify-center">
          <Link
            href="/kiosk"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            Kembali ke Beranda Anjungan
          </Link>
        </div>

        {footer && (
          <p className="text-center text-xs text-muted-foreground">{footer}</p>
        )}
      </div>
    </main>
  );
}