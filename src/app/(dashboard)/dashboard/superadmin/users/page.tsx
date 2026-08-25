'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Search, Edit, Trash2, Shield, MoreVertical } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import type { Role } from '@prisma/client';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  unitId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  PIMPINAN: 'Pimpinan',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-violet-100 text-violet-800',
  PIMPINAN: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  STAFF: 'bg-emerald-100 text-emerald-800',
};

export default function SuperadminUsersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<Role>('STAFF');
  const [formUnitId, setFormUnitId] = useState<string | null>(null);
  const [formPassword, setFormPassword] = useState('');

  const role = session?.user?.role;

  // ✅ All hooks called unconditionally first
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (res.ok) {
        const data = await res.json();
        setUnits(data.data || []);
      }
    } catch {
      setUnits([]);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchUsers();
  }, []);

  // Authorization check AFTER hooks
  const isAuthorized = sessionStatus !== 'loading' && session && role === 'SUPERADMIN';

  if (sessionStatus === 'loading') {
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

  if (!isAuthorized) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-500">
          <Shield size={48} className="mx-auto mb-4 text-slate-300" />
          <h2 className="font-medium mb-2">Akses Dibatasi</h2>
          <p>Halaman ini hanya bisa diakses oleh Superadmin.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const lower = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower) ||
      u.role.toLowerCase().includes(lower)
    );
  });

  const openCreate = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('STAFF');
    setFormUnitId(null);
    setFormPassword('');
    setSubmitError('');
    setIsDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.name || '');
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormUnitId(user.unitId);
    setFormPassword('');
    setSubmitError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        unitId: formUnitId || undefined,
      };

      if (editingUser) {
        // Update
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setIsDialogOpen(false);
          fetchUsers();
        } else {
          const data = await res.json().catch(() => ({}));
          setSubmitError(data.error || data.message || 'Gagal memperbarui user');
        }
      } else {
        // Create - verify email first
        const emailRes = await fetch(`/api/users/${formEmail.trim()}/exists`);
        if (emailRes.ok) {
          payload.password = formPassword;
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            setIsDialogOpen(false);
            fetchUsers();
          } else {
            const data = await res.json().catch(() => ({}));
            setSubmitError(data.error || data.message || 'Gagal membuat user');
          }
        } else {
          const data = await emailRes.json().catch(() => ({}));
          setSubmitError(data.error || 'Email sudah digunakan');
        }
      }
    } catch {
      setSubmitError('Gagal menyimpan — cek koneksi');
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Nonaktifkan akun "${user.email}"?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Gagal menonaktifkan akun');
      }
    } catch {
      alert('Gagal menghubungi server');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={24} />
            Manajemen User
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola akun pengguna dan role untuk seluruh unit
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Users size={16} />
          Tambah User
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <Input
          type="text"
          placeholder="Cari user (nama / email / role)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  {searchTerm ? 'Tidak ada user ditemukan' : 'Belum ada data user'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                        <Users size={16} className="text-brand-600" />
                      </div>
                      <span className="font-medium text-slate-900">
                        {user.name || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.unitId ? (
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {units.find(u => u.id === user.unitId)?.code || '-'}
                      </code>
                    ) : (
                      <span className="text-xs text-slate-400">Tidak terikat</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="outline">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Edit size={14} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {user.role !== 'SUPERADMIN' && (
                          <DropdownMenuItem 
                            onClick={() => handleDelete(user)}
                            className="text-red-600"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Nonaktifkan
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Tambah User Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                {submitError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama lengkap"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                disabled={!!editingUser}
              />
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={formRole} onValueChange={(value) => setFormRole(value as Role)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="PIMPINAN">Pimpinan</SelectItem>
                  <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Select 
                value={formUnitId || 'none'} 
                onValueChange={(value) => setFormUnitId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih unit (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak terikat</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      <div className="flex items-center justify-between">
                        <span>{unit.name}</span>
                        <code className="text-xs bg-slate-100 px-1 rounded">
                          {unit.code}
                        </code>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {editingUser ? 'Simpan' : 'Buat'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
