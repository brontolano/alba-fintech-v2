import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const pembayaran = await prisma.pembayaran.create({
      data: {
        tagihanId: 'cmv31brhk000f12wbr6d6kjjm',
        santriId: 'santri-sample',
        user_id: 'superadmin',
        nominal: 250000,
        tanggal: new Date('2025-09-01'),
        buktiUrl: 'http://example.com/bukti.jpg',
        tipe: 'UANG',
        keterangan: 'Test payment',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('Created pembayaran:', pembayaran);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
