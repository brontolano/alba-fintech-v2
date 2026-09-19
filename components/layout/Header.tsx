"use client";

import { Menu, User, Sun, Moon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { DbStatusIndicator } from "@/components/layout/DbStatusIndicator";
import { SystemStatus } from "@/components/layout/SystemStatus";
import { ThemeProvider, useTheme } from "@/components/theme/ThemeProvider";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  onMenuClick?: () => void;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="h-10 w-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground hover:bg-accent/10 transition"
      title={theme === "dark" ? "Mode terang" : "Mode gelap"}
      aria-label={
        theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"
      }
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function Header({ user, onMenuClick }: HeaderProps) {
  return (
    <ThemeProvider>
      <HeaderInner user={user} onMenuClick={onMenuClick} />
    </ThemeProvider>
  );
}

function HeaderInner({ user, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-card/80 px-3 py-3 backdrop-blur-xl shadow-[0_1px_0_rgba(15,23,42,0.02)] sm:px-4 dark:bg-[#111827]/80">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="rounded-xl bg-muted p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary md:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
            <Image
              src="/logo-baru.png"
              alt="Logo Al-Basyariyah"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-semibold leading-tight text-foreground">
              AL-Basyariyah Finance
            </h1>
            <p className="text-xs leading-none text-muted-foreground">
              Pondok Pesantren Al-Basyariyah
            </p>
          </div>
        </div>

        <div className="hidden lg:block">
          <SystemStatus />
        </div>

        <div className="flex items-center gap-2">
          <DbStatusIndicator />
          <NotificationBell />
          <ThemeToggle />
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 transition-opacity hover:opacity-80 active:scale-95"
          >
            {user?.image ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary to-emerald-400 shadow-sm">
                <Image
                  src={user.image}
                  alt={user.name || "User"}
                  fill
                  className="object-cover rounded-full"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary to-emerald-400 shadow-sm">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
