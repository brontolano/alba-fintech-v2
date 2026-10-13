import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ALBA Finance - Santri',
  description: 'Manajemen Data Santri KPAK',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-800">ALBA Finance</h1>
                <span className="hidden sm:inline text-sm text-gray-500">| Santri Module</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Role: <span className="font-semibold text-gray-900">SUPERADMIN (Demo)</span></span>
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">SD</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-gray-500">&copy; 2026 ALBA Finance. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
