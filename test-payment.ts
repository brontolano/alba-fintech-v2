import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('=== Checking Tagihan ===');
  const tagihan = await prisma.tagihan.findFirst({
    where: { id: 'cmv31uled000fw73w4po61df9' },
    include: { pembayaran: true },
  });
  console.log('Tagihan:', JSON.stringify(tagihan, null, 2));
  if (!tagihan) {
    console.error('Tagihan not found');
    process.exit(1);
  }
  console.log('=== Attempting to create a payment ===');
  try {
    const payment = await prisma.pembayaran.create({
      data: {
        tagihanId: 'cmv31uled000fw73w4po61df9',
        santriId: 'santri-sample',
        user_id: 'superadmin',
        nominal: 250000,
        tanggal: new Date('2025-09-01'),
        buktiUrl: 'http://example.com/bukti.jpg',
        tipe: 'UANG',
        keterangan: 'Test payment',
        status: 'PENDING',
      },
    });
    console.log('Payment created:', JSON.stringify(payment, null, 2));
  } catch (err) {
    console.error('Error creating payment:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
main();
