import "dotenv/config";
import { createPrismaClient } from "../lib/prisma";

const prisma = createPrismaClient();

async function main() {
  try {
    const count = await prisma.inventoryItem.count();
    console.log("Inventory items count:", count);

    if (count > 0) {
      const items = await prisma.inventoryItem.findMany({ take: 5 });
      console.log("Sample items:", JSON.stringify(items, null, 2));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("Error:", error.message);
    } else {
      console.log("Unknown error:", error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();