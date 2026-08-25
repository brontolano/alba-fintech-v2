'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  BookOpen,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';

interface AccountType {
  ASSET: { label: string; color: string; icon: any };
  LIABILITY: { label: string; color: string; icon: any };
  EQUITY: { label: string; color: string; icon: any };
  INCOME: { label: string; color: string; icon: any };
  EXPENSE: { label: string; color: string; icon: any };
}

const ACCOUNT_TYPES: AccountType = {
  ASSET: { label: 'Aset', color: 'blue', icon: DollarSign },
  LIABILITY: { label: 'Kewajiban', color: 'orange', icon: TrendingUp },
  EQUITY: { label: 'Ekuitas', color: 'purple', icon: DollarSign },
  INCOME: { label: 'Pendapatan', color: 'green', icon: TrendingUp },
  EXPENSE: { label: 'Beban', color: 'red', icon: TrendingDown },
};

interface JournalEntry {
  id: string;
  date: string;
  description: string | null;
  reference: string | null;
  totalDebit: number;
  totalCredit: number;
  createdBy: { name: string | null };
  lines: {
    id: string;
    account: { name: string; code: string; type: keyof AccountType };
    debit: number;
    credit: number;
    description: string | null;
  }[];
}

export default function BukuBesarPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const role = session?.user?.role;

  // Fetch all accounts for mapping
  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        const accMap: Record<string, any> = {};
        (data.data || []).forEach((acc: any) => {
          accMap[acc.id] = acc;
        });
        setAccounts(accMap);
      }
    } catch (error) {
      console.error('Gagal memuat akun:', error);
    }
  };

  const fetchJournalEntries = async () => {
    try {
      // Jurnal umum: ambil transaksi yang sudah APPROVED
      const res = await fetch(`/api/transactions?type=all&status=APPROVED&limit=30`);
      if (res.ok) {
        const data = await res.json();
        // Convert transactions to journal entries using dynamic accounts from COA
        const converted = (data.data || []).map((t: any) => {
          // Use actual account from transaction, or fallback to dynamic lookup
          let accountName = 'Kas/BIlangan';
          let accountCode = '1-100';
          let accountType = t.type;
          
          if (t.account) {
            // Use account info from transaction data
            accountName = t.account.name;
            accountCode = t.account.code;
            accountType = t.account.type || t.type;
          } else if (accounts[t.accountId]) {
            // Fallback to accounts map if account data wasn't included
            const acc = accounts[t.accountId];
            if (acc) {
              accountName = acc.name;
              accountCode = acc.code;
              accountType = acc.type || t.type;
            }
          }
          
          return {
            id: t.id,
            date: t.createdAt,
            description: t.description,
            reference: t.reference,
            totalDebit: t.type === 'INCOME' ? t.amount : 0,
            totalCredit: t.type === 'EXPENSE' ? t.amount : 0,
            createdBy: { name: t.createdBy?.name || 'Sistem' },
            lines: [
              {
                id: `${t.id}-1`,
                account: {
                  name: accountName,
                  code: accountCode,
                  type: accountType,
                },
                debit: t.type === 'INCOME' ? t.amount : 0,
                credit: t.type === 'EXPENSE' ? t.amount : 0,
                description: t.description,
              },
            ],
          };
        });
        setEntries(converted);
      }
    } catch (error) {
      console.error('Gagal memuat jurnal:', error);
    }
  };

  useEffect(() => {
    fetchJournalEntries();
    fetchAccounts();

    const interval = setInterval(() => {
      fetchJournalEntries();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = [...entries];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.description?.toLowerCase().includes(term) ||
          entry.reference?.toLowerCase().includes(term) ||
          entry.createdBy?.name?.toLowerCase().includes(term)
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.date);
        if (dateFilter === 'today') return entryDate >= today;
        if (dateFilter === 'week') {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return entryDate >= weekAgo;
        }
        if (dateFilter === 'month') {
          return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    setFilteredEntries(filtered);
  }, [entries, searchTerm, dateFilter, accountFilter]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedEntries);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedEntries(newSet);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const typeBadge = (type: string) => {
    const config = ACCOUNT_TYPES[type as keyof AccountType] || ACCOUNT_TYPES.INCOME;
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800',
      orange: 'bg-orange-100 text-orange-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
    };
    return (
      <Badge variant="outline" className={colorMap[config.color]}>
        {config.label}
      </Badge>
    );
  };

  const totalDebit = filteredEntries.reduce((sum, e) => sum + e.totalDebit, 0);
  const totalCredit = filteredEntries.reduce((sum, e) => sum + e.totalCredit, 0);
  const balance = totalDebit - totalCredit;

  if (sessionStatus === 'loading') {
    return <div className="p-6">Loading...</div>;
  }

  if (!session || !['SUPERADMIN', 'PIMPINAN'].includes(role ?? '')) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Akses ditolak — hanya Pimpinan dan Superadmin yang bisa melihat Buku Besar.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Buku Besar</h1>
            <p className="text-sm text-slate-500">Jurnal Umum — semua transaksi yang sudah disetujui</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
          />
        </div>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
        >
          <option value="all">Semua Tanggal</option>
          <option value="today">Hari Ini</option>
          <option value="week">7 Hari Terakhir</option>
          <option value="month">Bulan Ini</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalDebit)}</div>
            <p className="text-xs text-slate-500">Total Pendapatan (Debit)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalCredit)}</div>
            <p className="text-xs text-slate-500">Total Beban (Credit)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(balance)}
            </div>
            <p className="text-xs text-slate-500">Selisih (Pendapatan - Beban)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{filteredEntries.length}</div>
            <p className="text-xs text-slate-500">Jumlah Transaksi</p>
          </CardContent>
        </Card>
      </div>

      {/* Journal Entries Table */}
      <div className="flex-1 overflow-y-auto border-t border-slate-200">
        <div className="bg-slate-50 px-4 py-3 border-b font-medium text-sm text-slate-700 flex items-center justify-between">
          <span>Jurnal Umum</span>
          <span className="text-xs text-slate-500">
            {filteredEntries.length} transaksi — total saldo: {balance >= 0 ? 'untung' : 'rugi'}
          </span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <BookOpen className="mx-auto mb-2" size={40} />
            <p>Belum ada transaksi yang disetujui.</p>
            <p className="text-xs mt-1">Transaksi akan muncul di sini setelah disetujui oleh Superadmin/Pimpinan.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="border-b border-slate-100 last:border-0">
                <div
                  className="px-4 py-3 cursor-pointer hover:bg-slate-50 transition flex items-center justify-between"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedEntries.has(entry.id) ? (
                      <ChevronDown size={16} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-400" />
                    )}
                    <div>
                      <div className="font-medium text-sm text-slate-900">
                        {entry.description || entry.reference || 'Tanpa keterangan'}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{formatDate(entry.date)}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>Dibuat oleh: {entry.createdBy?.name || 'Sistem'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {typeBadge(entry.totalDebit > 0 ? 'INCOME' : 'EXPENSE')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {entry.totalDebit > 0
                        ? `+${formatCurrency(entry.totalDebit)}`
                        : `-${formatCurrency(entry.totalCredit)}`}
                    </div>
                  </div>
                </div>

                {expandedEntries.has(entry.id) && (
                  <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                    <div className="space-y-2">
                      {entry.lines.map((line) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-12 gap-2 text-sm items-center"
                        >
                          <div className="col-span-5">
                            <div className="font-medium text-slate-800">{line.account.name} <span className="text-slate-400">({line.account.code})</span></div>
                            {line.description && (
                              <div className="text-xs text-slate-500">{line.description}</div>
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            {line.debit > 0 && formatCurrency(line.debit)}
                          </div>
                          <div className="col-span-2 text-right text-red-600">
                            {line.credit > 0 && formatCurrency(line.credit)}
                          </div>
                          <div className="col-span-3 text-right">
                            {typeBadge(line.account.type)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end gap-4 text-sm">
                      <div className="text-right">
                        <span className="text-slate-500">Total Debit: </span>
                        <span className="font-medium text-green-700">
                          {formatCurrency(entry.totalDebit)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500">Total Credit: </span>
                        <span className="font-medium text-red-700">
                          {formatCurrency(entry.totalCredit)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
