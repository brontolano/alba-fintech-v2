import Link from 'next/link';
import {
  LayoutDashboard,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  Check,
  BookOpen,
  FileText,
  ClipboardCheck,
  UserCheck,
  Search,
  BarChart3,
  LogIn,
  Clock,
  FileCheck,
  ChevronLeft,
} from 'lucide-react';

const sections = [
  {
    id: 'pendahuluan',
    icon: BookOpen,
    title: 'Apa Itu ALBA Finance?',
    content:
      'ALBA Finance adalah sistem manajemen keuangan terpusat dirancang untuk pesantren dan organisasi dengan banyak unit. Sistem ini menyediakan dashboard real-time, workflow approval bertingkat, audit trail lengkap, dan manajemen user & unit terpusat.',
  },
  {
    id: 'roles',
    icon: Shield,
    title: 'Hierarki Peran',
    content:
      'Sistem memiliki 4 peran dengan hirarki akses yang jelas. Setiap peran memiliki kewenangan dan batasan akses yang berbeda.',
    roles: [
      ['Superadmin', 'Akses penuh seluruh sistem dan semua unit. Dapat mengelola user, unit, role, dan melihat seluruh laporan.'],
      ['Pimpinan', 'Akses lintas unit. Dapat melihat laporan gabungan semua unit, melakukan approval tingkat tinggi, dan mengakses audit trail.'],
      ['Manager', 'Mengelola operasional unit yang ditugaskan. Input transaksi, melihat laporan unit sendiri, dan menyetujui transaksi pada level manajer.'],
      ['Staff', 'Input transaksi harian pada unit yang ditempatkan. Tidak dapat melakukan approval atau mengakses laporan unit lain.'],
    ],
  },
  {
    id: 'login',
    icon: LogIn,
    title: 'Cara Login',
    content:
      'Ikuti langkah-langkah berikut untuk masuk ke sistem:',
    steps: [
      'Buka https://alba.brontolano.com/login',
      'Masukkan email dan password yang diberikan oleh administrator',
      'Klik tombol "Masuk". Anda akan diarahkan ke dashboard berdasarkan peran Anda.',
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    content:
      'Dashboard menampilkan ringkasan keuangan real-time untuk unit yang dapat diakses Anda.',
    features: [
      'Statistik keuangan harian, mingguan, dan bulanan',
      'Transaksi terbaru dan status approval',
      'Ringkasan saldo per unit',
      'Notifikasi persetujuan yang membutuhkan aksi Anda',
    ],
  },
  {
    id: 'transaksi',
    icon: FileText,
    title: 'Input Transaksi',
    content:
      'Staff dan Manager dapat menginput transaksi keuangan harian. Ikuti prosedur berikut:',
    steps: [
      'Pilih menu "Transaksi" di sidebar',
      'Klik "Tambah Transaksi" pada pojok kanan atas',
      'Isi formulir: tanggal, jenis transaksi (pemasukan/pengeluaran), jumlah, keterangan, dan unit',
      'Klik "Simpan". Transaksi akan memasuki workflow approval.',
    ],
    note:
      'Transaksi dengan jumlah di atas batas yang ditentukan akan otomatis membutuhkan approval lebih lanjut.',
  },
  {
    id: 'approval',
    icon: ClipboardCheck,
    title: 'Workflow Approval',
    content:
      'Sistem menggunakan workflow approval bertingkat. Setiap level approval harus menyetujui sebelum transaksi dapat diproses.',
    levels: [
      ['Level 1', 'Manager unit — approval transaksi harian'],
      ['Level 2', 'Pimpinan — approval transaksi besar'],
      ['Level 3', 'Superadmin — approval transaksi kritis'],
    ],
    steps: [
      'Notifikasi approval muncul di tombol lonceng di header',
      'Klik notifikasi untuk melihat detail transaksi yang perlu persetujuan',
      'Periksa detail transaksi, lalu klik "Setujui" atau "Tolak"',
      'Jika ditolak, transaksi dikembalikan ke pengirim dengan catatan',
    ],
  },
  {
    id: 'audit',
    icon: FileCheck,
    title: 'Audit Trail',
    content:
      'Setiap aksi di sistem dicatat secara otomatis. Pimpinan dan Superadmin dapat meninjau log audit.',
  },
  {
    id: 'laporan',
    icon: BarChart3,
    title: 'Laporan & Rekonsiliasi',
    content:
      'Sistem menyediakan laporan keuangan harian, mingguan, dan bulanan. Fitur rekonsiliasi tersedia untuk semua peran yang terautentikasi.',
    features: [
      'Ekspor laporan ke CSV/PDF',
      'Filter berdasarkan rentang tanggal dan unit',
      'Rekonsiliasi antar unit untuk pimpinan',
    ],
  },
  {
    id: 'pengguna-unit',
    icon: Users,
    title: 'Manajemen Pengguna & Unit',
    content:
      'Hanya Superadmin yang dapat mengelola pengguna dan unit.',
    steps: [
      'Pilih menu "Pengguna" di sidebar (Superadmin)',
      'Klik "Tambah Pengguna" untuk menambah akun baru',
      'Isi nama, email, peran, dan unit yang ditempatkan',
      'Atur status akun (aktif/non-aktif)',
    ],
  },
];

export default function PanduanPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-brand-50">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ChevronLeft size={20} className="text-slate-500" />
            <span className="text-slate-700 font-medium">Kembali ke Beranda</span>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-brand-600" />
            <span className="text-lg font-bold text-slate-800">Panduan Penggunaan</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-brand-700 text-xs font-medium mb-4">
            <BookOpen size={14} />
            Dokumentasi Pengguna
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
            Panduan Lengkap ALBA Finance
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Pelajari cara menggunakan sistem manajemen keuangan multi-unit ini langkah demi langkah.
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="max-w-4xl mx-auto px-6 pb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Search size={18} /> Daftar Isi
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-sm text-slate-600 hover:text-brand-700 hover:bg-brand-50 py-1.5 px-2 rounded transition flex items-center gap-2"
              >
                <s.icon size={14} className="text-brand-500" />
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="max-w-4xl mx-auto px-6 pb-16 space-y-10">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.id} id={s.id} className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Icon size={22} className="text-brand-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{s.title}</h2>
              </div>

              <p className="text-slate-600 leading-relaxed mb-4">{s.content}</p>

              {s.roles && (
                <div className="space-y-3 mt-4">
                  {s.roles.map(([role, desc]) => (
                    <div key={role} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{role}</p>
                        <p className="text-sm text-slate-600">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {s.steps && (
                <div className="space-y-2 mt-4">
                  {s.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-600">{step}</p>
                    </div>
                  ))}
                </div>
              )}

              {s.features && (
                <ul className="space-y-2 mt-4">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className="text-brand-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              {s.levels && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm text-left border.border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-slate-700 font-medium">Level</th>
                        <th className="px-3 py-2 text-slate-700 font-medium">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.levels.map(([level, desc]) => (
                        <tr key={level} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">{level}</td>
                          <td className="px-3 py-2 text-slate-600">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {s.note && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">{s.note}</p>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Footer CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Siap mencoba?</h2>
          <p className="text-brand-100 mb-6">Masuk ke aplikasi sekarang dan mulailah mengelola keuangan Anda.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-6 py-3 rounded-lg hover:bg-slate-50 transition"
          >
            Masuk ke Aplikasi <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <LayoutDashboard size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">ALBA Finance</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 Brontolano. Sistem Manajemen Keuangan Multi-Unit</p>
        </div>
      </footer>
    </main>
  );
}
