'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

interface Unit {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormErrors {
  name?: string;
  code?: string;
}

export default function UnitsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const role = session?.user?.role as string | undefined;

  const canWrite = role === 'SUPERADMIN' || role === 'PIMPINAN';

  // Fetch units
  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (res.ok) {
        const data = await res.json();
        setUnits(Array.isArray(data.units) ? data.units : []);
      } else {
        setUnits([]);
      }
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  // Filtered units
  const filteredUnits = units.filter((u) => {
    const lower = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(lower) ||
      u.code.toLowerCase().includes(lower)
    );
  });

  // Open dialog for create
  const openCreate = () => {
    setEditingUnit(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setErrors({});
    setSubmitError('');
    setIsDialogOpen(true);
  };

  // Open dialog for edit
  const openEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormName(unit.name);
    setFormCode(unit.code);
    setFormDescription(unit.description ?? '');
    setErrors({});
    setSubmitError('');
    setIsDialogOpen(true);
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formName.trim()) {
      newErrors.name = 'Nama unit wajib diisi';
    }
    if (!formCode.trim()) {
      newErrors.code = 'Kode unit wajib diisi';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      description: formDescription.trim() || undefined,
    };

    try {
      const url = editingUnit
        ? `/api/units/${editingUnit.id}`
        : '/api/units';
      const res = await fetch(url, {
        method: editingUnit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsDialogOpen(false);
        setEditingUnit(null);
        fetchUnits();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setSubmitError('Anda tidak memiliki izin untuk melakukan ini');
        } else if (res.status === 409) {
          setSubmitError('Kode unit sudah digunakan');
        } else if (res.status === 400) {
          setSubmitError(data.message || 'Validasi gagal');
        } else {
          setSubmitError(data.message || 'Terjadi kesalahan');
        }
      }
    } catch {
      setSubmitError('Gagal menyimpan — cek koneksi');
    }
  };

  // Delete unit
  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Yakin ingin menonaktifkan unit "${unit.name}"?`)) return;

    try {
      const res = await fetch(`/api/units/${unit.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUnits();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Gagal menonaktifkan unit');
      }
    } catch {
      alert('Gagal menghubungi server');
    }
  };

  // Loading states
  if (status === 'loading' || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Auth guard
  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={24} />
            Manajemen Unit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola unit/po (akses: Superadmin & Pimpinan)
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Tambah Unit
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <Input
          type="text"
          placeholder="Cari unit (nama / kode)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Unit</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnits.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-slate-500 py-8"
                >
                  {searchTerm
                    ? 'Tidak ada unit ditemukan'
                    : 'Belum ada data unit'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUnits.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2
                        size={16}
                        className={
                          unit.isActive
                            ? 'text-brand-600'
                            : 'text-slate-400'
                        }
                      />
                      <span
                        className={
                          unit.isActive ? 'font-medium' : 'line-through'
                        }
                      >
                        {unit.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                      {unit.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    {unit.description ? (
                      <span
                        className="text-slate-600 text-sm line-clamp-1"
                        title={unit.description}
                      >
                        {unit.description}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm italic">
                        -
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {unit.isActive ? (
                      <Badge
                        variant="success"
                        className="flex items-center gap-1 w-fit"
                      >
                        <CheckCircle size={12} />
                        Aktif
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 w-fit"
                      >
                        <XCircle size={12} />
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">
                      {new Date(unit.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEdit(unit)}
                          >
                            <Edit size={14} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {role === 'SUPERADMIN' && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(unit)}
                              className="text-red-600"
                          >
                              <Trash2 size={14} className="mr-2" />
                              Nonaktifkan
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
              </TableBody>
        </Table>
      </div>

      {/* Info: Staff tidak bisa aksi */}
      {!canWrite && (
        <Alert>
          <AlertDescription>
            Role Anda (Staff) tidak memiliki izin untuk mengelola unit.
            Hubungi Superadmin atau Pimpinan untuk perubahan data.
          </AlertDescription>
        </Alert>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? 'Edit Unit' : 'Tambah Unit Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nama Unit *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Masukkan nama unit"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Kode Unit *</Label>
              <Input
                id="code"
                value={formCode}
                onChange={(e) =>
                  setFormCode(e.target.value.toUpperCase())
                }
                placeholder="Misal: PUSAT, CAB01 (auto-uppercase)"
                maxLength={20}
                aria-invalid={!!errors.code}
              />
              {errors.code && (
                <p className="text-xs text-red-600">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Deskripsi singkat (opsional)"
                maxLength={200}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-brand-600 hover:bg-brand-700"
            >
              {editingUnit ? 'Simpan' : 'Buat'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
