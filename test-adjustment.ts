import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // Test adjustment: diskon 50000 pada tagihan SPP
  const tagihan = await p.tagihan.findFirst({
    where: { templateId: 'tpl-spp-bulanan', status: 'UNPAID' },
    include: { tagihanItem: true },
  });
  
  if (!tagihan) {
    console.log('No UNPAID SPP tagihan found');
    return;
  }

  console.log(`Original tagihan: ${tagihan.id}, total: ${tagihan.totalNilai}`);
  console.log('Items before adjustment:', tagihan.tagihanItem.map(i => `${i.nama}: ${i.nominal}`).join(', '));

  // Apply adjustment: diskon 50000
  const diskon = 50000;
  const newTotal = tagihan.totalNilai - diskon;

  // Update tagihan with adjustment
  const updatedTagihan = await p.tagihan.update({
    where: { id: tagihan.id },
    data: {
      totalNilai: newTotal,
      updatedAt: new Date(),
    },
  });

  console.log(`After diskon Rp${diskon}: total = ${updatedTagihan.totalNilai}`);

  // Test tambahan biaya khusus
  const biayaKhusus = 75000;
  const finalTotal = newTotal + biayaKhusus;

  const finalTagihan = await p.tagihan.update({
    where: { id: tagihan.id },
    data: {
      totalNilai: finalTotal,
      updatedAt: new Date(),
    },
  });

  console.log(`After tambahan biaya Rp${biayaKhusus}: total = ${finalTagihan.totalNilai}`);
  console.log('Adjustment test PASS');
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });