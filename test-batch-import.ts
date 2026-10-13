import { PrismaClient } from '@prisma/client';
import { importNfc } from './lib/nfc.service';

const p = new PrismaClient();

async function main() {
  console.log('=== Test Batch Import UID dari NFC Tools ===\n');

  // Simulate NFC Tools export format (hex dump lines)
  const nfcToolsExport = [
    '04:12:34:56:78:9A:BC:DE',
    '04:AA:BB:CC:DD:EE:FF:11',
    '04:11:22:33:44:55:66:22',
    '04:77:88:99:00:AA:BB:33',
    '04:FE:DC:BA:98:76:54:44',
  ];

  console.log(`Importing ${nfcToolsExport.length} UIDs from NFC Tools format...\n`);

  const results = [];
  for (const uid of nfcToolsExport) {
    try {
      const result = await importNfc({ uid, mode: 'scan', unitId: 'kpa-unit' });
      results.push({ uid, success: true, nfcId: result.santri_id || 'no-santri' });
      console.log(`✓ ${uid} -> imported`);
    } catch (error: any) {
      results.push({ uid, success: false, error: error.message });
      console.log(`✗ ${uid} -> ${error.message}`);
    }
  }

  // Test duplicate rejection
  console.log('\n--- Testing duplicate rejection ---');
  try {
    await importNfc({ uid: nfcToolsExport[0], mode: 'scan' });
    console.log('ERROR: Duplicate should have been rejected');
  } catch (e: any) {
    console.log(`✓ Duplicate correctly rejected: ${e.message}`);
  }

  // Verify total NFC records
  const count = await p.nfc.count();
  console.log(`\nTotal NFC records in DB: ${count}`);

  // Show all NFC records
  const allNfc = await p.nfc.findMany({ orderBy: { createdAt: 'asc' } });
  console.log('\nAll NFC records:');
  allNfc.forEach((n, i) => {
    console.log(`  ${i + 1}. ${n.uid} | ${n.status} | santri: ${n.santriId || 'none'}`);
  });

  // Test NFC Log entries
  console.log('\nNFC Log entries:');
  const logs = await p.nfcLog.findMany({ orderBy: { timestamp: 'desc' }, take: 10 });
  logs.forEach((log) => {
    console.log(`  ${log.action} | ${log.timestamp}`);
  });

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });