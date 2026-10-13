import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  console.log('=== Test Batch Import Endpoint ===\n');
  
  const uids = [
    '04:12:34:56:78:9A:BC:DE:F0',
    '04:AA:BB:CC:DD:EE:FF:11:22',
    '04:11:22:33:44:55:66:33:44',
    '04:77:88:99:00:AA:BB:55:66',
    '04:FE:DC:BA:98:76:54:77:88',
  ];

  console.log(`Importing ${uids.length} new UIDs via batch...`);
  
  const response = await fetch('http://localhost:3000/api/nfcs/batch-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uids, mode: 'scan', unitId: 'kpa-unit' }),
  });
  
  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));
  
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });