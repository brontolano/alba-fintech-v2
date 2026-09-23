import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config } from "dotenv";
import * as fs from "fs";
if (fs.existsSync(".env")) config({ path: ".env" });
if (fs.existsSync(".env.local")) config({ path: ".env.local" });

const url = new URL(process.env.DATABASE_URL as string);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
});
const prisma = new PrismaClient({ adapter });

const UNITS = [
  { id: "cmubg2y5h001fxx3d51558t81", name: "Koperasi Buku" },
  { id: "cmubg2y5b001dxx3d8ybh8kx9", name: "Kantin Umi" },
  { id: "cmubg2y54001bxx3d7c6scg0h", name: "Kantin Baru" },
];

async function main() {
  const summary = await prisma.$transaction(async (tx) => {
    const out: any[] = [];
    for (const u of UNITS) {
      const cost = 5000;
      const agreed = 7500;
      const skuVal = `${u.name.slice(0, 3).toUpperCase()}-UMKM1`;
      const nameVal = `Kerupuk Udang ${u.name}`;
      const invId = `INV-${u.id.slice(0, 6)}-CT1`;
      const ciId = `CI-${u.id.slice(0, 6)}-1`;
      const ownerId = `OWN-${u.id.slice(0, 6)}-001`;

      // Owner
      await tx.$executeRaw`INSERT INTO consignment_owners (id,unitId,name,phone,isActive,createdAt,updatedAt)
        VALUES (${ownerId}, ${u.id}, ${`Bakery ${u.name}`}, '08123456789', 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE name=VALUES(name)`;

      // Inventory item for consignment sample
      await tx.$executeRaw`INSERT INTO inventory_items (id,unitId,name,sku,category,currentStock,minStock,unitPrice,purchasePrice,imageUrl,isActive,createdAt,updatedAt)
        VALUES (${invId}, ${u.id}, ${nameVal}, ${skuVal}, 'Snack', 10, 5, ${agreed}, ${cost}, ${`https://placehold.co/150?text=Kerupuk`}, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE name=VALUES(name)`;

      // Consignment item
      await tx.$executeRaw`INSERT INTO consignment_items (id,unitId,ownerId,inventoryItemId,costPrice,marginType,marginValue,agreedPrice,isActive,createdAt,updatedAt)
        VALUES (${ciId}, ${u.id}, ${ownerId}, ${invId}, ${cost}, 'PERCENT', 50, ${agreed}, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE agreedPrice=VALUES(agreedPrice)`;

      // Pondok items: 3 per unit (simple)
      const pondokNames = ['Roti Coklat', 'Bolu Kering', 'Minum Soda'];
      for (let i = 0; i < pondokNames.length; i++) {
        const pid = `PON-${u.id.slice(0, 6)}-${i+1}`;
        const psku = `${u.name.slice(0,3).toUpperCase()}-P${i+1}`;
        await tx.$executeRaw`INSERT INTO inventory_items (id,unitId,name,sku,category,currentStock,minStock,unitPrice,purchasePrice,imageUrl,isActive,createdAt,updatedAt)
          VALUES (${pid}, ${u.id}, ${pondokNames[i]}, ${psku}, 'Makanan', 20, 5, 5000, 3500, ${`https://placehold.co/150?text=${pondokNames[i].replace(/\s+/g,'')}`} , 1, NOW(), NOW())
          ON DUPLICATE KEY UPDATE name=VALUES(name)`;
      }

      out.push({ unit: u.name, pondok: 3, consignment: 1, owner: 1 });
    }
    return out;
  });
  console.log(JSON.stringify({ seeded: summary }, null, 2));
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());