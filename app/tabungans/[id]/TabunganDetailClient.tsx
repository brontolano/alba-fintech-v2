// app/tabungans/[id]/TabunganDetailClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../components/santri/Button';
import { Badge } from '../../../components/santri/Badge';
import { Modal } from '../../../components/santri/Modal';
import { Input } from '../../../components/santri/Input';
import { Select } from '../../../components/santri/Select';
import { Tabungan, TabunganTransaksi } from '../../../types/santri';

interface TransaksiFormData {
  nominal: number;
  tipe: string;
  kategori: string;
  channel: string;
  keterangan: string;
  buktiUrl: string;
}

export function TabunganDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [tabungan, setTabungan] = useState<Tabungan | null>(null);
  const [transaksis, setTransaksis] = useState<TabunganTransaksi[]>([]);
  const [transaksiLoading, setTransaksiLoading] = useState(false);
  const [transaksiPage, setTransaksiPage] = useState(1);
  const [transaksiTotalPages, setTransaksiTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transaksiModalOpen, setTransaksiModalOpen] = useState(false);
  const [transaksiForm, setTransaksiForm] = useState<TransaksiFormData>({
    nominal: 0,
    tipe: 'SETOR_TUNAI',
    kategori: 'TABUNGAN',
    channel: 'CASH',
    keterangan: '',
    buktiUrl: '',
  });
  const [transaksiSubmitting, setTransaksiSubmitting] = useState(false);
  const [transaksiError, setTransaksiError] = useState<string | null>(null);
  const [filterTipe, setFilterTipe] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const fetchTabungan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tabungans/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengambil data tabungan');
      }
      const data: Tabungan = await res.json();
      setTabungan(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTransaksis = useCallback(async (page = 1) => {
    setTransaksiLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filterTipe && { tipe: filterTipe }),
        ...(filterStartDate && { startDate: filterStartDate }),
        ...(filterEndDate && { endDate: filterEndDate }),
      });
      const res = await fetch(`/api/tabungans/${id}/transaksi?${params}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengambil transaksi');
      }
      const data = await res.json();
      setTransaksis(data.data);
      setTransaksiTotalPages(data.pagination.totalPages);
      setTransaksiPage(data.pagination.page);
    } catch (err: any) {
      console.error('Fetch transaksi error:', err);
    } finally {
      setTransaksiLoading(false);
    }
  }, [id, filterTipe, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchTabungan();
  }, [fetchTabungan]);

  useEffect(() => {
    fetchTransaksis(1);
  }, [fetchTransaksis]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tabungans/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus tabungan');
      }
      router.push('/tabungans');
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tabungan');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleTransaksiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransaksiSubmitting(true);
    setTransaksiError(null);
    try {
      const res = await fetch(`/api/tabungans/${id}/transaksi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaksiForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membuat transaksi');
      }
      setTransaksiModalOpen(false);
      setTransaksiForm({ nominal: 0, tipe: 'SETOR_TUNAI', kategori: 'TABUNGAN', channel: 'CASH', keterangan: '', buktiUrl: '' });
      fetchTabungan();
      fetchTransaksis(1);
    } catch (err: any) {
      setTransaksiError(err.message || 'Gagal membuat transaksi');
    } finally {
      setTransaksiSubmitting(false);
    }
  };

  const handleTipeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipe = e.target.value;
    setTransaksiForm(prev => ({ ...prev, tipe }));
    // Auto-set channel based on tipe
    if (tipe === 'TARIK_TUNAI') {
      setTransaksiForm(prev => ({ ...prev, channel: 'CASH' }));
    } else if (tipe.startsWith('SETOR')) {
      setTransaksiForm(prev => ({ ...prev, channel: 'CASH' }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error}
        <button className="ml-4 underline" onClick={() => window.location.reload()}>Coba lagi</button>
      </div>
    );
  }

  if (!tabungan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data tabungan tidak ditemukan.</p>
        <Link href="/tabungans" className="mt-4 inline-block btn btn-primary">Kembali ke daftar</Link>
      </div>
    );
  }

  // Role gating (placeholder)
  const currentRole = 'SUPERADMIN';
  const canEdit = ['SUPERADMIN', 'MANAGER KPAK', 'MANAGER KOPERASI BUKU'].includes(currentRole);
  const canDelete = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);
  const canTransaksi = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'].includes(currentRole);

  const tipeLabels: Record<string, string> = {
    SETOR_TUNAI: 'Setor Tunai',
    SETOR_BANK: 'Setor Bank',
    TARIK_TUNAI: 'Tarik Tunai',
    MUTASI_MASUK: 'Mutasi Masuk',
    MUTASI_KELUAR: 'Mutasi Keluar',
    AUTO_DEDUCT_TAGIHAN: 'Auto Deduct Tagihan',
  };
  const tipeColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    SETOR_TUNAI: 'success',
    SETOR_BANK: 'success',
    TARIK_TUNAI: 'error',
    MUTASI_MASUK: 'info',
    MUTASI_KELUAR: 'warning',
    AUTO_DEDUCT_TAGIHAN: 'default',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Detail Rekening Tabungan</h1>
          <p className="text-sm text-gray-500">Nomor Rekening: {tabungan.accountNumber}</p>
        </div>
        <div className="flex gap-3">
          {canEdit && (
            <Link href={`/tabungans/${id}/edit`} className="btn btn-secondary">
              Edit
            </Link>
          )}
          {canTransaksi && (
            <Button variant="success" onClick={() => setTransaksiModalOpen(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Transaksi
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>Hapus</Button>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">NIS Santri</p>
          <p className="font-medium">{tabungan.santri?.studentNumber || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Nama Santri</p>
          <p className="font-medium">{tabungan.santri?.name || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Kelas</p>
          <p className="text-gray-700">{tabungan.santri?.className || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Unit</p>
          <p className="text-gray-700">{tabungan.santri?.unit?.name || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
          <p className="text-sm text-gray-500">Saldo Saat Ini</p>
          <p className="text-2xl font-bold text-green-700">Rp {tabungan.saldo.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
          <p className="text-sm text-gray-500">Saldo Minimum</p>
          <p className="text-gray-700">Rp {tabungan.minSaldo.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Dibuat</p>
          <p className="text-gray-700">{new Date(tabungan.createdAt).toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Diupdate</p>
          <p className="text-gray-700">{new Date(tabungan.updatedAt).toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Transaksi Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold">Riwayat Transaksi</h2>
          <div className="flex flex-wrap gap-3">
            <Select
              value={filterTipe}
              onChange={(e) => { setFilterTipe(e.target.value); setTransaksiPage(1); }}
              options={[
                { value: '', label: 'Semua Tipe' },
                { value: 'SETOR_TUNAI', label: 'Setor Tunai' },
                { value: 'SETOR_BANK', label: 'Setor Bank' },
                { value: 'TARIK_TUNAI', label: 'Tarik Tunai' },
                { value: 'MUTASI_MASUK', label: 'Mutasi Masuk' },
                { value: 'MUTASI_KELUAR', label: 'Mutasi Keluar' },
                { value: 'AUTO_DEDUCT_TAGIHAN', label: 'Auto Deduct Tagihan' },
              ]}
              className="w-48"
            />
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => { setFilterStartDate(e.target.value); setTransaksiPage(1); }}
              placeholder="Tgl Mulai"
              className="w-40"
            />
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => { setFilterEndDate(e.target.value); setTransaksiPage(1); }}
              placeholder="Tgl Akhir"
              className="w-40"
            />
            {(filterTipe || filterStartDate || filterEndDate) && (
              <Button variant="secondary" size="sm" onClick={() => { setFilterTipe(''); setFilterStartDate(''); setFilterEndDate(''); setTransaksiPage(1); }}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {transaksiLoading ? (
          <div className="flex justify-center py-8">
            <div className="spinner"></div>
          </div>
        ) : transaksis.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Belum ada transaksi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="santri-table">
              <thead>
                <tr>
                  <th className="w-12">No</th>
                  <th>Tanggal</th>
                  <th>Tipe</th>
                  <th>Kategori</th>
                  <th>Channel</th>
                  <th>Nominal</th>
                  <th>Keterangan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transaksis.map((t, idx) => (
                  <tr key={t.id}>
                    <td className="text-sm text-gray-500">{(transaksiPage - 1) * 20 + idx + 1}</td>
                    <td className="text-sm">{new Date(t.createdAt).toLocaleString('id-ID')}</td>
                    <td>
                      <Badge variant={tipeColors[t.tipe] || 'default'}>
                        {tipeLabels[t.tipe] || t.tipe}
                      </Badge>
                    </td>
                    <td className="text-sm">{t.kategori}</td>
                    <td className="text-sm">{t.channel}</td>
                    <td className="font-mono text-sm">
                      {t.tipe.startsWith('SETOR') || t.tipe === 'MUTASI_MASUK' ? '+' : '-'}
                      Rp {t.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="text-sm text-gray-500 max-w-xs truncate">{t.keterangan || '-'}</td>
                    <td>
                      <Badge variant={t.status === 'LUNAS' ? 'success' : t.status === 'PENDING' ? 'warning' : 'error'}>
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {transaksiTotalPages > 1 && (
          <div className="pagination mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransaksis(Math.max(1, transaksiPage - 1))}
              disabled={transaksiPage === 1 || transaksiLoading}
            >
              Sebelumnya
            </Button>
            {Array.from({ length: transaksiTotalPages }, (_, i) => i + 1).map(p => (
              <Button
                key={p}
                variant={p === transaksiPage ? 'primary' : 'outline'}
                size="sm"
                onClick={() => fetchTransaksis(p)}
                disabled={transaksiLoading}
                className={p === transaksiPage ? 'active' : ''}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransaksis(Math.min(transaksiTotalPages, transaksiPage + 1))}
              disabled={transaksiPage === transaksiTotalPages || transaksiLoading}
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus rekening tabungan ini? Tindakan ini akan menandai data sebagai tidak aktif (soft delete)."
        actionLabel={deleting ? 'Menghapus...' : 'Ya, Hapus'}
        onAction={handleDelete}
        isLoading={deleting}
        variant="danger"
      />

      {/* Transaksi Modal */}
      <Modal
        isOpen={transaksiModalOpen}
        onClose={() => setTransaksiModalOpen(false)}
        title="Tambah Transaksi Tabungan"
        description={`Rekening: ${tabungan.accountNumber} | Saldo: Rp ${tabungan.saldo.toLocaleString('id-ID')}`}
        actionLabel={transaksiSubmitting ? 'Memproses...' : 'Simpan Transaksi'}
        onAction={handleTransaksiSubmit}
        isLoading={transaksiSubmitting}
        variant="primary"
        customContent={
          <form onSubmit={handleTransaksiSubmit} className="santri-form space-y-4">
            {transaksiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
                {transaksiError}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="transaksi-nominal">Nominal <span className="text-error">*</span></label>
              <Input
                id="transaksi-nominal"
                type="number"
                value={transaksiForm.nominal}
                onChange={(e) => setTransaksiForm(prev => ({ ...prev, nominal: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                min="1"
                step="1000"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="transaksi-tipe">Tipe Transaksi <span className="text-error">*</span></label>
              <select
                id="transaksi-tipe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={transaksiForm.tipe}
                onChange={handleTipeChange}
              >
                <option value="SETOR_TUNAI">Setor Tunai</option>
                <option value="SETOR_BANK">Setor Bank</option>
                <option value="TARIK_TUNAI">Tarik Tunai</option>
                <option value="MUTASI_MASUK">Mutasi Masuk (Transfer antar rekening)</option>
                <option value="MUTASI_KELUAR">Mutasi Keluar (Transfer antar rekening)</option>
                <option value="AUTO_DEDUCT_TAGIHAN">Auto Deduct Tagihan</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="transaksi-kategori">Kategori <span className="text-error">*</span></label>
              <select
                id="transaksi-kategori"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={transaksiForm.kategori}
                onChange={(e) => setTransaksiForm(prev => ({ ...prev, kategori: e.target.value }))}
              >
                <option value="TABUNGAN">Tabungan</option>
                <option value="HER">HER</option>
                <option value="DAFTAR_ULANG">Daftar Ulang</option>
                <option value="PSB">PSB</option>
                <option value="INTERNAL">Internal</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="transaksi-channel">Channel <span className="text-error">*</span></label>
              <select
                id="transaksi-channel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={transaksiForm.channel}
                onChange={(e) => setTransaksiForm(prev => ({ ...prev, channel: e.target.value }))}
              >
                <option value="CASH">CASH</option>
                <option value="BANK">BANK</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="transaksi-keterangan">Keterangan</label>
              <Input
                id="transaksi-keterangan"
                type="text"
                value={transaksiForm.keterangan}
                onChange={(e) => setTransaksiForm(prev => ({ ...prev, keterangan: e.target.value }))}
                placeholder="Contoh: Setoran tabungan mingguan"
              />
            </div>
            <div className="form-group">
              <label htmlFor="transaksi-bukti">URL Bukti (opsional)</label>
              <Input
                id="transaksi-bukti"
                type="url"
                value={transaksiForm.buktiUrl}
                onChange={(e) => setTransaksiForm(prev => ({ ...prev, buktiUrl: e.target.value }))}
                placeholder="https://example.com/bukti.jpg"
              />
            </div>
            <p className="text-xs text-gray-500">
              <strong>Aturan:</strong> Tarik tunai hanya CASH. Setor boleh CASH/BANK. 
              Saldo minimum: Rp {tabungan.minSaldo.toLocaleString('id-ID')}.
            </p>
          </form>
        }
      />
    </div>
  );
}