import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const payment = await prisma.pembayaran.updateMany({
    where: { id: 'cmv37p3o10001urc52kpayr35' },
    data: { status: 'LUNAS' },
  });
  console.log('Updated payments:', payment);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
