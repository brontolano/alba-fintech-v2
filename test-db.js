const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.systemSetting.count();
    console.log('Database connected successfully. Settings count:', count);
    process.exit(0);
  } catch (error) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();