import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const data = {
      studentNumber: '20251001',
      name: 'Test Santri',
      className: 'VIII',
      unitId: 'kpa-unit',
      isActive: true,
      wali: 'Ibu Guru',
      kontak: '081234567890',
    };
    const santri = await prisma.santri.create({ data });
    console.log('Created Santri:', santri);
  } catch (e: any) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}
main();
