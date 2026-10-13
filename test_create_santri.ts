import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const data = {
    studentNumber: '20251000',
    name: 'Test Santri',
    className: 'VIII',
    cardUid: null,
    isActive: true,
    unitId: 'kpa-unit',
    wali: 'Bapak Guru',
    kontak: '081234567890',
  };
  try {
    const s = await prisma.santri.create({ data });
    console.log('Created Santri:', s.id);
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
