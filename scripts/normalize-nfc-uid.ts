import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Updating NFC uid to normalized form...');
  const updated = await prisma.nfc.update({
    where: { id: 'nfc-sample' },
    data: { uid: 'AFC299E7130804006263646566676869' },
  });
  console.log('Updated NFC:', updated);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
