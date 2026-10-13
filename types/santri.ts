// types/santri.ts
export interface Unit {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean | null;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagihanItem {
  id: string;
  tagihanId: string;
  templateId?: string | null;
  kode?: string | null;
  nama: string;
  nominal: number;
  kategori?: string | null;
  periode: string;
  urutan: number;
  aktif?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pembayaran {
  id: string;
  tagihanId: string;
  santriId: string;
  userId?: string | null;
  nominal: number;
  tanggal: string;
  buktiUrl?: string | null;
  tipe?: string | null;
  keterangan?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagihanAdjustment {
  id: string;
  tagihanId: string;
  tagihan?: {
    id: string;
    totalNilai: number;
    status: string;
    santri?: {
      id: string;
      studentNumber: string;
      name: string;
    };
  };
  santriId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
  };
  tipe: string; // DISKON, BIAYA_TAMBAHAN, PENANGGUNG_JAWAB
  nominal: number;
  keterangan?: string | null;
  status: string; // PENDING, APPROVED, REJECTED
  approvedById?: string | null;
  approvedBy?: {
    id: string;
    name: string;
  } | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tagihan {
  id: string;
  unitId: string | null;
  unit?: Unit | null;
  santriId: string;
  templateId: string;
  tanggal: string;
  totalNilai: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  santri?: {
    id: string;
    studentNumber: string;
    name: string;
    className: string | null;
    unit?: Unit | null;
  };
  template?: {
    id: string;
    name: string;
    type?: string | null;
  };
  tagihanItem?: TagihanItem[];
  pembayaran?: Pembayaran[];
  adjustments?: TagihanAdjustment[];
}

export interface Santri {
  id: string;
  studentNumber: string;
  name: string;
  className: string | null;
  cardUid: string | null;
  isActive: boolean | null;
  unitId: string;
  unit?: Unit | null;
  createdAt: string;
  updatedAt: string;
  wali?: string | null;
  kontak?: string | null;
  tabungans?: Tabungan[];
  tagihan?: Tagihan[];
}

export interface TabunganTransaksi {
  id: string;
  tabunganId: string;
  santriId: string;
  nominal: number;
  tipe: string; // SETOR_TUNAI, SETOR_BANK, TARIK_TUNAI, MUTASI_MASUK, MUTASI_KELUAR, AUTO_DEDUCT_TAGIHAN
  kategori: string; // TABUNGAN, HER, DAFTAR_ULANG, PSB, INTERNAL
  channel: string; // CASH, BANK
  keterangan?: string | null;
  buktiUrl?: string | null;
  status: string; // PENDING, LUNAS, GAGAL
  referenceId?: string | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  tabungan?: {
    id: string;
    accountNumber: string;
    santri?: {
      id: string;
      studentNumber: string;
      name: string;
    };
  };
}

export interface Tabungan {
  id: string;
  santriId: string;
  accountNumber: string;
  saldo: number;
  minSaldo: number;
  isDeleted: boolean | null;
  createdAt: string;
  updatedAt: string;
  santri?: {
    id: string;
    studentNumber: string;
    name: string;
    className: string | null;
    unit?: {
      id: string;
      name: string;
    } | null;
  };
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  type: string; // LOW_BALANCE, PAYMENT_DUE, APPROVAL_REQUEST, INFO
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: string | null;
  referenceType?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

// Retail
export interface RetailUnit {
  id: string;
  name: string;
  code: string;
  type: string; // KOPERASI, KANTIN
  description?: string | null;
  isActive: boolean;
  unitId: string;
  unit?: Unit;
  createdAt: string;
  updatedAt: string;
  products?: RetailProduct[];
  inventories?: RetailInventory[];
  transactions?: RetailTransaction[];
}

export interface RetailProduct {
  id: string;
  retailUnitId: string;
  retailUnit?: RetailUnit;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  stock: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inventories?: RetailInventory[];
  transactionItems?: RetailTransactionItem[];
}

export interface RetailInventory {
  id: string;
  retailUnitId: string;
  retailUnit?: RetailUnit;
  productId: string;
  product?: RetailProduct;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem extends RetailProduct {
  inventory?: RetailInventory;
  currentStock: number;
  stockStatus: 'OK' | 'LOW' | 'OUT';
}

export interface RetailTransaction {
  id: string;
  retailUnitId: string;
  retailUnit?: RetailUnit;
  santriId?: string | null;
  santri?: {
    id: string;
    studentNumber: string;
    name: string;
  } | null;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
  } | null;
  totalAmount: number;
  paymentMethod: string; // CASH, TABUNGAN, CARD
  status: string; // PENDING, COMPLETED, CANCELLED, REFUNDED
  keterangan?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RetailTransactionItem[];
}

export interface RetailTransactionItem {
  id: string;
  transactionId: string;
  transaction?: RetailTransaction;
  productId: string;
  product?: RetailProduct;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}
