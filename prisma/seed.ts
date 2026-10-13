import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Default Unit: KPAK
  const unit = await prisma.unit.upsert({
    where: { id: 'kpa-unit' },
    create: {
      id: 'kpa-unit',
      name: 'Kantor Pelayanan Administrasi Keuangan',
      code: 'KPAK-UNIT',
      description: 'Kantor Pelayanan Administrasi Keuangan (KPAK) - Unit Utama',
      isActive: true,
      type: 'KPAK',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: { updatedAt: new Date() },
  });
  console.log(`Created Unit: ${unit.name} (id: ${unit.id})`);

  // Default User: Superadmin
  const user = await prisma.user.upsert({
    where: { id: 'superadmin' },
    create: {
      id: 'superadmin',
      email: 'admin@alba.local',
      name: 'Superadmin',
      passwordHash: '$2a$10$examplehashfortestingonly', // placeholder
      role: 'SUPERADMIN',
      unitId: 'kpa-unit',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: { updatedAt: new Date() },
  });
  console.log(`Created User: ${user.name} (id: ${user.id})`);

  // Sample Santri
  const santri = await prisma.santri.upsert({
    where: { id: 'santri-sample' },
    create: {
      id: 'santri-sample',
      studentNumber: '20250001',
      name: 'Budi Santri',
      className: 'VII',
      isActive: true,
      unitId: 'kpa-unit',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: { updatedAt: new Date() },
  });
  console.log(`Created Santri: ${santri.name} (id: ${santri.id})`);

  // Optional: default NFC entry for the sample Santri
  const nfc = await prisma.nfc.upsert({
    where: { santriId: 'santri-sample' },
    create: {
      uid: 'AF:C2:99:E7:13:08:04:00:62:63:64:65:66:67:68:69',
      status: 'ACTIVE',
      santriId: 'santri-sample',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: { updatedAt: new Date() },
  });
  console.log(`Created NFC: ${nfc.uid} -> Santri ${nfc.santriId}`);

  // Helper to create a template with its items
  async function createTemplateWithItems(id: string, name: string, description: string, type: string, items: any[]) {
    const template = await prisma.tagihanTemplate.create({
      data: {
        id,
        name,
        description,
        type,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`Created TagihanTemplate: ${template.name} (id: ${template.id})`);

    const templateItems = await Promise.all(
      items.map(async (item) => {
        const created = await prisma.tagihanTemplateItem.create({
          data: {
            templateId: template.id,
            kode: item.kode,
            nama: item.nama,
            nominal: item.nominal,
            kategori: item.kategori,
            periode: item.periode,
            urutan: item.urutan,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        return created;
      })
    );
    console.log(`Created ${templateItems.length} items for template ${template.name}`);
    return template;
  }

  // Create default templates
  const tplSpp = await createTemplateWithItems('tpl-spp-bulanan', 'SPP Bulanan', 'SPP bulanan siswa', 'bulanan', [
    { kode: 'Beras', nama: 'Beras', nominal: 225000, kategori: 'pangan', periode: 'BULANAN', urutan: 1 },
    { kode: 'Fasilitas', nama: 'Fasilitas', nominal: 100000, kategori: 'fasilitas', periode: 'BULANAN', urutan: 2 },
    { kode: 'SPP', nama: 'SPP', nominal: 175000, kategori: 'uang', periode: 'BULANAN', urutan: 3 },
  ]);

  const tplDaftar = await createTemplateWithItems('tpl-daftar-ulang', 'Daftar Ulang Tahunan', 'Biaya daftar ulang tahunan', 'bulanan', [
    { kode: 'DU', nama: 'Daftar Ulang', nominal: 250000, kategori: 'lain', periode: 'TAHUNAN', urutan: 1 },
  ]);

  const tplPsb = await createTemplateWithItems('tpl-psb-satu-bayi', 'PSB Sekali Bayar', 'Pembayaran masuk sekali (PSB)', 'satu-bayi', [
    { kode: 'UangPendaftaran', nama: 'Uang Pendaftaran', nominal: 4000000, kategori: 'pendaftaran', periode: 'SATU-BAYI', urutan: 1 },
    { kode: 'UangTest', nama: 'Uang Test', nominal: 1000000, kategori: 'test', periode: 'SATU-BAYI', urutan: 2 },
  ]);

  // Create a sample Tagihan for the sample Santri using SPP template
  const tagihanSpp = await prisma.tagihan.create({
    data: {
      unitId: 'kpa-unit',
      santriId: 'santri-sample',
      templateId: tplSpp.id,
      tanggal: new Date('2025-09-01'),
      totalNilai: 500000,
      status: 'UNPAID',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`Created Tagihan: ${tagihanSpp.id} (total: ${tagihanSpp.totalNilai})`);

  // Create TagihanItem entries for the new Tagihan
  const itemData = [
    { kode: 'Beras', nama: 'Beras', nominal: 225000, kategori: 'pangan', periode: 'BULANAN', urutan: 1 },
    { kode: 'Fasilitas', nama: 'Fasilitas', nominal: 100000, kategori: 'fasilitas', periode: 'BULANAN', urutan: 2 },
    { kode: 'SPP', nama: 'SPP', nominal: 175000, kategori: 'uang', periode: 'BULANAN', urutan: 3 },
  ];

  const tagihanItems = await Promise.all(
    itemData.map(async (item) => {
      const created = await prisma.tagihanItem.create({
        data: {
          tagihanId: tagihanSpp.id,
          kode: item.kode,
          nama: item.nama,
          nominal: item.nominal,
          kategori: item.kategori,
          periode: item.periode,
          urutan: item.urutan,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return created;
    })
  );
  console.log(`Created ${tagihanItems.length} TagihanItems for Tagihan ${tagihanSpp.id}`);


  // Seed Shift
  const shift = await prisma.shift.create({
    data: {
      unitId: 'kpa-unit',
      petugasId: 'superadmin',
      tanggal: new Date('2025-09-01'),
      jamMulai: new Date('2025-09-01T07:00:00Z'),
      jamSelesai: new Date('2025-09-01T15:00:00Z'),
      jenis: 'PAGI',
      status: 'ACTIVE',
      keterangan: 'Pagi Shift',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`Created Shift: ${shift.id}`);

  // Seed Absensi
  const absensi = await prisma.absensi.create({
    data: {
      shiftId: shift.id,
      petugasId: 'superadmin',
      tanggal: new Date('2025-09-01'),
      checkIn: new Date('2025-09-01T07:05:00Z'),
      checkOut: new Date('2025-09-01T14:55:00Z'),
      status: 'HADIR',
      keterangan: 'Hadir penuh',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`Created Absensi: ${absensi.id}`);

  // Seed Rolling
  const rolling = await prisma.rolling.create({
    data: {
      unitId: 'kpa-unit',
      petugasId: 'superadmin',
      start_date: new Date('2025-09-01'),
      end_date: new Date('2025-09-30'),
      shift_type: 'PAGI',
      keterangan: 'Rolling Pagi',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log(`Created Rolling: ${rolling.id}`);

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
