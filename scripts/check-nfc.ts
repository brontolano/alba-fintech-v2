import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nfcList = await prisma.nfc.findMany({
    select: { id: true, uid: true, santriId: true, status: true, createdAt: true },
  });
  console.log('=== NFC records ===');
  for (const n of nfcList) {
    console.log(n);
  }
  const santriList = await prisma.santri.findMany({
    select: { id: true, name: true, cardUid: true },
  });
  console.log('=== Santris ===');
  for (const s of santriList) {
    console.log(s);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
