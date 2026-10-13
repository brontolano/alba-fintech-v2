import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // Simulate the tagihan generation logic from app/api/tagihan/route.ts
  const templateId = 'tpl-spp-bulanan';
  const santriIds = ['santri-sample'];
  const tanggal = new Date('2025-10-01');

  const template = await p.tagihanTemplate.findUnique({ where: { id: templateId } });
  if (!template || !template.isActive) {
    console.log('Template not found or inactive');
    return;
  }

  const items = await p.tagihanTemplateItem.findMany({ where: { templateId } });
  const totalPerItem = items.reduce((sum, it) => sum + it.nominal, 0);
  console.log(`Total per item: ${totalPerItem}`);

  const tagihans = [];
  for (const santriId of santriIds) {
    const santri = await p.santri.findUnique({ where: { id: santriId } });
    if (!santri || !santri.isActive) {
      console.log(`Santri ${santriId} not found or inactive`);
      continue;
    }

    const tagihan = await p.tagihan.create({
      data: {
        unitId: santri.unitId,
        santriId,
        templateId,
        tanggal,
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

    tagihans.push(tagihan);
    console.log(`Created tagihan for ${santri.name}: ${tagihan.id}, total: ${tagihan.totalNilai}`);
  }

  console.log('All tagihans created:', tagihans.length);
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });