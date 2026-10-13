import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const t = await p.tagihan.findMany({ include: { pembayaran: true } });
  console.log(JSON.stringify(t, null, 2));
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });