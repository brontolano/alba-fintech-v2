// Extend NextAuth session types
import { Role } from '@prisma/client';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            image?: string;
            role: Role;
            unitId: string | null;
            lembagaId: string;
        };
    }

    interface JWT {
        role: Role;
        unitId: string | null;
        lembagaId: string;
    }

    interface User {
        role?: Role;
        unitId?: string | null;
        lembagaId?: string;
    }
}
