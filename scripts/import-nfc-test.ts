import { PrismaClient } from '@prisma/client';
import { importNfc } from '../lib/nfc.service';

// Set environment variable for Prisma client
process.env.DATABASE_URL = 'file:./dev.db';

const prisma = new PrismaClient();

async function main() {
  // Clean any existing test NFC entries for santri-sample to start fresh
  await prisma.nfc.deleteMany({ where: { id: { in: ['nfc-sample'] } } });
  // Actually delete all NFCs for santri-sample just in case
  await prisma.nfc.deleteMany({ where: { santriId: 'santri-sample' } });

  // Import a new NFC UID and map to the sample Santri
  const uid = '22:33:44:55:66:77:88:99';
  const result = await importNfc({
    uid,
    mode: 'manual',
    santriId: 'santri-sample',
  });
  console.log('Import result:', result);

  // Verify the NFC record was created and mapped
  const nfcRecord = await prisma.nfc.findUnique({
    where: { uid: '2233445566778899' },
  });
  console.log('NFC record in DB:', nfcRecord);

  // Verify Santri cardUid updated
  const santri = await prisma.santri.findUnique({
    where: { id: 'santri-sample' },
  });
  console.log('Santri record:', santri);

  // Verify NfcLog entry
  const logs = await prisma.nfcLog.findMany({
    where: { nfcId: nfcRecord?.id },
  });
  console.log('Logs:', logs);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
