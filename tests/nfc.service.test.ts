import { importNfc, findSantriByUid } from '../lib/nfc.service';
import prisma from '../lib/prisma';

async function main() {
  // Test findSantriByUid
  const uid = '12:34:56:78:9A:BC:DE:F0';
  const found = await findSantriByUid(uid);
  console.log('findSantriByUid for test UID:', found);

  // Test importNfc with a new UID (no Santri mapping)
  const payload: { uid: string; mode: 'manual' | 'scan' } = {
    uid,
    mode: 'manual',
  };
  const result = await importNfc(payload);
  console.log('Import result:', result);

  // Verify that a new NFC record exists
  const count = await prisma.nfc.count();
  console.log('Total NFC records after import:', count);

  // Verify that the NFC record has the correct UID and SantriId
  const nfc = await prisma.nfc.findFirst({
    where: { uid: result.uid },
  });
  console.log('Fetched NFC record:', nfc);

  // Verify that an NfcLog entry was created
  const logs = await prisma.nfcLog.findMany({
    where: { nfcId: nfc?.id },
  });
  console.log('NfcLog entries:', logs);

  // Test duplicate import should fail
  try {
    await importNfc(payload);
    console.log('ERROR: Duplicate import should have failed');
  } catch (e: any) {
    console.log('Duplicate import correctly rejected:', e.message);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});