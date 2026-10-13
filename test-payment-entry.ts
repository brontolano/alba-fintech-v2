import { PrismaClient } from '@prisma/client';
import { findSantriByUid } from './lib/nfc.service';

const p = new PrismaClient();

async function main() {
  console.log('=== Test Pembayaran via NFC/UID ===\n');

  // 1. Test find santri by UID (existing NFC from seed)
  const existingUid = 'AF:C2:99:E7:13:08:04:00:62:63:64:65:66:67:68:69';
  const foundSantriId = await findSantriByUid(existingUid);
  console.log(`1. Find santri by UID "${existingUid}": ${foundSantriId || 'NOT FOUND'}`);

  // 2. Test pembayaran manual (input santriId langsung)
  const tagihan = await p.tagihan.findFirst({
    where: { templateId: 'tpl-spp-bulanan', status: 'UNPAID' },
  });
  
  if (tagihan) {
    console.log(`\n2. Manual payment for tagihan ${tagihan.id}`);
    
    const payment = await p.pembayaran.create({
      data: {
        tagihanId: tagihan.id,
        santriId: tagihan.santriId,
        user_id: 'superadmin',
        nominal: tagihan.totalNilai, // bayar full
        tanggal: new Date(),
        buktiUrl: 'http://example.com/bukti-manual.jpg',
        tipe: 'TUNAI',
        keterangan: 'Pembayaran manual full',
        status: 'APPROVED',
      },
    });
    console.log(`   Payment created: ${payment.id}, status: ${payment.status}`);
  }

  // 3. Test pembayaran via NFC lookup (simulasi scan kartu)
  console.log('\n3. Payment via NFC scan lookup:');
  const nfcTagihan = await p.tagihan.findFirst({
    where: { templateId: 'tpl-daftar-ulang', status: 'UNPAID' },
  });
  
  if (nfcTagihan && foundSantriId) {
    const payment = await p.pembayaran.create({
      data: {
        tagihanId: nfcTagihan.id,
        santriId: foundSantriId,
        user_id: 'superadmin',
        nominal: nfcTagihan.totalNilai,
        tanggal: new Date(),
        buktiUrl: 'http://example.com/bukti-nfc.jpg',
        tipe: 'NFC',
        keterangan: 'Pembayaran via scan NFC',
        status: 'APPROVED',
      },
    });
    console.log(`   NFC payment created: ${payment.id}, status: ${payment.status}`);
  }

  // 4. Test pembayaran partial (cicilan)
  console.log('\n4. Partial payment (cicilan):');
  const partialTagihan = await p.tagihan.findFirst({
    where: { templateId: 'tpl-psb-satu-bayi', status: 'UNPAID' },
  });
  
  if (partialTagihan) {
    const cicilan1 = Math.floor(partialTagihan.totalNilai / 2);
    
    const payment1 = await p.pembayaran.create({
      data: {
        tagihanId: partialTagihan.id,
        santriId: partialTagihan.santriId,
        user_id: 'superadmin',
        nominal: cicilan1,
        tanggal: new Date(),
        buktiUrl: 'http://example.com/bukti-cicilan1.jpg',
        tipe: 'TUNAI',
        keterangan: 'Cicilan 1/2',
        status: 'APPROVED',
      },
    });
    console.log(`   Cicilan 1: Rp${cicilan1} (${payment1.id})`);
    
    const cicilan2 = partialTagihan.totalNilai - cicilan1;
    const payment2 = await p.pembayaran.create({
      data: {
        tagihanId: partialTagihan.id,
        santriId: partialTagihan.santriId,
        user_id: 'superadmin',
        nominal: cicilan2,
        tanggal: new Date(),
        buktiUrl: 'http://example.com/bukti-cicilan2.jpg',
        tipe: 'TRANSFER',
        keterangan: 'Cicilan 2/2 - Lunas',
        status: 'APPROVED',
      },
    });
    console.log(`   Cicilan 2: Rp${cicilan2} (${payment2.id})`);

    // Verify total paid
    const totalPaid = await p.pembayaran.aggregate({
      where: { tagihanId: partialTagihan.id, status: 'APPROVED' },
      _sum: { nominal: true },
    });
    console.log(`   Total paid: Rp${totalPaid._sum.nominal || 0} / Rp${partialTagihan.totalNilai}`);
    console.log(`   Status: ${totalPaid._sum.nominal && totalPaid._sum.nominal >= partialTagihan.totalNilai ? 'LUNAS' : 'BELUM LUNAS'}`);
  }

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });