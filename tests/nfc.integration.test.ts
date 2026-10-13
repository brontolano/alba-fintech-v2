import { PrismaClient } from '@prisma/client';
import { importNfc, findSantriByUid } from '../lib/nfc.service';

// Set environment variable for Prisma client
process.env.DATABASE_URL = 'file:./dev.db';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Test 1: Import NFC without Santri mapping ===');
  const uid1 = 'AA:BB:CC:DD:EE:FF:00:11';
  const result1 = await importNfc({ uid: uid1, mode: 'scan' });
  console.log('Result:', result1);
  const count1 = await prisma.nfc.count({ where: { uid: uid1.replace(/:/g, '').toUpperCase() } });
  console.log('NFC count after import:', count1);
  if (count1 !== 1) {
    console.error('FAIL: NFC not created');
    process.exit(1);
  }
  const nfcRecord = await prisma.nfc.findUnique({ where: { uid: uid1.replace(/:/g, '').toUpperCase() } });
  const logCount1 = await prisma.nfcLog.count({ where: { nfcId: nfcRecord?.id } });
  console.log('NFC log entries after import:', logCount1);
  if (logCount1 !== 1) {
    console.error('FAIL: NfcLog entry missing');
    process.exit(1);
  }

  console.log('\n=== Test 2: Update existing Santri NFC ===');
  const santriId = 'santri-sample';
  // The sample Santri already has an NFC with UID 'AF:C2:99:E7:13:08:04:00:62:63:64:65:66:67:68:69'
  const newUid = '11:22:33:44:55:66:77:88';
  const result2 = await importNfc({ uid: newUid, mode: 'scan', santriId });
  console.log('Result:', result2);
  const updatedNfc = await prisma.nfc.findFirst({ where: { santriId: santriId } });
  console.log('Updated NFC:', updatedNfc);
  if (!updatedNfc || updatedNfc.uid !== newUid.replace(/:/g, '').toUpperCase()) {
    console.error('FAIL: NFC not updated for Santri');
    process.exit(1);
  }
  const santri = await prisma.santri.findUnique({ where: { id: santriId }, select: { cardUid: true } });
  console.log('Santri cardUid:', santri?.cardUid);
  if (santri?.cardUid !== newUid.replace(/:/g, '').toUpperCase()) {
    console.error('FAIL: Santri cardUid not updated');
    process.exit(1);
  }

  console.log('\n=== Test 3: Find Santri by cardUid (should be null because sample Santri has no cardUid) ===');
  const found = await findSantriByUid('AA:BB:CC:DD:EE:FF:00:11');
  console.log('Found Santri id:', found);
  if (found !== null) {
    console.error('FAIL: Expected null');
    process.exit(1);
  }

  console.log('\nAll tests passed.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
