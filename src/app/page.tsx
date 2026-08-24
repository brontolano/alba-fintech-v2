import Link from 'next/link';
import {
  LayoutDashboard,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  Check,
} from 'lucide-react';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Multi-Unit Dashboard',
    desc: 'Pantau seluruh unit dari satu tempat. Real-time stats per unit.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    desc: '4 role hierarki: Superadmin, Pimpinan, Manager, Staff — tiap role punya akses sesuai.',
  },
  {
    icon: TrendingUp,
    title: 'Approval Workflow',
    desc: 'Transaksi besar otomatis butuh approval bertingkat. Audit trail lengkap.',
  },
  {
    icon: Users,
    title: 'Manajemen User & Unit',
    desc: 'Kelola user, assignment unit, aktivasi/nonaktif akun dari Command Center.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-brand-50">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">ALBA Finance</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Masuk <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-brand-700 text-xs font-medium mb-6">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            Sistem Manajemen Keuangan Multi-Unit
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
            Kelola Keuangan <span className="text-brand-600">Multi-Unit</span> dengan Mudah
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            ALBA Finance adalah sistem manajemen keuangan terpusat untuk pesantren dan organisasi
            dengan banyak unit. Approval bertingkat, audit log lengkap, dashboard real-time.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition"
            >
              Masuk ke Aplikasi <ArrowRight size={18} />
            </Link>
            <a
              href="#fitur"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-lg border border-slate-300 transition"
            >
              Pelajari Fitur
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Fitur Utama</h2>
          <p className="mt-3 text-slate-600">Semua yang Anda butuhkan untuk kelola keuangan multi-unit</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                  <Icon size={22} className="text-brand-600" />
                </div>
                <h3 className="font-semibold text-slate-800">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats / Roles */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">4 Role, 1 Sistem</h2>
              <p className="mt-3 text-brand-100 leading-relaxed">
                Hierarki role yang jelas: setiap level punya akses yang sesuai dengan tanggung jawabnya.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  ['Superadmin', 'Akses penuh seluruh sistem'],
                  ['Pimpinan', 'Approval lintas unit, executive overview'],
                  ['Manager', 'Operasional unit yang ditugaskan'],
                  ['Staff', 'Input transaksi harian'],
                ].map(([role, desc]) => (
                  <li key={role} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">{role}</p>
                      <p className="text-sm text-brand-100">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="grid grid-cols-2 gap-3">
                {[Shield, TrendingUp, Users, LayoutDashboard].map((Icon, i) => (
                  <div
                    key={i}
                    className="w-24 h-24 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center"
                  >
                    <Icon size={36} className="text-white" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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