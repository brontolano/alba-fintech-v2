// app/tagihan/[id]/TagihanDetailClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../../components/santri/Button';
import { Badge } from '../../../components/santri/Badge';
import { Modal } from '../../../components/santri/Modal';
import { Input } from '../../../components/santri/Input';
import { Select } from '../../../components/santri/Select';
import { Tagihan, Pembayaran, TagihanAdjustment } from '../../../types/santri';

export function TagihanDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [tagihan, setTagihan] = useState<Tagihan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    nominal: 0,
    tipe: 'CASH',
    keterangan: '',
    buktiUrl: '',
    useTabungan: false,
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<TagihanAdjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    tipe: 'DISKON',
    nominal: 0,
    keterangan: '',
  });
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'detail' | 'payments' | 'adjustments'>('detail');

  const fetchTagihan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tagihan/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengambil data tagihan');
      }
      const data: Tagihan = await res.json();
      setTagihan(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAdjustments = useCallback(async () => {
    setAdjustmentsLoading(true);
    try {
      const res = await fetch(`/api/tagihan-adjustments?tagihanId=${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat adjustment');
      const data = await res.json();
      setAdjustments(data.data || []);
    } catch (err: any) {
      console.error('Fetch adjustments error:', err);
    } finally {
      setAdjustmentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTagihan();
  }, [fetchTagihan]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tagihan/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membatalkan tagihan');
      }
      router.push('/tagihan');
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan tagihan');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await fetch(`/api/tagihan/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal: paymentData.nominal,
          tipe: paymentData.tipe,
          keterangan: paymentData.keterangan,
          buktiUrl: paymentData.buktiUrl || null,
          useTabungan: paymentData.useTabungan,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mencatat pembayaran');
      }
      setPaymentModalOpen(false);
      setPaymentData({ nominal: 0, tipe: 'CASH', keterangan: '', buktiUrl: '', useTabungan: false });
      fetchTagihan();
      fetchAdjustments();
    } catch (err: any) {
      setPaymentError(err.message || 'Gagal mencatat pembayaran');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustmentLoading(true);
    setAdjustmentError(null);
    try {
      const res = await fetch('/api/tagihan-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagihanId: id,
          tipe: adjustmentForm.tipe,
          nominal: adjustmentForm.nominal,
          keterangan: adjustmentForm.keterangan,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membuat adjustment');
      }
      setAdjustmentModalOpen(false);
      setAdjustmentForm({ tipe: 'DISKON', nominal: 0, keterangan: '' });
      fetchAdjustments();
      fetchTagihan();
    } catch (err: any) {
      setAdjustmentError(err.message || 'Gagal membuat adjustment');
    } finally {
      setAdjustmentLoading(false);
    }
  };

  const handleApproveAdjustment = async (adjustmentId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/tagihan-adjustments/${adjustmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memproses approval');
      }
      fetchAdjustments();
      fetchTagihan();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses approval');
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

  if (!tagihan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data tagihan tidak ditemukan.</p>
        <Link href="/tagihan" className="mt-4 inline-block btn btn-primary">Kembali ke daftar</Link>
      </div>
    );
  }

  // Role gating (placeholder)
  const currentRole = 'SUPERADMIN';
  const canEdit = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);
  const canDelete = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);
  const canPay = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'].includes(currentRole);
  const canAdjust = ['SUPERADMIN', 'MANAGER KPAK', 'STAFF KPAK', 'MANAGER KOPERASI BUKU', 'STAFF KOPERASI BUKU'].includes(currentRole);
  const canApprove = ['SUPERADMIN', 'MANAGER KPAK'].includes(currentRole);

  const totalPaid = tagihan.pembayaran?.filter(p => p.status === 'LUNAS').reduce((sum, p) => sum + p.nominal, 0) || 0;
  const remaining = tagihan.totalNilai - totalPaid;
  const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    UNPAID: 'error',
    PARTIAL: 'warning',
    PAID: 'success',
    CANCELLED: 'default',
  };
  const statusLabels: Record<string, string> = {
    UNPAID: 'Belum Bayar',
    PARTIAL: 'Cicilan',
    PAID: 'Lunas',
    CANCELLED: 'Dibatalkan',
  };
  const adjustmentTypeColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    DISKON: 'success',
    BIAYA_TAMBAHAN: 'error',
    PENANGGUNG_JAWAB: 'info',
  };
  const adjustmentTypeLabels: Record<string, string> = {
    DISKON: 'Diskon',
    BIAYA_TAMBAHAN: 'Biaya Tambahan',
    PENANGGUNG_JAWAB: 'Penanggung Jawab',
  };
  const adjustmentStatusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Detail Tagihan</h1>
          <p className="text-sm text-gray-500">
            NIS: {tagihan.santri?.studentNumber} • {tagihan.santri?.name}
          </p>
        </div>
        <div className="flex gap-3">
          {canEdit && tagihan.status !== 'PAID' && tagihan.status !== 'CANCELLED' && (
            <Link href={`/tagihan/${id}/edit`} className="btn btn-secondary">
              Edit
            </Link>
          )}
          {canPay && tagihan.status !== 'PAID' && tagihan.status !== 'CANCELLED' && (
            <Button variant="success" onClick={() => setPaymentModalOpen(true)}>
              Bayar
            </Button>
          )}
          {canAdjust && tagihan.status !== 'PAID' && tagihan.status !== 'CANCELLED' && (
            <Button variant="primary" onClick={() => setAdjustmentModalOpen(true)}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Adjustment
            </Button>
          )}
          {canDelete && tagihan.status !== 'PAID' && (
            <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>Batalkan</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'detail'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Detail
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pembayaran
              {tagihan.pembayaran && tagihan.pembayaran.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {tagihan.pembayaran.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'adjustments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Adjustment
              {adjustments.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {adjustments.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'detail' && (
            <>
              {/* Tagihan Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Template</p>
                  <p className="font-medium">{tagihan.template?.name || '-'}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Tipe</p>
                  <p className="text-gray-700">{tagihan.template?.type || '-'}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Tanggal Tagihan</p>
                  <p className="text-gray-700">{new Date(tagihan.tanggal).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={statusColors[tagihan.status] || 'default'}>
                    {statusLabels[tagihan.status] || tagihan.status}
                  </Badge>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
                  <p className="text-sm text-gray-500">Total Tagihan</p>
                  <p className="text-2xl font-bold text-blue-700">Rp {tagihan.totalNilai.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
                  <p className="text-sm text-gray-500">Total Dibayar</p>
                  <p className="text-2xl font-bold text-green-700">Rp {totalPaid.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
                  <p className="text-sm text-gray-500">Sisa Tagihan</p>
                  <p className="text-2xl font-bold text-red-700">Rp {remaining.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Dibuat</p>
                  <p className="text-gray-700">{new Date(tagihan.createdAt).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">Diupdate</p>
                  <p className="text-gray-700">{new Date(tagihan.updatedAt).toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Tagihan Items */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Rincian Tagihan</h2>
                {tagihan.tagihanItem && tagihan.tagihanItem.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="santri-table">
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>Kode</th>
                          <th>Nama</th>
                          <th>Kategori</th>
                          <th>Periode</th>
                          <th>Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tagihan.tagihanItem.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="text-sm text-gray-500">{idx + 1}</td>
                            <td className="font-mono text-sm">{item.kode || '-'}</td>
                            <td className="font-medium">{item.nama}</td>
                            <td className="text-sm text-gray-500">{item.kategori || '-'}</td>
                            <td className="text-sm">{item.periode}</td>
                            <td className="font-mono text-blue-700">Rp {item.nominal.toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Tidak ada rincian tagihan</p>
                )}
              </div>
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Riwayat Pembayaran</h2>
                {canPay && tagihan.status !== 'PAID' && tagihan.status !== 'CANCELLED' && (
                  <Button variant="success" onClick={() => setPaymentModalOpen(true)}>
                    Tambah Pembayaran
                  </Button>
                )}
              </div>
              {tagihan.pembayaran && tagihan.pembayaran.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="santri-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Tanggal</th>
                        <th>Nominal</th>
                        <th>Tipe</th>
                        <th>Keterangan</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tagihan.pembayaran.map((p: Pembayaran, idx) => (
                        <tr key={p.id}>
                          <td className="text-sm text-gray-500">{idx + 1}</td>
                          <td className="text-sm">{new Date(p.tanggal).toLocaleDateString('id-ID')}</td>
                          <td className="font-mono text-green-700">Rp {p.nominal.toLocaleString('id-ID')}</td>
                          <td className="text-sm">{p.tipe || '-'}</td>
                          <td className="text-sm text-gray-500">{p.keterangan || '-'}</td>
                          <td>
                            <Badge variant={p.status === 'LUNAS' ? 'success' : p.status === 'PENDING' ? 'warning' : 'error'}>
                              {p.status === 'LUNAS' ? 'Lunas' : p.status === 'PENDING' ? 'Pending' : 'Gagal'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Belum ada pembayaran</p>
              )}
            </>
          )}

          {activeTab === 'adjustments' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Adjustment Tagihan (Diskon / Biaya Tambahan)</h2>
                {canAdjust && tagihan.status !== 'PAID' && tagihan.status !== 'CANCELLED' && (
                  <Button variant="primary" onClick={() => setAdjustmentModalOpen(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Tambah Adjustment
                  </Button>
                )}
              </div>
              {adjustments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="santri-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Tipe</th>
                        <th>Nominal</th>
                        <th>Keterangan</th>
                        <th>Status</th>
                        <th>Dibuat Oleh</th>
                        <th>Disetujui Oleh</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustments.map((adj, idx) => (
                        <tr key={adj.id}>
                          <td className="text-sm text-gray-500">{idx + 1}</td>
                          <td>
                            <Badge variant={adjustmentTypeColors[adj.tipe] || 'default'}>
                              {adjustmentTypeLabels[adj.tipe] || adj.tipe}
                            </Badge>
                          </td>
                          <td className="font-mono text-sm">
                            {adj.tipe === 'DISKON' ? '-' : '+'} Rp {adj.nominal.toLocaleString('id-ID')}
                          </td>
                          <td className="text-sm text-gray-500 max-w-xs truncate">{adj.keterangan || '-'}</td>
                          <td>
                            <Badge variant={adjustmentStatusColors[adj.status] || 'default'}>
                              {adj.status}
                            </Badge>
                          </td>
                          <td className="text-sm">{adj.user?.name || '-'}</td>
                          <td className="text-sm">{adj.approvedBy?.name || (adj.status === 'PENDING' ? 'Menunggu' : '-')}</td>
                          <td>
                            {adj.status === 'PENDING' && canApprove && (
                              <div className="flex gap-1">
                                <Button 
                                  variant="success" 
                                  size="sm" 
                                  onClick={() => handleApproveAdjustment(adj.id, 'APPROVED')}
                                  className="px-2 py-1"
                                >
                                  Setujui
                                </Button>
                                <Button 
                                  variant="danger" 
                                  size="sm" 
                                  onClick={() => handleApproveAdjustment(adj.id, 'REJECTED')}
                                  className="px-2 py-1"
                                >
                                  Tolak
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Belum ada adjustment</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Konfirmasi Batalkan Tagihan"
        description="Apakah Anda yakin ingin membatalkan tagihan ini? Tagihan yang dibatalkan tidak bisa dibayar."
        actionLabel={deleting ? 'Membatalkan...' : 'Ya, Batalkan'}
        onAction={handleDelete}
        isLoading={deleting}
        variant="danger"
      />

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Catat Pembayaran"
        description={`Masukkan detail pembayaran untuk tagihan ${tagihan.template?.name} | Sisa: Rp ${remaining.toLocaleString('id-ID')}`}
        actionLabel={paymentLoading ? 'Memproses...' : 'Simpan Pembayaran'}
        onAction={handlePaymentSubmit}
        isLoading={paymentLoading}
        variant="primary"
        customContent={
          <form onSubmit={handlePaymentSubmit} className="santri-form space-y-4">
            {paymentError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
                {paymentError}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="payment-nominal">Nominal <span className="text-error">*</span></label>
              <Input
                id="payment-nominal"
                type="number"
                value={paymentData.nominal}
                onChange={(e) => setPaymentData(prev => ({ ...prev, nominal: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                min="1"
                max={remaining}
                step="1000"
                required
                hint={`Maksimal: Rp ${remaining.toLocaleString('id-ID')}`}
              />
            </div>
            <div className="form-group">
              <label htmlFor="payment-tipe">Tipe Pembayaran <span className="text-error">*</span></label>
              <select
                id="payment-tipe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={paymentData.tipe}
                onChange={(e) => setPaymentData(prev => ({ ...prev, tipe: e.target.value }))}
              >
                <option value="CASH">Tunai</option>
                <option value="BANK">Transfer Bank</option>
                <option value="TABUNGAN">Tabungan Santri</option>
              </select>
            </div>
            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={paymentData.useTabungan}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, useTabungan: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm">Gunakan saldo tabungan santri (auto-deduct)</span>
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="payment-keterangan">Keterangan</label>
              <Input
                id="payment-keterangan"
                type="text"
                value={paymentData.keterangan}
                onChange={(e) => setPaymentData(prev => ({ ...prev, keterangan: e.target.value }))}
                placeholder="Contoh: Pembayaran SPP bulan Januari"
              />
            </div>
            <div className="form-group">
              <label htmlFor="payment-bukti">URL Bukti (opsional)</label>
              <Input
                id="payment-bukti"
                type="url"
                value={paymentData.buktiUrl}
                onChange={(e) => setPaymentData(prev => ({ ...prev, buktiUrl: e.target.value }))}
                placeholder="https://example.com/bukti.jpg"
              />
            </div>
          </form>
        }
      />

      {/* Adjustment Modal */}
      <Modal
        isOpen={adjustmentModalOpen}
        onClose={() => setAdjustmentModalOpen(false)}
        title="Tambah Adjustment Tagihan"
        description={`Tagihan: ${tagihan.template?.name} | Total: Rp ${tagihan.totalNilai.toLocaleString('id-ID')}`}
        actionLabel={adjustmentLoading ? 'Memproses...' : 'Simpan Adjustment'}
        onAction={handleAdjustmentSubmit}
        isLoading={adjustmentLoading}
        variant="primary"
        customContent={
          <form onSubmit={handleAdjustmentSubmit} className="santri-form space-y-4">
            {adjustmentError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
                {adjustmentError}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="adj-tipe">Tipe Adjustment <span className="text-error">*</span></label>
              <select
                id="adj-tipe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={adjustmentForm.tipe}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, tipe: e.target.value }))}
              >
                <option value="DISKON">Diskon (Mengurangi Total Tagihan)</option>
                <option value="BIAYA_TAMBAHAN">Biaya Tambahan (Menambah Total Tagihan)</option>
                <option value="PENANGGUNG_JAWAB">Penanggung Jawab (Catatan Admin)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="adj-nominal">Nominal <span className="text-error">*</span></label>
              <Input
                id="adj-nominal"
                type="number"
                value={adjustmentForm.nominal}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, nominal: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                min="1"
                step="1000"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="adj-keterangan">Keterangan <span className="text-error">*</span></label>
              <Input
                id="adj-keterangan"
                type="text"
                value={adjustmentForm.keterangan}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, keterangan: e.target.value }))}
                placeholder="Contoh: Diskon prestasi anak yatim"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              <strong>Catatan:</strong> Diskon akan mengurangi total tagihan, Biaya Tambahan akan menambah.
              Approval dari MANAGER KPAK diperlukan untuk diterapkan ke total tagihan.
            </p>
          </form>
        }
      />
    </div>
  );
}