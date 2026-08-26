import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find all superadmin users
  const superadmins = await prisma.user.findMany({
    where: { role: 'SUPERADMIN' }
  });

  if (superadmins.length === 0) {
    console.log('No superadmin found');
    return;
  }

  for (const admin of superadmins) {
    console.log('Superadmin found:', admin.id, admin.email);

    // Create a new unread notification
    const notification = await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Notifikasi Uji Coba',
        message: 'Ini adalah notifikasi uji coba untuk memverifikasi sistem notifikasi bekerja dengan benar.',
        type: 'INFO',
        isRead: false,
      }
    });

    console.log('Notification created:', notification.id);
  }

  // Verify
  const allNotifications = await prisma.notification.findMany({
    where: { isRead: false }
  });

  console.log('Total unread notifications:', allNotifications.length);
  console.log('Notifications:', allNotifications);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());