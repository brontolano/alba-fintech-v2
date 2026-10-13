import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const santris = await p.santri.findMany({ where: { isActive: true }, include: { unit: true } });
  console.log(JSON.stringify(santris, null, 2));
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });