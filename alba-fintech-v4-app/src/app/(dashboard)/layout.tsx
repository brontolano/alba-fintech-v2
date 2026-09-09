'use client';

import Link from 'next/link';
// @ts-nocheck
import { signOut, useSession } from 'next-auth/react';
import {
    LayoutDashboard,
    Users,
    FileText,
    Package,
    History,
    Settings,
    Bell,
    LogOut,
    ShoppingCart,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'POS', href: '/pos', icon: ShoppingCart },
    { name: 'Transaksi', href: '/transactions', icon: FileText },
    { name: 'Inventori', href: '/inventory', icon: Package },
    { name: 'Persetujuan', href: '/approvals', icon: History },
    { name: 'Pengguna', href: '/users', icon: Users },
    { name: 'Notifikasi', href: '/notifications', icon: Bell },
    { name: 'Pengaturan', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession({
        required: true,
    });
    const pathname = usePathname();

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r overflow-y-auto">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">ALBA Finance</h2>
                    <p className="text-xs text-gray-500">{session?.user?.role}</p>
                </div>

                <nav className="py-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${pathname === item.href
                                    ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="pt-4 border-t">
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                <header className="bg-white border-b px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-semibold">
                            {navigation.find((n) => pathname === n.href)?.name ||
                                'Dashboard'}
                        </h1>
                        {session?.user?.name && (
                            <span className="text-sm text-gray-600">
                                {session.user.name}
                            </span>
                        )}
                    </div>
                </header>
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
