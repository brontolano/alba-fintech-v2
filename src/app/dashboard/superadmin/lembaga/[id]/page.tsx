import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

interface UnitWithParent {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  isRetail: boolean;
  parentId: string | null;
  parent: { name: string; code: string } | null;
  _count: { users: number; transactions: number };
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
}

export default async function LembagaDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig);
  if (!session?.user || session.user.role !== 'SUPERADMIN') redirect('/login');

  const lembaga = await prisma.lembaga.findUnique({
    where: { id: params.id },
    include: {
      units: {
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          isRetail: true,
          parentId: true,
          parent: { select: { name: true, code: true } },
          _count: { select: { users: true, transactions: true } },
        },
      },
    },
  });

  if (!lembaga) notFound();

  const units = lembaga.units as UnitWithParent[];
  const totalUsers = units.reduce((sum, u) => sum + u._count.users, 0);
  const totalTx = units.reduce((sum, u) => sum + u._count.transactions, 0);

  // Fetch users associated with this lembaga
  const lembagaUsers = await prisma.user.findMany({
    where: { lembagaId: params.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/superadmin/lembaga"
            className="text-sm text-slate-500 hover:text-slate-700 underline decoration-dotted"
          >← Kembali ke Daftar Lembaga</Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">{lembaga.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {lembaga.code && <span className="font-mono">{lembaga.code}</span>}
            {lembaga.description && <span className="mx-2">•</span>}
            {lembaga.description}
            <Badge variant={lembaga.isActive ? 'success' : 'outline'} className="ml-2">
              {lembaga.isActive ? 'Aktif' : 'Non-aktif'}
            </Badge>
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{units.length}</div>
          <p className="text-xs text-slate-500">Unit</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{totalUsers}</div>
          <p className="text-xs text-slate-500">User</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{totalTx}</div>
          <p className="text-xs text-slate-500">Transaksi</p>
        </div>
      </div>

      {/* Units table */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Unit di bawah Lembaga Ini</h2>
        {units.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada unit.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Kode</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit Induk</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tipe</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tx</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{u.name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 font-mono">{u.code ?? '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{u.parent?.name ?? '-'}</td>
                  <td className="py-3 px-4">
                    <Badge variant={u.isRetail ? 'success' : 'outline'}>
                      {u.isRetail ? 'Retail' : 'Sederhana'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4"><Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Aktif' : 'Non-aktif'}</Badge></td>
                  <td className="py-3 px-4 text-right text-sm text-slate-600">{u._count.users}</td>
                  <td className="py-3 px-4 text-right text-sm text-slate-600">{u._count.transactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">User di bawah Lembaga Ini</h2>
        {lembagaUsers.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada user terdaftar.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nama</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Unit</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {lembagaUsers.map((u) => {
                const roleLabel: Record<string, string> = {
                  SUPERADMIN: 'Super Admin', PIMPINAN: 'Pimpinan', MANAGER: 'Manager', STAFF: 'Staff',
                };
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{u.name ?? u.email}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 text-sm">{roleLabel[u.role] ?? u.role}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {u.role === 'PIMPINAN' ? '—' : 'Unit terkait'}
                    </td>
                    <td className="py-3 px-4"><Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Aktif' : 'Non-aktif'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
