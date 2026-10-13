import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const data = {
    entityType: 'Nfc',
    entityId: 'test-uid',
    action: 'IMPORT',
    userId: 'superadmin',
    oldData: '{}',
    newData: '{}',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    createdAt: new Date(),
  };
  try {
    const log = await prisma.auditLog.create({ data });
    console.log('Created audit log:', log);
  } catch (e: any) {
    console.error('Error creating audit log:', e.message);
    console.error('Details:', e);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
