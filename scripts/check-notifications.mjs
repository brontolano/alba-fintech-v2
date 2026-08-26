import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany({
    where: { isRead: false },
    include: { user: { select: { email: true, role: true } } }
  });
  console.log('Unread notifications:', JSON.stringify(notifications, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());