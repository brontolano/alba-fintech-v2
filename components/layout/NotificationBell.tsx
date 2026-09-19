"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, FileText } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean | null;
  createdAt: string;
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=8");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.data ?? []);
      setUnread(data.summary?.unreadCount ?? 0);
    } catch {
      // silent — bell tidak boleh mengganggu halaman
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    fetchNotifications();
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-xl bg-muted hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Notifikasi${unread > 0 ? ` (${unread} belum dibaca)` : ""}`}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-popover rounded-xl shadow-xl border border-border overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notifikasi</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:opacity-80 font-medium"
              >
                <CheckCheck size={14} /> Tandai dibaca
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Memuat...</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">
                Tidak ada notifikasi
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href="/dashboard/approvals"
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 hover:bg-muted/50 ${
                    !n.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileText
                      size={16}
                      className={`mt-0.5 shrink-0 ${
                        n.type === "SUCCESS"
                          ? "text-primary"
                          : n.type === "ERROR"
                            ? "text-destructive"
                            : "text-accent"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {new Date(n.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
