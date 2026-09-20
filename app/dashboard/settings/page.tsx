"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Upload,
  Download,
  Database,
  Trash2,
  Shield,
  Bell,
  Palette,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface SystemSettings {
  app_name: string;
  app_description: string;
  currency: string;
  timezone: string;
  theme: string;
  primary_color: string;
  compact_mode: string;
  email_notifications: string;
  push_notifications: string;
  in_app_notifications: string;
  reminders: string;
  session_timeout: string;
  enable_2fa: string;
}

// Map color names to hex values (for API storage) and HSL (for CSS variables)
const COLOR_MAP: Record<string, { hex: string; hsl: string }> = {
  finzo: { hex: "#10b981", hsl: "160 84% 39%" },
  islamic: { hex: "#16a34a", hsl: "142 76% 36%" },
  blue: { hex: "#3b82f6", hsl: "222.2 54.9% 48.4%" },
  purple: { hex: "#a855f7", hsl: "265.4 70.2% 51.8%" },
  rose: { hex: "#f43f5e", hsl: "333.4 65.6% 58.4%" },
  amber: { hex: "#f59e0b", hsl: "38 92% 50%" },
};

// Reverse map: hex → color name
const HEX_TO_COLOR = Object.fromEntries(
  Object.entries(COLOR_MAP).map(([name, { hex }]) => [hex, name]),
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("system");
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    inApp: true,
    reminders: false,
  });

  const [appearance, setAppearance] = useState({
    theme: "light",
    primaryColor: "finzo",
    compactMode: false,
  });

  // Apply theme + primary color to DOM
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Theme
    if (appearance.theme === "dark") {
      html.classList.add("dark");
    } else if (appearance.theme === "light") {
      html.classList.remove("dark");
    } else {
      // system preference
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const applySystemTheme = (e?: MediaQueryListEvent) => {
        const matches = e ? e.matches : mediaQuery.matches;
        html.classList.toggle("dark", matches);
      };
      applySystemTheme();
      mediaQuery.addEventListener("change", applySystemTheme);

      // Cleanup event listener on unmount or theme change
      return () => mediaQuery.removeEventListener("change", applySystemTheme);
    }

    // Primary color (apply in all theme modes)
    const colorInfo = COLOR_MAP[appearance.primaryColor] || COLOR_MAP.finzo;
    html.style.setProperty("--primary", colorInfo.hsl);
    html.style.setProperty("--ring", colorInfo.hsl);

    // Compact mode
    if (appearance.compactMode) {
      body.classList.add("compact");
    } else {
      body.classList.remove("compact");
    }

    localStorage.setItem("alba-appearance", JSON.stringify(appearance));
  }, [appearance.theme, appearance.primaryColor, appearance.compactMode]);

  // Preview toast when appearance settings change
  const handleAppearanceChange = (
    field: "theme" | "primaryColor" | "compactMode",
    value: any,
  ) => {
    setAppearance((prev) => {
      const updated = { ...prev, [field]: value };
      // Show immediate preview feedback
      if (field === "theme") {
        toast.success(
          `Tema diubah ke ${value === "dark" ? "Gelap" : value === "light" ? "Terang" : "Sistem"}`,
          { duration: 1500 },
        );
      } else if (field === "primaryColor") {
        toast.success(`Warna utama diubah ke ${value}`, { duration: 1500 });
      } else if (field === "compactMode") {
        toast.success(
          value ? "Mode kompak diaktifkan" : "Mode kompak dinonaktifkan",
          { duration: 1500 },
        );
      }
      return updated;
    });
  };

  // Reset appearance to defaults
  const resetAppearance = () => {
    setAppearance({
      theme: "light",
      primaryColor: "finzo",
      compactMode: false,
    });
    toast.success("Tampilan dikembalikan ke pengaturan default");
  };

  const [system, setSystem] = useState({
    appName: "ALBA Finance v3",
    appDescription: "Aplikasi Keuangan Pondok Pesantren Al-Basyariyah",
    currency: "IDR",
    timezone: "Asia/Jakarta",
  });

  const [security, setSecurity] = useState({
    enable2fa: false,
    sessionTimeout: "1800",
    newPassword: "",
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat pengaturan");
      }
      const result = await res.json();
      const data: SystemSettings = result.data;

      setSettings(data);
      setSystem({
        appName: data.app_name || "ALBA Finance v3",
        appDescription:
          data.app_description ||
          "Aplikasi Keuangan Pondok Pesantren Al-Basyariyah",
        currency: data.currency || "IDR",
        timezone: data.timezone || "Asia/Jakarta",
      });
      setNotifications({
        email: data.email_notifications === "true",
        push: data.push_notifications === "true",
        inApp: data.in_app_notifications === "true",
        reminders: data.reminders === "true",
      });
      setAppearance({
        theme: data.theme || "light",
        primaryColor: HEX_TO_COLOR[data.primary_color] || "finzo",
        compactMode: data.compact_mode === "true",
      });
      setSecurity({
        enable2fa: data.enable_2fa === "true",
        sessionTimeout: data.session_timeout || "1800",
        newPassword: "",
      });
    } catch (err: any) {
      const savedAppearance = localStorage.getItem("alba-appearance");
      if (savedAppearance) {
        try {
          const parsedAppearance = JSON.parse(savedAppearance);
          setAppearance({
            theme: parsedAppearance.theme || "light",
            primaryColor: parsedAppearance.primaryColor || "finzo",
            compactMode: parsedAppearance.compactMode === true,
          });
        } catch {
          localStorage.removeItem("alba-appearance");
        }
      }
      toast.error(err.message || "Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: "app_name", value: system.appName },
        { key: "app_description", value: system.appDescription },
        { key: "currency", value: system.currency },
        { key: "timezone", value: system.timezone },
        { key: "email_notifications", value: notifications.email.toString() },
        { key: "push_notifications", value: notifications.push.toString() },
        { key: "in_app_notifications", value: notifications.inApp.toString() },
        { key: "reminders", value: notifications.reminders.toString() },
        { key: "theme", value: appearance.theme },
        {
          key: "primary_color",
          value: COLOR_MAP[appearance.primaryColor]?.hex || COLOR_MAP.finzo.hex,
        },
        { key: "compact_mode", value: appearance.compactMode.toString() },
        { key: "enable_2fa", value: security.enable2fa.toString() },
        { key: "session_timeout", value: security.sessionTimeout },
      ];

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsToSave }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.code === "P2021" || res.status === 503) {
          // DB table doesn't exist — settings are still applied live on client
          toast.warning(
            "Tema berhasil diterapkan untuk sesi ini. Tabel pengaturan belum ada di database — hubungi administrator untuk migrasi.",
            { duration: 6000 },
          );
          return;
        }
        throw new Error(err.error || "Gagal menyimpan pengaturan");
      }

      toast.success("Pengaturan berhasil disimpan");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("Gagal mengekspor data");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alba-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data berhasil diekspor");
    } catch (err) {
      toast.error("Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleServerBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat backup server");
      toast.success(`Backup ${data.fileName} berhasil disimpan di server`);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat backup server");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Silakan pilih file terlebih dahulu");
      return;
    }
    setIsImporting(true);
    try {
      const payload = JSON.parse(await file.text());
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengimpor data");

      toast.success("Data berhasil diimpor");
      setFile(null);
      await fetchSettings();
    } catch (err) {
      toast.error("Gagal mengimpor data");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Anda yakin ingin mereset semua data? Tindakan ini tidak dapat dibatalkan.",
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mereset data");
      }

      toast.success("Data berhasil direset");
      setResetPassword("");
    } catch (err: any) {
      toast.error(err.message || "Gagal mereset data");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDemoData = async () => {
    if (
      !confirm(
        "Data saat ini akan diganti dengan data demo empat unit. Lanjutkan?",
      )
    )
      return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demo" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat data demo");
      toast.success("Data demo operasional empat unit berhasil dibuat");
      await fetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat data demo");
    } finally {
      setIsResetting(false);
    }
  };

  const tabs = [
    { id: "system", label: "Pengaturan Sistem", icon: Settings },
    { id: "data", label: "Data", icon: Database },
    { id: "notifications", label: "Notifikasi", icon: Bell },
    { id: "appearance", label: "Tampilan", icon: Palette },
    { id: "security", label: "Keamanan", icon: Shield },
  ];

  const handleSaveTab = (tabId: string) => {
    if (
      tabId === "system" ||
      tabId === "notifications" ||
      tabId === "appearance" ||
      tabId === "security"
    ) {
      saveSettings();
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Pengaturan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola pengaturan aplikasi sistem keuangan
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Memuat pengaturan...
        </div>
      ) : !settings ? (
        <div className="py-12 text-center text-red-500">
          Gagal memuat pengaturan. Silakan refresh halaman.
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="flex gap-2 lg:flex-col">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    activeTab === tab.id
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted"
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="rounded-[22px] border border-border bg-card/90 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
              {/* Sistem Tab */}
              {activeTab === "system" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Pengaturan Sistem
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Nama Aplikasi
                      </label>
                      <input
                        type="text"
                        value={system.appName}
                        onChange={(e) =>
                          setSystem({ ...system, appName: e.target.value })
                        }
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Deskripsi Aplikasi
                      </label>
                      <textarea
                        value={system.appDescription}
                        onChange={(e) =>
                          setSystem({
                            ...system,
                            appDescription: e.target.value,
                          })
                        }
                        className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          Mata Uang
                        </label>
                        <select
                          value={system.currency}
                          onChange={(e) =>
                            setSystem({ ...system, currency: e.target.value })
                          }
                          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="IDR">IDR - Rupiah</option>
                          <option value="USD">USD - Dollar US</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          Zona Waktu
                        </label>
                        <select
                          value={system.timezone}
                          onChange={(e) =>
                            setSystem({ ...system, timezone: e.target.value })
                          }
                          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="Asia/Jakarta">
                            Asia/Jakarta (UTC+7)
                          </option>
                          <option value="Asia/Makassar">
                            Asia/Makassar (UTC+8)
                          </option>
                          <option value="Asia/Jayapura">
                            Asia/Jayapura (UTC+9)
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => handleSaveTab("system")}
                      disabled={saving}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      <span>
                        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Data Tab */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Manajemen Data
                  </h2>

                  {/* Export Section */}
                  <div className="rounded-[18px] border border-border bg-background/70 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <Download size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Ekspor Data
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Unduh seluruh data aplikasi sebagai file JSON
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isExporting ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
                      <span>
                        {isExporting ? "Mengekspor..." : "Ekspor Data"}
                      </span>
                    </button>
                  </div>

                  <div className="rounded-[18px] border border-border bg-background/70 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                        <Database size={20} className="text-violet-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Backup ke Server
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Simpan backup di server dan kirim ke Google Drive jika
                          sudah dikonfigurasi
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleServerBackup}
                      disabled={isBackingUp}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                    >
                      {isBackingUp ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Database size={18} />
                      )}
                      <span>
                        {isBackingUp ? "Membuat backup..." : "Backup ke Server"}
                      </span>
                    </button>
                  </div>

                  <div className="rounded-[18px] border border-border bg-background/70 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                        <Settings size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Kategori Keuangan
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Manager unit bisa mengelola kategori milik unitnya,
                          sementara pimpinan mengelola kategori lembaga.
                        </p>
                      </div>
                    </div>
                    <a
                      href="/dashboard/settings/categories"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                    >
                      Buka Pengaturan Kategori
                    </a>
                  </div>

                  {/* Import Section */}
                  <div className="rounded-[18px] border border-border bg-background/70 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                        <Upload size={20} className="text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Impor Data
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Impor data dari file JSON yang telah diekspor
                          sebelumnya
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 file:mr-4 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                    />
                    <button
                      onClick={handleImport}
                      disabled={isImporting || !file}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isImporting ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Upload size={18} />
                      )}
                      <span>{isImporting ? "Mengimpor..." : "Impor Data"}</span>
                    </button>
                  </div>

                  {/* Reset Data Section */}
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Trash2 size={20} className="text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-800">
                          Reset Data
                        </h3>
                        <p className="text-sm text-red-700">
                          Hapus semua data operasional dan pertahankan akun
                          SuperAdmin
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-red-700">
                        Backup data terlebih dahulu karena reset tidak dapat
                        dibatalkan.
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      disabled={isResetting}
                      className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                    >
                      {isResetting ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                      <span>
                        {isResetting ? "Mereset..." : "Reset Semua Data"}
                      </span>
                    </button>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                        <Database size={20} className="text-amber-700" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-amber-900">
                            Demo Data
                          </h3>
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
                            Super Admin
                          </span>
                        </div>
                        <p className="text-sm text-amber-800">
                          Isi ulang contoh operasional KPAK, Kantin Baru, Kantin
                          Umi, dan Koperasi Buku untuk transaksi, approval,
                          rekonsiliasi, tabungan santri (anjungan/kiosk), dan
                          papan pantau. Cocok untuk demo user testing.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDemoData}
                      disabled={isResetting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={18}
                        className={isResetting ? "animate-spin" : ""}
                      />
                      <span>
                        {isResetting ? "Menyiapkan..." : "Buat Demo Data"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Pengaturan Notifikasi
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-background/70 p-3">
                      <div>
                        <p className="font-medium text-foreground">Email</p>
                        <p className="text-sm text-muted-foreground">
                          Terima notifikasi melalui email
                        </p>
                      </div>
                      <label
                        role="switch"
                        aria-checked={notifications.email}
                        aria-label="Toggle email notifications"
                        className="relative inline-flex h-6 w-12 items-center rounded-full"
                      >
                        <input
                          type="checkbox"
                          checked={notifications.email}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              email: e.target.checked,
                            })
                          }
                          role="switch"
                          aria-checked={notifications.email}
                          className="sr-only"
                        />
                        <span
                          className={`absolute inset-0 rounded-full transition-colors ${
                            notifications.email
                              ? "bg-islamic-600"
                              : "bg-slate-200"
                          }`}
                        />
                        <span
                          className={`absolute inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            notifications.email
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </label>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-background/70 p-3">
                      <div>
                        <p className="font-medium text-foreground">
                          Push Notification
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Terima notifikasi push di perangkat
                        </p>
                      </div>
                      <label
                        role="switch"
                        aria-checked={notifications.push}
                        aria-label="Toggle push notifications"
                        className="relative inline-flex h-6 w-12 items-center rounded-full"
                      >
                        <input
                          type="checkbox"
                          checked={notifications.push}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              push: e.target.checked,
                            })
                          }
                          role="switch"
                          aria-checked={notifications.push}
                          className="sr-only"
                        />
                        <span
                          className={`absolute inset-0 rounded-full transition-colors ${
                            notifications.push
                              ? "bg-islamic-600"
                              : "bg-slate-200"
                          }`}
                        />
                        <span
                          className={`absolute inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            notifications.push
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </label>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-background/70 p-3">
                      <div>
                        <p className="font-medium text-foreground">
                          Notifikasi In-App
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tampilkan notifikasi di dalam aplikasi
                        </p>
                      </div>
                      <label
                        role="switch"
                        aria-checked={notifications.inApp}
                        aria-label="Toggle in-app notifications"
                        className="relative inline-flex h-6 w-12 items-center rounded-full"
                      >
                        <input
                          type="checkbox"
                          checked={notifications.inApp}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              inApp: e.target.checked,
                            })
                          }
                          role="switch"
                          aria-checked={notifications.inApp}
                          className="sr-only"
                        />
                        <span
                          className={`absolute inset-0 rounded-full transition-colors ${
                            notifications.inApp
                              ? "bg-islamic-600"
                              : "bg-slate-200"
                          }`}
                        />
                        <span
                          className={`absolute inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            notifications.inApp
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </label>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-background/70 p-3">
                      <div>
                        <p className="font-medium text-foreground">Pengingat</p>
                        <p className="text-sm text-muted-foreground">
                          Kirim pengingat untuk transaksi yang belum disetujui
                        </p>
                      </div>
                      <label
                        role="switch"
                        aria-checked={notifications.reminders}
                        aria-label="Toggle reminder notifications"
                        className="relative inline-flex h-6 w-12 items-center rounded-full"
                      >
                        <input
                          type="checkbox"
                          checked={notifications.reminders}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              reminders: e.target.checked,
                            })
                          }
                          role="switch"
                          aria-checked={notifications.reminders}
                          className="sr-only"
                        />
                        <span
                          className={`absolute inset-0 rounded-full transition-colors ${
                            notifications.reminders
                              ? "bg-islamic-600"
                              : "bg-slate-200"
                          }`}
                        />
                        <span
                          className={`absolute inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            notifications.reminders
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => handleSaveTab("notifications")}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      <span>
                        {saving ? "Menyimpan..." : "Simpan Notifikasi"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Pengaturan Tampilan
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Tema
                      </label>
                      <select
                        value={appearance.theme}
                        onChange={(e) =>
                          handleAppearanceChange(
                            "theme",
                            e.target.value as "light" | "dark" | "system",
                          )
                        }
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="light">Terang</option>
                        <option value="dark">Gelap</option>
                        <option value="system">Sistem</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Warna Utama
                      </label>
                      <select
                        value={appearance.primaryColor}
                        onChange={(e) =>
                          handleAppearanceChange("primaryColor", e.target.value)
                        }
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="finzo">Finzo Green</option>
                        <option value="islamic">Islamic Green</option>
                        <option value="blue">Biru</option>
                        <option value="purple">Ungu</option>
                        <option value="rose">Rose</option>
                        <option value="amber">Amber/Gold</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
                      <input
                        type="checkbox"
                        id="compactMode"
                        checked={appearance.compactMode}
                        onChange={(e) =>
                          handleAppearanceChange(
                            "compactMode",
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 text-[hsl(var(--primary))] border-[hsl(var(--primary))] rounded focus:ring-[hsl(var(--primary))]"
                      />
                      <label
                        htmlFor="compactMode"
                        className="text-sm text-foreground"
                      >
                        Mode kompak
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <button
                      onClick={() => handleSaveTab("appearance")}
                      disabled={saving}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      <span>{saving ? "Menyimpan..." : "Simpan Tampilan"}</span>
                    </button>
                    <button
                      onClick={resetAppearance}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm text-muted-foreground transition hover:bg-muted"
                    >
                      <RefreshCw size={18} />
                      <span>Reset ke Default</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Keamanan
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Password Login Super Admin
                      </label>
                      <input
                        type="password"
                        value={security.newPassword}
                        onChange={(e) => {
                          setSecurity({
                            ...security,
                            newPassword: e.target.value,
                          });
                        }}
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Masukkan password baru"
                      />
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
                      <input
                        type="checkbox"
                        id="requireOTP"
                        checked={security.enable2fa}
                        onChange={(e) =>
                          setSecurity({
                            ...security,
                            enable2fa: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-[hsl(var(--primary))] border-[hsl(var(--primary))] rounded focus:ring-[hsl(var(--primary))]"
                      />
                      <label
                        htmlFor="requireOTP"
                        className="text-sm text-foreground"
                      >
                        Wajibkan otentikasi dua faktor (2FA) untuk semua
                        pengguna
                      </label>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Timeout Sesi (detik)
                      </label>
                      <input
                        type="number"
                        value={security.sessionTimeout}
                        onChange={(e) =>
                          setSecurity({
                            ...security,
                            sessionTimeout: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        min="300"
                        max="86400"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => handleSaveTab("security")}
                      disabled={saving}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      <span>{saving ? "Menyimpan..." : "Simpan Keamanan"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
