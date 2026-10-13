import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const unit = await prisma.unit.findFirst();
  const user = await prisma.user.findFirst();
  const santri = await prisma.santri.findFirst();
  const nfc = await prisma.nfc.findFirst();
  console.log(JSON.stringify({ unit, user, santri, nfc }, null, 2));
}
main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
