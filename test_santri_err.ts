import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const santri = await prisma.santri.create({
      data: {
        studentNumber: '20251099',
        name: 'Test Error',
        unit: { connect: { id: 'kpa-unit' } },
        wali: 'Ibu Guru',
        kontak: '081234567890',
      }
    });
    console.log('Success:', santri);
  } catch (e: any) {
    console.error('Error:', e.message);
    console.error(e.meta?.target);
  } finally {
    await prisma.$disconnect();
  }
}
main();
