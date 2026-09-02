'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Upload,
  Download,
  RefreshCw,
  Database,
  Trash2,
  Shield,
  Bell,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('system');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    inApp: true,
    reminders: false,
  });
  const [appearance, setAppearance] = useState({
    theme: 'light',
    primaryColor: 'emerald',
    compactMode: false,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // In a real app, this would call an API endpoint
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success('Data berhasil diekspor');
    } catch (err) {
      toast.error('Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Silakan pilih file terlebih dahulu');
      return;
    }
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success('Data berhasil diimpor');
      setFile(null);
    } catch (err) {
      toast.error('Gagal mengimpor data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    if (!resetPassword) {
      toast.error('Masukkan password Anda');
      return;
    }
    if (!confirm('Anda yakin ingin mereset semua data? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }
    setIsResetting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success('Data berhasil direset');
      setResetPassword('');
    } catch (err) {
      toast.error('Gagal mereset data');
    } finally {
      setIsResetting(false);
    }
  };

  const tabs = [
    { id: 'system', label: 'Pengaturan Sistem', icon: Settings },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'appearance', label: 'Tampilan', icon: Palette },
    { id: 'security', label: 'Keamanan', icon: Shield },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan</h1>
        <p className="text-slate-600 mt-1">
          Kelola pengaturan aplikasi sistem keuangan
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="flex lg:flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50'
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {/* Sistem Tab */}
            {activeTab === 'system' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Pengaturan Sistem
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nama Aplikasi
                    </label>
                    <input
                      type="text"
                      defaultValue="ALBA Finance v3"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Deskripsi Aplikasi
                    </label>
                    <textarea
                      defaultValue="Aplikasi Keuangan Pondok Pesantren Al-Basyariyah"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mata Uang
                      </label>
                      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        <option>IDR - Rupiah</option>
                        <option>USD - Dollar US</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Zona Waktu
                      </label>
                      <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        <option>Asia/Jakarta (UTC+7)</option>
                        <option>Asia/Makassar (UTC+8)</option>
                        <option>Asia/Jayapura (UTC+9)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                    <Save size={18} />
                    <span>Simpan Pengaturan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800">
                  Manajemen Data
                </h2>

                {/* Export Section */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Download size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Ekspor Data</h3>
                      <p className="text-sm text-slate-600">
                        Unduh seluruh data aplikasi sebagai file JSON
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isExporting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Download size={18} />
                    )}
                    <span>{isExporting ? 'Mengekspor...' : 'Ekspor Data'}</span>
                  </button>
                </div>

                {/* Import Section */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Upload size={20} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Impor Data</h3>
                      <p className="text-sm text-slate-600">
                        Impor data dari file JSON yang telah diekspor sebelumnya
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !file}
                    className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {isImporting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                    <span>{isImporting ? 'Mengimpor...' : 'Impor Data'}</span>
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
                        Hapus semua data kecuali pengguna SuperAdmin
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-red-800 mb-1">
                      Masukkan Password Anda
                    </label>
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-sm"
                      placeholder="Password"
                    />
                  </div>
                  <button
                    onClick={handleReset}
                    disabled={isResetting || !resetPassword}
                    className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {isResetting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                    <span>
                      {isResetting ? 'Mereset...' : 'Reset Semua Data'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Pengaturan Notifikasi
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Email</p>
                      <p className="text-sm text-slate-600">
                        Terima notifikasi melalui email
                      </p>
                    </div>
                    <label className="relative inline-flex h-6 w-12 items-center rounded-full">
                      <input
                        type="checkbox"
                        checked={notifications.email}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            email: e.target.checked,
                          })
                        }
                        className="default-checked:bg-emerald-600"
                      />
                      <span className="absolute inset-0 rounded-full bg-slate-200" />
                      <span
                        className={`absolute inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          notifications.email
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Push Notification</p>
                      <p className="text-sm text-slate-600">
                        Terima notifikasi push di perangkat
                      </p>
                    </div>
                    <label className="relative inline-flex h-6 w-12 items-center rounded-full">
                      <input
                        type="checkbox"
                        checked={notifications.push}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            push: e.target.checked,
                          })
                        }
                        className="default-checked:bg-emerald-600"
                      />
                      <span className="absolute inset-0 rounded-full bg-slate-200" />
                      <span
                        className={`absolute inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          notifications.push
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Notifikasi In-App</p>
                      <p className="text-sm text-slate-600">
                        Tampilkan notifikasi di dalam aplikasi
                      </p>
                    </div>
                    <label className="relative inline-flex h-6 w-12 items-center rounded-full">
                      <input
                        type="checkbox"
                        checked={notifications.inApp}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            inApp: e.target.checked,
                          })
                        }
                        className="default-checked:bg-emerald-600"
                      />
                      <span className="absolute inset-0 rounded-full bg-slate-200" />
                      <span
                        className={`absolute inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          notifications.inApp
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Pengingat</p>
                      <p className="text-sm text-slate-600">
                        Kirim pengingat untuk transaksi yang belum disetujui
                      </p>
                    </div>
                    <label className="relative inline-flex h-6 w-12 items-center rounded-full">
                      <input
                        type="checkbox"
                        checked={notifications.reminders}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            reminders: e.target.checked,
                          })
                        }
                        className="default-checked:bg-emerald-600"
                      />
                      <span className="absolute inset-0 rounded-full bg-slate-200" />
                      <span
                        className={`absolute inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          notifications.reminders
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </label>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                    <Save size={18} />
                    <span>Simpan Notifikasi</span>
                  </button>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Pengaturan Tampilan
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tema
                    </label>
                    <select
                      value={appearance.theme}
                      onChange={(e) =>
                        setAppearance({ ...appearance, theme: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    >
                      <option value="light">Terang</option>
                      <option value="dark">Gelap</option>
                      <option value="system">Sistem</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Warna Utama
                    </label>
                    <select
                      value={appearance.primaryColor}
                      onChange={(e) =>
                        setAppearance({
                          ...appearance,
                          primaryColor: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    >
                      <option value="emerald">Emerald</option>
                      <option value="blue">Biru</option>
                      <option value="purple">Ungu</option>
                      <option value="rose">Rose</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="compactMode"
                      checked={appearance.compactMode}
                      onChange={(e) =>
                        setAppearance({
                          ...appearance,
                          compactMode: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="compactMode" className="text-sm text-slate-700">
                      Mode kompak
                    </label>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                    <Save size={18} />
                    <span>Simpan Tampilan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-800">
                  Keamanan
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Password Login Super Admin
                    </label>
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      placeholder="Masukkan password baru"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requireOTP"
                      className="h-4 w-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="requireOTP" className="text-sm text-slate-700">
                      Wajibkan otentikasi dua faktor (2FA) untuk semua pengguna
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sessionTimeout"
                      className="h-4 w-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                      defaultChecked
                    />
                    <label htmlFor="sessionTimeout" className="text-sm text-slate-700">
                      Timeout sesi otomatis setelah 30 menit tidak aktif
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                    <Save size={18} />
                    <span>Simpan Keamanan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
