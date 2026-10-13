import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tagihan = await prisma.tagihan.findFirst({
    where: { id: 'cmv1ajwku000f7fqk6ainhzkk' },
    include: { pembayaran: true },
  });
  if (tagihan) {
    const totalPaid = tagihan.pembayaran.reduce((sum, p) => sum + (p.nominal || 0), 0);
    console.log('Tagihan status:', tagihan.status);
    console.log('Total paid:', totalPaid);
    console.log('Total nilai:', tagihan.totalNilai);
  } else {
    console.log('Tagihan not found');
  }
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
