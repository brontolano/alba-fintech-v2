import { PrismaClient } from '@prisma/client';
import { importNfc, findSantriByUid } from './lib/nfc.service';

const p = new PrismaClient();

async function main() {
  console.log('=== Test Status Kartu & Histori Penggantian ===\n');

  // 1. Find existing NFC for santri-sample
  const existingNfc = await p.nfc.findFirst({ where: { santriId: 'santri-sample' } });
  console.log('1. Existing NFC for Budi Santri: ' + (existingNfc?.uid || 'none') + ' (' + (existingNfc?.status || 'none') + ')');

  // 2. Test nonaktifkan kartu
  if (existingNfc) {
    await p.nfc.update({
      where: { id: existingNfc.id },
      data: { status: 'NONAKTIF' },
    });
    console.log('2. Kartu dinonaktifkan: ' + existingNfc.uid + ' -> NONAKTIF');
  }

  // 3. Test ganti kartu (import UID baru ke santri yang sama)
  const newUid = 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99';
  console.log('\n3. Ganti kartu: import UID baru ke santri yang sama');
  
  const replaceResult = await importNfc({
    uid: newUid,
    mode: 'scan',
    santriId: 'santri-sample',
  });
  console.log('   UID baru: ' + replaceResult.uid + ' -> santri: ' + replaceResult.santri_id);

  // 4. Verify old UID is gone, new UID mapped
  const oldNfc = await p.nfc.findUnique({ where: { uid: existingNfc?.uid || '' } });
  const normalizedNewUid = newUid.toUpperCase().replace(/:/g, '');
  const newNfc = await p.nfc.findUnique({ where: { uid: normalizedNewUid } });
  const santri = await p.santri.findUnique({ where: { id: 'santri-sample' } });
  
  console.log('\n4. Verification:');
  console.log('   Old UID (' + (existingNfc?.uid || 'none') + ') exists: ' + !!oldNfc);
  console.log('   New UID mapped: ' + !!newNfc + ' (' + (newNfc?.uid || 'none') + ')');
  console.log('   Santri cardUid updated: ' + (santri?.cardUid || 'none'));

  // 5. Check NfcLog for history
  console.log('\n5. NfcLog history:');
  const logs = await p.nfcLog.findMany({
    where: { nfc: { santriId: 'santri-sample' } },
    orderBy: { timestamp: 'asc' },
  });
  logs.forEach((log, i) => {
    console.log('   ' + (i + 1) + '. ' + log.action + ' | ' + log.timestamp.toISOString() + ' | nfcId: ' + log.nfcId);
  });

  // 6. Test status changes
  console.log('\n6. Testing status transitions:');
  const testNfc = await p.nfc.findFirst({ where: { santriId: null } });
  if (testNfc) {
    const statuses = ['NONAKTIF', 'HILANG', 'RUSAK', 'DIGANTI', 'AKTIF'];
    for (const status of statuses) {
      await p.nfc.update({
        where: { id: testNfc.id },
        data: { status },
      });
      console.log('   ' + testNfc.uid + ' -> ' + status);
    }
  }

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });