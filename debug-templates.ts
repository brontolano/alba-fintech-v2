import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const templates = await p.tagihanTemplate.findMany({ include: { items: true } });
  console.log(JSON.stringify(templates, null, 2));
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });