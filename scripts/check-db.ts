import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nfcList = await prisma.nfc.findMany({
    select: { id: true, uid: true, santriId: true, status: true },
  });
  console.log('=== NFC entries ===');
  for (const n of nfcList) {
    console.log(JSON.stringify(n));
  }
  const logs = await prisma.nfcLog.findMany({
    select: { id: true, nfcId: true, action: true, timestamp: true },
  });
  console.log('=== NfcLog entries ===');
  for (const l of logs) {
    console.log(JSON.stringify(l));
  }
}
main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
