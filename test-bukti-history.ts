import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  console.log('=== Test Upload Bukti & Payment History ===\n');

  // 1. Create payment with buktiUrl
  const tagihan = await p.tagihan.findFirst({
    where: { templateId: 'tpl-spp-bulanan', status: 'UNPAID' },
  });

  if (!tagihan) {
    console.log('No UNPAID SPP tagihan found');
    return;
  }

  console.log(`1. Tagihan: ${tagihan.id}, total: ${tagihan.totalNilai}`);

  // 2. Create payment dengan bukti foto
  const payment = await p.pembayaran.create({
    data: {
      tagihanId: tagihan.id,
      santriId: tagihan.santriId,
      user_id: 'superadmin',
      nominal: tagihan.totalNilai,
      tanggal: new Date(),
      buktiUrl: '/uploads/bukti/payment-001.jpg',
      tipe: 'TUNAI',
      keterangan: 'Pembayaran SPP dengan bukti',
      status: 'APPROVED',
    },
  });
  console.log(`2. Payment dengan bukti: ${payment.id}`);
  console.log(`   buktiUrl: ${payment.buktiUrl}`);

  // 3. Test history/payment log
  console.log('\n3. Payment history untuk tagihan:');
  const payments = await p.pembayaran.findMany({
    where: { tagihanId: tagihan.id },
    orderBy: { createdAt: 'asc' },
    include: { tagihan: true },
  });
  
  payments.forEach((py, idx) => {
    console.log(`   ${idx + 1}. ${py.id} | Rp${py.nominal} | ${py.status} | ${py.tipe} | ${py.createdAt} | bukti: ${py.buktiUrl || '-'}`);
  });

  // 4. Test outstanding list per santri
  console.log('\n4. Outstanding list per santri:');
  const santris = await p.santri.findMany({
    where: { isActive: true },
    include: {
      tagihan: {
        where: { status: { in: ['UNPAID', 'PARTIAL'] } },
        include: { pembayaran: true },
      },
    },
  });

  for (const s of santris) {
    const totalTagihan = s.tagihan.reduce((sum, t) => sum + t.totalNilai, 0);
    const totalPaid = s.tagihan.reduce((sum, t) => 
      sum + t.pembayaran.filter(p => p.status === 'APPROVED').reduce((s2, p) => s2 + p.nominal, 0), 0);
    const outstanding = totalTagihan - totalPaid;
    
    if (outstanding > 0) {
      console.log(`   ${s.name} (${s.studentNumber}): Tagihan Rp${totalTagihan} | Dibayar Rp${totalPaid} | Outstanding Rp${outstanding}`);
    }
  }

  // 5. Test outstanding list per kategori
  console.log('\n5. Outstanding per kategori (SPP/Daftar Ulang/PSB):');
  const tagihansByKategori = await p.tagihan.findMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] } },
    include: { pembayaran: true, template: true },
  });

  const byKategori: Record<string, { total: number; paid: number; count: number }> = {};
  
  for (const t of tagihansByKategori) {
    const kat = t.template?.name || 'Unknown';
    if (!byKategori[kat]) byKategori[kat] = { total: 0, paid: 0, count: 0 };
    
    const paid = t.pembayaran.filter(p => p.status === 'APPROVED').reduce((s, p) => s + p.nominal, 0);
    byKategori[kat].total += t.totalNilai;
    byKategori[kat].paid += paid;
    byKategori[kat].count += 1;
  }

  for (const [kat, data] of Object.entries(byKategori)) {
    console.log(`   ${kat}: ${data.count} tagihan | Total Rp${data.total} | Dibayar Rp${data.paid} | Outstanding Rp${data.total - data.paid}`);
  }

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });