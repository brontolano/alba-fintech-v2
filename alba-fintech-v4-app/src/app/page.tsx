import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  return (
    <main className={inter.className}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            ALBA Finance v4
          </h1>
          <p className="text-gray-600 mb-8">
            Sistem manajemen keuangan berbasis web
          </p>
          <a
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            Login
          </a>
        </div>
      </div>
    </main>
  );
}
