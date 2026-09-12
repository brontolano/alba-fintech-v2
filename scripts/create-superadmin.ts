import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating SuperAdmin user...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('bismillah', 12);
    
    // Create or update SuperAdmin user
    const user = await prisma.user.upsert({
        where: { email: 'admin@brontolano.com' },
        update: {
            passwordHash: hashedPassword,
            role: 'SUPERADMIN',
            name: 'SuperAdmin',
            isActive: true,
        },
        create: {
            email: 'admin@brontolano.com',
            name: 'SuperAdmin',
            passwordHash: hashedPassword,
            role: 'SUPERADMIN',
            isActive: true,
        },
    });
    
    console.log('✅ SuperAdmin created:', user.email);
}

main()
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });