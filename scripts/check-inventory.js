const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Check if inventory_items table exists
    const count = await prisma.inventoryItem.count();
    console.log('Inventory items count:', count);
    
    if (count > 0) {
      const items = await prisma.inventoryItem.findMany({ take: 5 });
      console.log('Sample items:', JSON.stringify(items, null, 2));
    }
  } catch (error) {
    console.log('Error:', error.message);
    console.log('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();