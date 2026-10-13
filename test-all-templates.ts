import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // Test all templates
  const templates = ['tpl-spp-bulanan', 'tpl-daftar-ulang', 'tpl-psb-satu-bayi'];
  
  for (const templateId of templates) {
    console.log(`\n=== Testing ${templateId} ===`);
    const template = await p.tagihanTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.isActive) {
      console.log('Template not found or inactive');
      continue;
    }

    const items = await p.tagihanTemplateItem.findMany({ where: { templateId } });
    const totalPerItem = items.reduce((sum, it) => sum + it.nominal, 0);
    console.log(`Total per item: ${totalPerItem}`);

    const tagihan = await p.tagihan.create({
      data: {
        unitId: 'kpa-unit',
        santriId: 'santri-sample',
        templateId,
        tanggal: new Date('2025-10-01'),
        totalNilai: totalPerItem,
        status: 'UNPAID',
        tagihanItem: {
          create: items.map((it) => ({
            kode: it.kode,
            nama: it.nama,
            nominal: it.nominal,
            kategori: it.kategori,
            periode: it.periode,
            urutan: it.urutan,
          })),
        },
      },
      include: { tagihanItem: true },
    });

    console.log(`Created tagihan: ${tagihan.id}, total: ${tagihan.totalNilai}, status: ${tagihan.status}`);
    console.log(`Items: ${tagihan.tagihanItem.length}`);
  }

  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });