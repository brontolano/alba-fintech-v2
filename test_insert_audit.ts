import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const log = await prisma.auditLog.create({
      data: {
        entityType: 'Nfc',
        entityId: 'test-uid',
        action: 'IMPORT',
        userId: 'superadmin',
        oldData: '{}',
        newData: '{}',
      },
    });
    console.log('Created audit log:', log);
  } catch (e: any) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  } finally {
    await prisma.$disconnect();
  }
}
main();
