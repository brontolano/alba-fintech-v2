import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const payload = {
    tagihanId: 'cmv1ajwku000f7fqk6ainhzkk',
    santriId: 'santri-sample',
    user_id: 'superadmin',
    nominal: 250000,
    tanggal: new Date('2025-09-01'),
    buktiUrl: 'http://example.com/bukti.jpg',
    tipe: 'UANG',
    keterangan: 'Tes pembayaran',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  try {
    const p = await prisma.pembayaran.create({ data: payload });
    console.log('Created:', p);
  } catch (e) {
    console.error('Error:', e);
    console.error('Message:', (e as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
