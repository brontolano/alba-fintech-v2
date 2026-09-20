import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(
    now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000,
  );
  return past;
}

function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🌱 Starting comprehensive seed...");

  // ============================================
  // 1. LEMBAGA
  // ============================================
  const lembaga = await prisma.lembaga.upsert({
    where: { code: "AL-BASYARIYAH" },
    update: {},
    create: {
      name: "Pondok Pesantren Al-Basyariyah",
      code: "AL-BASYARIYAH",
      description:
        "Pondok Pesantren Al-Basyariyah - Jl. Mahmud, Rahayu, Kec. Margaasih, Kabupaten Bandung, Jawa Barat 40218",
      address:
        "Jl. Mahmud, Rahayu, Kec. Margaasih, Kabupaten Bandung, Jawa Barat 40218",
      isActive: true,
    },
  });
  console.log("🏛️  Lembaga:", lembaga.name);

  // ============================================
  // 2. UNITS (4 unit)
  // ============================================
  const unitsData = [
    {
      name: "KPAK",
      code: "KPK-01",
      description: "Kantor Pelayanan Administrasi Keuangan",
      type: "KPAK" as const,
      isRetail: false,
    },
    {
      name: "Koperasi Buku",
      code: "KOP-01",
      description: "Koperasi buku dan perlengkapan sekolah",
      type: "KOPERASI" as const,
      isRetail: true,
    },
    {
      name: "Kantin Umi",
      code: "KNT-01",
      description: "Kantin makanan dan jajanan",
      type: "KANTIN" as const,
      isRetail: true,
    },
    {
      name: "Kantin Baru",
      code: "KNT-02",
      description: "Kantin makanan dan jajanan baru",
      type: "KANTIN" as const,
      isRetail: true,
    },
  ];

  const units = [];
  for (const u of unitsData) {
    const unit = await prisma.unit.upsert({
      where: { code: u.code },
      update: {},
      create: { ...u, lembagaId: lembaga.id },
    });
    units.push(unit);
    console.log(`🏢 Unit: ${unit.name}`);

    // Unit settings
    await prisma.unitSetting.upsert({
      where: { unitId: unit.id },
      update: {
        posEnabled: u.isRetail,
        inventoryEnabled: u.isRetail,
        autoApproval: false,
        requiresApproval: u.name !== "KPAK",
      },
      create: {
        unitId: unit.id,
        posEnabled: u.isRetail,
        inventoryEnabled: u.isRetail,
        autoApproval: false,
        requiresApproval: u.name === "KPAK" ? false : true,
      },
    });
  }

  // ============================================
  // 3. USERS (8 users)
  // ============================================
  const hashedPassword = await bcrypt.hash("bismillah", 12);

  const usersData = [
    {
      email: "admin@brontolano.com",
      name: "Superadmin ALBA",
      role: "SUPERADMIN" as const,
      unitCode: null,
    },
    {
      email: "pimpinan@alba.app",
      name: "Pimpinan ALBA",
      role: "PIMPINAN" as const,
      unitCode: null,
    },
    {
      email: "manager.kpak@alba.app",
      name: "Manager KPAK",
      role: "MANAGER" as const,
      unitCode: "KPK-01",
    },
    {
      email: "manager.koperasi@alba.app",
      name: "Manager Koperasi Buku",
      role: "MANAGER" as const,
      unitCode: "KOP-01",
    },
    {
      email: "manager.kantinumi@alba.app",
      name: "Manager Kantin Umi",
      role: "MANAGER" as const,
      unitCode: "KNT-01",
    },
    {
      email: "manager.kantinbaru@alba.app",
      name: "Manager Kantin Baru",
      role: "MANAGER" as const,
      unitCode: "KNT-02",
    },
    {
      email: "staff.kpak@alba.app",
      name: "Staff KPAK",
      role: "STAFF" as const,
      unitCode: "KPK-01",
    },
    {
      email: "staff.koperasi@alba.app",
      role: "STAFF" as const,
      unitCode: "KOP-01",
    },
    {
      email: "staff.kantinumi@alba.app",
      name: "Staff Kantin Umi",
      role: "STAFF" as const,
      unitCode: "KNT-01",
    },
    {
      email: "staff.kantinbaru@alba.app",
      name: "Staff Kantin Baru",
      role: "STAFF" as const,
      unitCode: "KNT-02",
    },
  ];

  const users = [];
  for (const u of usersData) {
    const unit = u.unitCode
      ? await prisma.unit.findUnique({ where: { code: u.unitCode } })
      : null;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash: hashedPassword,
        lembagaId: lembaga.id,
        unitId: unit?.id || null,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: hashedPassword,
        lembagaId: lembaga.id,
        unitId: unit?.id || null,
      },
    });
    users.push(user);
    console.log(`👤 User: ${user.email} (${user.role})`);
  }

  // ============================================
  // 4. FINANCIAL CATEGORIES (12 kategori)
  // ============================================
  const categoriesData = [
    // Income
    {
      name: "Pemasukan Administrasi",
      code: "INC-ADM",
      type: "INCOME" as const,
    },
    { name: "Tabungan Santri", code: "INC-TAB", type: "INCOME" as const },
    { name: "Penjualan Barang", code: "INC-PEN", type: "INCOME" as const },
    { name: "Donasi", code: "INC-DON", type: "INCOME" as const },
    {
      name: "SPP & Biaya Pendidikan",
      code: "INC-SPP",
      type: "INCOME" as const,
    },
    { name: "Pendapatan Koperasi", code: "INC-KOP", type: "INCOME" as const },
    // Expense
    {
      name: "Pengeluaran Operasional",
      code: "EXP-OPR",
      type: "EXPENSE" as const,
    },
    { name: "Pembelian Barang", code: "EXP-BEL", type: "EXPENSE" as const },
    { name: "Gaji Karyawan", code: "EXP-GAJ", type: "EXPENSE" as const },
    { name: "Listrik & Air", code: "EXP-LST", type: "EXPENSE" as const },
    { name: "Pemeliharaan", code: "EXP-PEM", type: "EXPENSE" as const },
    { name: "Pembelian Bahan Baku", code: "EXP-BAH", type: "EXPENSE" as const },
    // Kategori khusus unit; kategori tanpa unit di atas tetap untuk lembaga/pimpinan.
    {
      name: "Penerimaan Kas KPAK",
      code: "KPK-INC-KAS",
      type: "INCOME" as const,
      unitCode: "KPK-01",
    },
    {
      name: "ATK dan Administrasi KPAK",
      code: "KPK-EXP-ATK",
      type: "EXPENSE" as const,
      unitCode: "KPK-01",
    },
    {
      name: "Penjualan Buku Koperasi",
      code: "KOP-INC-BUKU",
      type: "INCOME" as const,
      unitCode: "KOP-01",
    },
    {
      name: "Pembelian Stok Koperasi",
      code: "KOP-EXP-STOK",
      type: "EXPENSE" as const,
      unitCode: "KOP-01",
    },
    {
      name: "Penjualan Kantin Umi",
      code: "KNT1-INC-JUAL",
      type: "INCOME" as const,
      unitCode: "KNT-01",
    },
    {
      name: "Bahan Baku Kantin Umi",
      code: "KNT1-EXP-BAHAN",
      type: "EXPENSE" as const,
      unitCode: "KNT-01",
    },
    {
      name: "Penjualan Kantin Baru",
      code: "KNT2-INC-JUAL",
      type: "INCOME" as const,
      unitCode: "KNT-02",
    },
    {
      name: "Bahan Baku Kantin Baru",
      code: "KNT2-EXP-BAHAN",
      type: "EXPENSE" as const,
      unitCode: "KNT-02",
    },
  ];

  const categories = [];
  for (const c of categoriesData) {
    const categoryUnit = c.unitCode
      ? units.find((unit) => unit.code === c.unitCode)
      : null;
    const cat = await prisma.financialCategory.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        type: c.type,
        lembagaId: lembaga.id,
        unitId: categoryUnit?.id ?? null,
      },
      create: {
        name: c.name,
        code: c.code,
        type: c.type,
        lembagaId: lembaga.id,
        unitId: categoryUnit?.id ?? null,
      },
    });
    categories.push(cat);
  }
  console.log(`📊 ${categories.length} kategori keuangan`);

  // ============================================
  // 5. BANK ACCOUNTS (2 per unit)
  // ============================================
  const bankAccountsData = [
    // KPAK
    {
      name: "Kas KPAK",
      code: "ACC-KPK-KAS",
      type: "CASH" as const,
      unitCode: "KPK-01",
      balance: 50000000,
    },
    {
      name: "Bank BSI KPAK",
      code: "ACC-KPK-BSI",
      type: "BANK" as const,
      unitCode: "KPK-01",
      balance: 125000000,
    },
    // Koperasi
    {
      name: "Kas Koperasi",
      code: "ACC-KOP-KAS",
      type: "CASH" as const,
      unitCode: "KOP-01",
      balance: 8500000,
    },
    {
      name: "Bank Mandiri Koperasi",
      code: "ACC-KOP-MDR",
      type: "BANK" as const,
      unitCode: "KOP-01",
      balance: 32000000,
    },
    // Kantin Umi
    {
      name: "Kas Kantin Umi",
      code: "ACC-KNT1-KAS",
      type: "CASH" as const,
      unitCode: "KNT-01",
      balance: 2500000,
    },
    {
      name: "GoPay Kantin Umi",
      code: "ACC-KNT1-GOP",
      type: "E_WALLET" as const,
      unitCode: "KNT-01",
      balance: 1800000,
    },
    // Kantin Baru
    {
      name: "Kas Kantin Baru",
      code: "ACC-KNT2-KAS",
      type: "CASH" as const,
      unitCode: "KNT-02",
      balance: 3200000,
    },
    {
      name: "OVO Kantin Baru",
      code: "ACC-KNT2-OVO",
      type: "E_WALLET" as const,
      unitCode: "KNT-02",
      balance: 2100000,
    },
  ];

  const bankAccounts = [];
  for (const a of bankAccountsData) {
    const unit = await prisma.unit.findUnique({ where: { code: a.unitCode } });
    const account = await prisma.bankAccount.upsert({
      where: { code: a.code },
      update: {},
      create: {
        name: a.name,
        code: a.code,
        type: a.type,
        balance: a.balance,
        unitId: unit!.id,
      },
    });
    bankAccounts.push(account);
  }
  console.log(`🏦 ${bankAccounts.length} akun bank`);

  // ============================================
  // 6. TRANSAKSI (30+ transaksi berbagai tanggal)
  // ============================================
  // Hapus dummy lama
  await prisma.transaction.deleteMany({
    where: { description: { startsWith: "[DUMMY]" } },
  });

  const superadmin = users.find((u) => u.role === "SUPERADMIN")!;
  const pimpinan = users.find((u) => u.role === "PIMPINAN")!;
  const managerKpk = users.find((u) => u.email === "manager.kpak@alba.app")!;
  const managerKoperasi = users.find(
    (u) => u.email === "manager.koperasi@alba.app",
  )!;
  const managerKantin1 = users.find(
    (u) => u.email === "manager.kantinumi@alba.app",
  )!;
  const managerKantin2 = users.find(
    (u) => u.email === "manager.kantinbaru@alba.app",
  )!;
  const staffKantin = users.find(
    (u) => u.email === "staff.kantinumi@alba.app",
  )!;
  const staffKantinBaru = users.find(
    (u) => u.email === "staff.kantinbaru@alba.app",
  )!;
  const staffKoperasi = users.find(
    (u) => u.email === "staff.koperasi@alba.app",
  )!;

  const unitKpk = units.find((u) => u.code === "KPK-01")!;
  const unitKop = units.find((u) => u.code === "KOP-01")!;
  const unitKnt1 = units.find((u) => u.code === "KNT-01")!;
  const unitKnt2 = units.find((u) => u.code === "KNT-02")!;

  const catIncomeAdmin = categories.find((c) => c.code === "INC-ADM")!;
  const catIncomeTabungan = categories.find((c) => c.code === "INC-TAB")!;
  const catIncomePenjualan = categories.find((c) => c.code === "INC-PEN")!;
  const catIncomeDonasi = categories.find((c) => c.code === "INC-DON")!;
  const catIncomeSPP = categories.find((c) => c.code === "INC-SPP")!;
  const catIncomeKoperasi = categories.find((c) => c.code === "INC-KOP")!;
  const catExpenseOp = categories.find((c) => c.code === "EXP-OPR")!;
  const catExpenseBeli = categories.find((c) => c.code === "EXP-BEL")!;
  const catExpenseGaji = categories.find((c) => c.code === "EXP-GAJ")!;
  const catExpenseListrik = categories.find((c) => c.code === "EXP-LST")!;
  const catExpensePemeliharaan = categories.find((c) => c.code === "EXP-PEM")!;
  const catExpenseBahan = categories.find((c) => c.code === "EXP-BAH")!;

  const accKpkKas = bankAccounts.find((a) => a.code === "ACC-KPK-KAS")!;
  const accKpkBsi = bankAccounts.find((a) => a.code === "ACC-KPK-BSI")!;
  const accKopKas = bankAccounts.find((a) => a.code === "ACC-KOP-KAS")!;
  const accKnt1Kas = bankAccounts.find((a) => a.code === "ACC-KNT1-KAS")!;
  const accKnt2Kas = bankAccounts.find((a) => a.code === "ACC-KNT2-KAS")!;

  const transactionsData = [
    // === KPAK - Transaksi 7 hari terakhir ===
    {
      unit: unitKpk,
      user: managerKpk,
      cat: catIncomeTabungan,
      type: "INCOME",
      amount: 5000000,
      desc: "[DUMMY] Setoran tabungan santri - Uang pangkal",
      status: "APPROVED",
      daysBack: 0,
      acc: accKpkBsi,
    },
    {
      unit: unitKpk,
      user: managerKpk,
      cat: catIncomeAdmin,
      type: "INCOME",
      amount: 1500000,
      desc: "[DUMMY] Pembayaran administrasi pendaftaran",
      status: "APPROVED",
      daysBack: 0,
      acc: accKpkKas,
    },
    {
      unit: unitKpk,
      user: managerKpk,
      cat: catIncomeSPP,
      type: "INCOME",
      amount: 12000000,
      desc: "[DUMMY] Pembayaran SPP bulan September",
      status: "APPROVED",
      daysBack: 1,
      acc: accKpkBsi,
    },
    {
      unit: unitKpk,
      user: managerKpk,
      cat: catIncomeTabungan,
      type: "INCOME",
      amount: 3000000,
      desc: "[DUMMY] Setoran tabungan santri - Mingguan",
      status: "APPROVED",
      daysBack: 2,
      acc: accKpkBsi,
    },
    {
      unit: unitKpk,
      user: managerKpk,
      cat: catExpenseGaji,
      type: "EXPENSE",
      amount: 8500000,
      desc: "[DUMMY] Gaji staf KPAK (3 orang)",
      status: "APPROVED",
      daysBack: 3,
      acc: accKpkBsi,
    },
    {
      unit: unitKpk,
      user: managerKpk,
      cat: catExpenseListrik,
      type: "EXPENSE",
      amount: 2500000,
      desc: "[DUMMY] Pembayaran listrik bulanan KPAK",
      status: "APPROVED",
      daysBack: 5,
      acc: accKpkBsi,
    },
    {
      unit: unitKpk,
      user: managerKpk,
      cat: catIncomeAdmin,
      type: "INCOME",
      amount: 800000,
      desc: "[DUMMY] Pembayaran administrasi ujian",
      status: "PENDING",
      daysBack: 0,
      acc: accKpkKas,
    },
    {
      unit: unitKpk,
      user: managerKpk,
      cat: catExpenseOp,
      type: "EXPENSE",
      amount: 450000,
      desc: "[DUMMY] Pembelian ATK dan perlengkapan kantor",
      status: "PENDING",
      daysBack: 0,
      acc: accKpkKas,
    },

    // === KOPERASI ===
    {
      unit: unitKop,
      user: managerKoperasi,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 750000,
      desc: "[DUMMY] Penjualan buku pelajaran",
      status: "APPROVED",
      daysBack: 0,
      acc: accKopKas,
    },
    {
      unit: unitKop,
      user: managerKoperasi,
      cat: catExpenseBeli,
      type: "EXPENSE",
      amount: 300000,
      desc: "[DUMMY] Pembelian buku dari penerbit",
      status: "APPROVED",
      daysBack: 1,
      acc: accKopKas,
    },
    {
      unit: unitKop,
      user: staffKoperasi,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 520000,
      desc: "[DUMMY] Penjualan alat tulis",
      status: "APPROVED",
      daysBack: 2,
      acc: accKopKas,
    },
    {
      unit: unitKop,
      user: managerKoperasi,
      cat: catIncomeKoperasi,
      type: "INCOME",
      amount: 1200000,
      desc: "[DUMMY] Pendapatan simpan pinjam",
      status: "APPROVED",
      daysBack: 3,
      acc: accKopKas,
    },
    {
      unit: unitKop,
      user: managerKoperasi,
      cat: catExpenseGaji,
      type: "EXPENSE",
      amount: 4000000,
      desc: "[DUMMY] Gaji pegawai koperasi (2 orang)",
      status: "APPROVED",
      daysBack: 4,
      acc: accKopKas,
    },
    {
      unit: unitKop,
      user: staffKoperasi,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 380000,
      desc: "[DUMMY] Penjualan seragam sekolah",
      status: "PENDING",
      daysBack: 0,
      acc: accKopKas,
    },
    {
      unit: unitKop,
      user: managerKoperasi,
      cat: catExpensePemeliharaan,
      type: "EXPENSE",
      amount: 150000,
      desc: "[DUMMY] Perbaikan rak display",
      status: "REJECTED",
      daysBack: 2,
      acc: accKopKas,
    },

    // === KANTIN UMI ===
    {
      unit: unitKnt1,
      user: staffKantin,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 420000,
      desc: "[DUMMY] Penjualan nasi goreng & mie goreng",
      status: "APPROVED",
      daysBack: 0,
      acc: accKnt1Kas,
    },
    {
      unit: unitKnt1,
      user: staffKantin,
      cat: catExpenseBahan,
      type: "EXPENSE",
      amount: 180000,
      desc: "[DUMMY] Pembelian bahan baku masak",
      status: "APPROVED",
      daysBack: 0,
      acc: accKnt1Kas,
    },
    {
      unit: unitKnt1,
      user: managerKantin1,
      cat: catExpenseGaji,
      type: "EXPENSE",
      amount: 2000000,
      desc: "[DUMMY] Gaji karyawan kantin umi (2 orang)",
      status: "APPROVED",
      daysBack: 5,
      acc: accKnt1Kas,
    },
    {
      unit: unitKnt1,
      user: staffKantin,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 380000,
      desc: "[DUMMY] Penjualan minuman & jajanan",
      status: "APPROVED",
      daysBack: 1,
      acc: accKnt1Kas,
    },
    {
      unit: unitKnt1,
      user: staffKantin,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 510000,
      desc: "[DUMMY] Penjualan paket makan siang",
      status: "APPROVED",
      daysBack: 2,
      acc: accKnt1Kas,
    },
    {
      unit: unitKnt1,
      user: managerKantin1,
      cat: catExpenseBahan,
      type: "EXPENSE",
      amount: 250000,
      desc: "[DUMMY] Restok bumbu dan bahan dapur",
      status: "APPROVED",
      daysBack: 3,
      acc: accKnt1Kas,
    },
    {
      unit: unitKnt1,
      user: staffKantin,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 290000,
      desc: "[DUMMY] Penjualan sore hari",
      status: "PENDING",
      daysBack: 0,
      acc: accKnt1Kas,
    },
    {
      unit: unitKnt1,
      user: managerKantin1,
      cat: catExpenseOp,
      type: "EXPENSE",
      amount: 350000,
      desc: "[DUMMY] Pembelian gas dan minyak goreng",
      status: "PENDING",
      daysBack: 0,
      acc: accKnt1Kas,
    },

    // === KANTIN BARU ===
    {
      unit: unitKnt2,
      user: staffKantinBaru,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 510000,
      desc: "[DUMMY] Penjualan menu kantin baru",
      status: "APPROVED",
      daysBack: 0,
      acc: accKnt2Kas,
    },
    {
      unit: unitKnt2,
      user: staffKantinBaru,
      cat: catExpenseBahan,
      type: "EXPENSE",
      amount: 220000,
      desc: "[DUMMY] Pembelian bahan dan minuman",
      status: "APPROVED",
      daysBack: 0,
      acc: accKnt2Kas,
    },
    {
      unit: unitKnt2,
      user: managerKantin2,
      cat: catExpenseGaji,
      type: "EXPENSE",
      amount: 2500000,
      desc: "[DUMMY] Gaji karyawan kantin baru (3 orang)",
      status: "APPROVED",
      daysBack: 6,
      acc: accKnt2Kas,
    },
    {
      unit: unitKnt2,
      user: staffKantinBaru,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 680000,
      desc: "[DUMMY] Penjualan package sarapan",
      status: "APPROVED",
      daysBack: 1,
      acc: accKnt2Kas,
    },
    {
      unit: unitKnt2,
      user: staffKantinBaru,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 440000,
      desc: "[DUMMY] Penjualan es dan snack",
      status: "APPROVED",
      daysBack: 2,
      acc: accKnt2Kas,
    },
    {
      unit: unitKnt2,
      user: managerKantin2,
      cat: catExpenseBahan,
      type: "EXPENSE",
      amount: 380000,
      desc: "[DUMMY] Restok frozen food",
      status: "APPROVED",
      daysBack: 3,
      acc: accKnt2Kas,
    },
    {
      unit: unitKnt2,
      user: managerKantin2,
      cat: catExpenseListrik,
      type: "EXPENSE",
      amount: 800000,
      desc: "[DUMMY] Pembayaran listrik kantin baru",
      status: "APPROVED",
      daysBack: 7,
      acc: accKnt2Kas,
    },
    {
      unit: unitKnt2,
      user: staffKantinBaru,
      cat: catIncomePenjualan,
      type: "INCOME",
      amount: 350000,
      desc: "[DUMMY] Penjualan hari Minggu",
      status: "PENDING",
      daysBack: 0,
      acc: accKnt2Kas,
    },
    {
      unit: unitKnt2,
      user: managerKantin2,
      cat: catExpenseOp,
      type: "EXPENSE",
      amount: 200000,
      desc: "[DUMMY] Pembelian kantong plastik dan tissue",
      status: "PENDING",
      daysBack: 0,
      acc: accKnt2Kas,
    },

    // === TRANSFER antar unit ===
    {
      unit: unitKpk,
      user: pimpinan,
      cat: catIncomeDonasi,
      type: "INCOME",
      amount: 10000000,
      desc: "[DUMMY] Donasi dari yayasan untuk operasional",
      status: "APPROVED",
      daysBack: 2,
      acc: accKpkBsi,
    },
    {
      unit: unitKpk,
      user: pimpinan,
      cat: catExpenseOp,
      type: "EXPENSE",
      amount: 5000000,
      desc: "[DUMMY] Pengalokasian dana operasional ke kantin",
      status: "APPROVED",
      daysBack: 1,
      acc: accKpkBsi,
    },
  ];

  const createdTransactions = [];
  for (const t of transactionsData) {
    const tx = await prisma.transaction.create({
      data: {
        unitId: t.unit.id,
        type: t.type as any,
        amount: t.amount,
        description: t.desc.replace("[DUMMY] ", ""),
        reference: t.desc,
        date: randomDate(t.daysBack),
        status: t.status as any,
        paymentMethod: "CASH",
        createdById: t.user.id,
        categoryId: t.cat.id,
        accountId: t.acc.id,
        approvedById: t.status === "APPROVED" ? t.user.id : null,
        approvedAt: t.status === "APPROVED" ? randomDate(t.daysBack) : null,
      },
    });
    createdTransactions.push(tx);
  }
  console.log(`💸 ${createdTransactions.length} transaksi`);

  // ============================================
  // 7. APPROVALS
  // ============================================
  const pendingTransactions = createdTransactions.filter(
    (t) => t.status === "PENDING",
  );
  for (const tx of pendingTransactions) {
    const approver =
      tx.createdById === staffKantin.id ? managerKantin1 : managerKoperasi;
    await prisma.approval.create({
      data: {
        transactionId: tx.id,
        unitId: tx.unitId,
        approverId: approver.id,
        status: "PENDING",
      },
    });
  }
  console.log(`✅ ${pendingTransactions.length} approvals pending`);

  // ============================================
  // 8. FINANCIAL NOTES
  // ============================================
  const financialNotesData = [
    {
      title: "Rekap Pemasukan Harian",
      desc: "Total pemasukan harian gabungan dari seluruh unit",
      amount: 2435000,
      type: "INCOME",
      userId: pimpinan.id,
      daysBack: 0,
    },
    {
      title: "Catatan Pengeluaran Gaji",
      desc: "Rekap gaji karyawan seluruh unit bulan ini",
      amount: 17000000,
      type: "EXPENSE",
      userId: pimpinan.id,
      daysBack: 1,
    },
    {
      title: "Laporan SPP September",
      desc: "Pembayaran SPP santri bulan September",
      amount: 12000000,
      type: "INCOME",
      userId: managerKpk.id,
      daysBack: 2,
    },
    {
      title: "Catatan Donasi Yayasan",
      desc: "Donasi dari yayasan untuk operasional pondok",
      amount: 10000000,
      type: "INCOME",
      userId: pimpinan.id,
      daysBack: 3,
    },
    {
      title: "Pengeluaran Listrik & Air",
      desc: "Rekap pembayaran utilitas seluruh unit",
      amount: 3300000,
      type: "EXPENSE",
      userId: managerKpk.id,
      daysBack: 5,
    },
    {
      title: "Laporan Penjualan Kantin",
      desc: "Total penjualan kantin Umi dan Kantin Baru",
      amount: 3570000,
      type: "INCOME",
      userId: managerKantin1.id,
      daysBack: 1,
    },
    {
      title: "Catatan Pembelian Bahan Baku",
      desc: "Pembelian bahan baku kantin minggu ini",
      amount: 810000,
      type: "EXPENSE",
      userId: managerKantin1.id,
      daysBack: 4,
    },
    {
      title: "Laporan Koperasi Bulanan",
      desc: "Ringkasan pendapatan koperasi buku",
      amount: 2470000,
      type: "INCOME",
      userId: managerKoperasi.id,
      daysBack: 7,
    },
  ];

  for (const n of financialNotesData) {
    await prisma.financialNote.create({
      data: {
        title: n.title,
        description: n.desc,
        amount: n.amount,
        type: n.type as any,
        date: randomDate(n.daysBack),
        createdById: n.userId,
        isReconciled: Math.random() > 0.5,
      },
    });
  }
  console.log(`📝 ${financialNotesData.length} catatan keuangan`);

  // ============================================
  // 9. INVENTORY ITEMS
  // ============================================
  const retailUnits = units.filter((u) => u.isRetail);
  const inventoryItemsData = [
    // Kantin Umi
    {
      unitCode: "KNT-01",
      items: [
        {
          name: "Nasi Goreng",
          sku: "NG-KNT01",
          category: "Makanan",
          stock: 100,
          minStock: 10,
          price: 15000,
          purchase: 10000,
        },
        {
          name: "Mie Goreng",
          sku: "MG-KNT01",
          category: "Makanan",
          stock: 80,
          minStock: 15,
          price: 13000,
          purchase: 9000,
        },
        {
          name: "Es Teh Manis",
          sku: "ET-KNT01",
          category: "Minuman",
          stock: 150,
          minStock: 20,
          price: 8000,
          purchase: 5000,
        },
        {
          name: "Air Mineral",
          sku: "AM-KNT01",
          category: "Minuman",
          stock: 200,
          minStock: 30,
          price: 5000,
          purchase: 3000,
        },
        {
          name: "Bubur Ayam",
          sku: "BA-KNT01",
          category: "Makanan",
          stock: 60,
          minStock: 8,
          price: 12000,
          purchase: 8000,
        },
        {
          name: "Kopi Susu",
          sku: "KS-KNT01",
          category: "Minuman",
          stock: 90,
          minStock: 15,
          price: 10000,
          purchase: 6000,
        },
        {
          name: "Roti Bakar",
          sku: "RB-KNT01",
          category: "Makanan",
          stock: 50,
          minStock: 10,
          price: 8000,
          purchase: 5000,
        },
        {
          name: "Jus Jeruk",
          sku: "JJ-KNT01",
          category: "Minuman",
          stock: 70,
          minStock: 10,
          price: 10000,
          purchase: 6000,
        },
      ],
    },
    // Kantin Baru
    {
      unitCode: "KNT-02",
      items: [
        {
          name: "Nasi Uduk",
          sku: "NU-KNT02",
          category: "Makanan",
          stock: 90,
          minStock: 10,
          price: 12000,
          purchase: 8000,
        },
        {
          name: "Mie Ayam",
          sku: "MA-KNT02",
          category: "Makanan",
          stock: 75,
          minStock: 12,
          price: 14000,
          purchase: 9500,
        },
        {
          name: "Es Campur",
          sku: "EC-KNT02",
          category: "Minuman",
          stock: 120,
          minStock: 20,
          price: 10000,
          purchase: 6000,
        },
        {
          name: "Teh Tawar",
          sku: "TT-KNT02",
          category: "Minuman",
          stock: 180,
          minStock: 25,
          price: 3000,
          purchase: 1500,
        },
        {
          name: "Ayam Goreng",
          sku: "AG-KNT02",
          category: "Makanan",
          stock: 60,
          minStock: 10,
          price: 18000,
          purchase: 12000,
        },
        {
          name: "Soto Ayam",
          sku: "SA-KNT02",
          category: "Makanan",
          stock: 55,
          minStock: 8,
          price: 15000,
          purchase: 10000,
        },
        {
          name: "Es Kelapa",
          sku: "EK-KNT02",
          category: "Minuman",
          stock: 40,
          minStock: 10,
          price: 8000,
          purchase: 5000,
        },
      ],
    },
    // Koperasi
    {
      unitCode: "KOP-01",
      items: [
        {
          name: "Buku Tulis",
          sku: "BT-KOP01",
          category: "Alat Tulis",
          stock: 300,
          minStock: 50,
          price: 5000,
          purchase: 3000,
        },
        {
          name: "Pensil 2B",
          sku: "P2B-KOP01",
          category: "Alat Tulis",
          stock: 200,
          minStock: 30,
          price: 3000,
          purchase: 1500,
        },
        {
          name: "Penggaris",
          sku: "PG-KOP01",
          category: "Alat Tulis",
          stock: 150,
          minStock: 20,
          price: 4000,
          purchase: 2000,
        },
        {
          name: "Seragam Putih",
          sku: "SP-KOP01",
          category: "Seragam",
          stock: 80,
          minStock: 15,
          price: 65000,
          purchase: 45000,
        },
        {
          name: "Seragam Batik",
          sku: "SB-KOP01",
          category: "Seragam",
          stock: 60,
          minStock: 10,
          price: 75000,
          purchase: 50000,
        },
        {
          name: "Tas Sekolah",
          sku: "TS-KOP01",
          category: "Aksesoris",
          stock: 40,
          minStock: 8,
          price: 120000,
          purchase: 80000,
        },
      ],
    },
  ];

  let totalInventory = 0;
  for (const group of inventoryItemsData) {
    const unit = units.find((u) => u.code === group.unitCode)!;
    for (const item of group.items) {
      await prisma.inventoryItem.upsert({
        where: { sku: item.sku },
        update: {},
        create: {
          unitId: unit.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          currentStock: item.stock,
          minStock: item.minStock,
          unitPrice: item.price,
          purchasePrice: item.purchase,
        },
      });
      totalInventory++;
    }
  }
  console.log(`📦 ${totalInventory} item inventori`);

  // ============================================
  // 10. NOTIFICATIONS
  // ============================================
  const notificationsData = [
    {
      userId: managerKantin1.id,
      title: "Transaksi Menunggu Persetujuan",
      message: "Ada 2 transaksi baru dari staff kantin yang perlu disetujui",
      type: "WARNING" as const,
    },
    {
      userId: managerKoperasi.id,
      title: "Stok Menipis",
      message: "Buku Tulis di koperasi stoknya sudah di bawah minimum",
      type: "WARNING" as const,
    },
    {
      userId: pimpinan.id,
      title: "Laporan Harian Siap",
      message: "Laporan keuangan harian untuk tanggal hari ini sudah tersedia",
      type: "INFO" as const,
    },
    {
      userId: superadmin.id,
      title: "Backup Database",
      message: "Backup otomatis database berhasil dilakukan",
      type: "SUCCESS" as const,
    },
    {
      userId: staffKantin.id,
      title: "Transaksi Disetujui",
      message: "Transaksi penjualan nasi goreng sudah disetujui manager",
      type: "SUCCESS" as const,
    },
    {
      userId: managerKantin2.id,
      title: "Pengeluaran Baru",
      message: "Ada pengeluaran pembelian bahan baku yang perlu direview",
      type: "INFO" as const,
    },
    {
      userId: managerKpk.id,
      title: "SPP Tertunggak",
      message: "Ada 5 santri yang belum membayar SPP bulan ini",
      type: "WARNING" as const,
    },
    {
      userId: pimpinan.id,
      title: "Pendapatan Bulanan",
      message: "Total pendapatan bulan ini mencapai 85% dari target",
      type: "SUCCESS" as const,
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }
  console.log(`🔔 ${notificationsData.length} notifikasi`);

  // ============================================
  // 11. BROADCAST MESSAGES
  // ============================================
  const broadcastsData = [
    {
      title: "Pengumuman Libur Nasional",
      message:
        "Yayasan menginformasikan bahwa tanggal 17 Agustus seluruh unit libur nasional",
      type: "INFO",
      priority: "NORMAL",
      status: "SENT",
      userId: superadmin.id,
    },
    {
      title: "Penting: Perubahan Jam Operasional",
      message:
        "Mulai bulan depan, jam operasional kantin berubah menjadi 06.00 - 14.00",
      type: "INFO",
      priority: "HIGH",
      status: "SENT",
      userId: pimpinan.id,
    },
    {
      title: "Laporan Keuangan Bulanan",
      message:
        "Harap semua manager mengirimkan laporan keuangan bulanan sebelum tanggal 5",
      type: "INFO",
      priority: "NORMAL",
      status: "SENT",
      userId: superadmin.id,
    },
    {
      title: "Maintenance Sistem",
      message:
        "Sistem akan maintenance pada hari Sabtu pukul 22.00 - 02.00 WIB",
      type: "WARNING",
      priority: "HIGH",
      status: "DRAFT",
      userId: superadmin.id,
    },
  ];

  for (const b of broadcastsData) {
    await prisma.broadcastMessage.create({
      data: {
        title: b.title,
        message: b.message,
        type: b.type,
        priority: b.priority,
        status: b.status as any,
        isDraft: b.status === "DRAFT",
        isSent: b.status === "SENT",
        senderId: b.userId,
        lembagaId: lembaga.id,
      },
    });
  }
  console.log(`📢 ${broadcastsData.length} broadcast`);

  // ============================================
  // 12. SYSTEM SETTINGS
  // ============================================
  const settingsData = [
    { key: "app_name", value: "ALBA Finance", description: "Nama aplikasi" },
    {
      key: "app_description",
      value: "Sistem Manajemen Keuangan Pondok Pesantren",
      description: "Deskripsi aplikasi",
    },
    { key: "currency", value: "IDR", description: "Mata uang" },
    { key: "timezone", value: "Asia/Jakarta", description: "Zona waktu" },
    { key: "theme", value: "light", description: "Tema aplikasi" },
    { key: "primary_color", value: "#10b981", description: "Warna utama" },
    { key: "compact_mode", value: "false", description: "Mode kompak" },
    {
      key: "email_notifications",
      value: "true",
      description: "Notifikasi email",
    },
    {
      key: "push_notifications",
      value: "true",
      description: "Notifikasi push",
    },
    {
      key: "in_app_notifications",
      value: "true",
      description: "Notifikasi in-app",
    },
    {
      key: "session_timeout",
      value: "1800",
      description: "Timeout sesi (detik)",
    },
    { key: "enable_2fa", value: "false", description: "2FA aktif" },
  ];

  for (const s of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`⚙️  ${settingsData.length} system settings`);

  // ============================================
  // 13. AUDIT LOGS
  // ============================================
  const auditActions = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];
  const entities = [
    "Transaction",
    "User",
    "Unit",
    "InventoryItem",
    "FinancialNote",
  ];

  for (let i = 0; i < 20; i++) {
    const cuid = `audit_${Date.now()}_${i}`;
    await prisma.audit_logs.create({
      data: {
        id: cuid,
        userId: users[Math.floor(Math.random() * users.length)].id,
        action: auditActions[Math.floor(Math.random() * auditActions.length)],
        entity: entities[Math.floor(Math.random() * entities.length)],
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        createdAt: randomDate(14),
      },
    });
  }
  console.log("📋 20 audit logs");

  console.log("\n✅ Seed completed successfully!");
  console.log("📊 Summary:");
  console.log("   - 1 Lembaga");
  console.log(`   - ${units.length} Units`);
  console.log(`   - ${users.length} Users`);
  console.log(`   - ${categories.length} Categories`);
  console.log(`   - ${bankAccounts.length} Bank Accounts`);
  console.log(`   - ${createdTransactions.length} Transactions`);
  console.log(`   - ${pendingTransactions.length} Pending Approvals`);
  console.log(`   - ${financialNotesData.length} Financial Notes`);
  console.log(`   - ${totalInventory} Inventory Items`);
  console.log(`   - ${notificationsData.length} Notifications`);
  console.log(`   - ${broadcastsData.length} Broadcasts`);
  console.log(`   - ${settingsData.length} System Settings`);
  console.log("   - 20 Audit Logs");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
