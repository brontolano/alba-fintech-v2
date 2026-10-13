import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== NFCs ===');
  const nfc = await prisma.nfc.findMany({ select: { id: true, uid: true, santriId: true } });
  console.log(JSON.stringify(nfc, null, 2));
  console.log('=== Santris ===');
  const santri = await prisma.santri.findMany({ select: { id: true, name: true, cardUid: true } });
  console.log(JSON.stringify(santri, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
