import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const unit = await prisma.unit.upsert({
    where: { code: 'PUSAT' },
    update: {},
    create: {
      name: 'Unit Pusat',
      code: 'PUSAT',
      description: 'Unit pusat yayasan',
    },
  });

  const passwordHash = await bcrypt.hash('bismillah', 10);

  const users = [
    { email: 'admin@brontolano.com',    name: 'Super Admin',        role: 'SUPERADMIN' as const, unitId: unit.id },
    { email: 'pimpinan@brontolano.com', name: 'Pimpinan Yayasan',   role: 'PIMPINAN'   as const, unitId: null      },
    { email: 'manager@brontolano.com',  name: 'Manager Unit',       role: 'MANAGER'    as const, unitId: unit.id },
    { email: 'staff@brontolano.com',    name: 'Staff Operasional',  role: 'STAFF'      as const, unitId: unit.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: { ...u, passwordHash },
    });
  }

  console.log('✅ Seed complete.');
  console.log('');
  console.log('Default credentials (password: bismillah):');
  console.log('  Superadmin : admin@brontolano.com');
  console.log('  Pimpinan   : pimpinan@brontolano.com');
  console.log('  Manager    : manager@brontolano.com');
  console.log('  Staff      : staff@brontolano.com');
  console.log('');
  console.log('⚠️  Segera ganti password setelah login pertama!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
