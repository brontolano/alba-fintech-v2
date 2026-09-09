import { describe, it, expect } from 'vitest';

// Role hierarchy: STAFF=0 < MANAGER=1 < PIMPINAN=2 < SUPERADMIN=3
const roleHierarchy: Record<string, number> = {
    STAFF: 0,
    MANAGER: 1,
    PIMPINAN: 2,
    SUPERADMIN: 3,
};

// Simulasi permission check — replikasi logika middleware
function hasSufficientRole(userRole: string, requiredRoles: string[]): boolean {
    return requiredRoles.some(r => roleHierarchy[userRole] >= roleHierarchy[r]);
}

const ROLE_REQUIRED: Record<string, string[]> = {
    '/admin': ['SUPERADMIN'],
    '/lembaga': ['SUPERADMIN', 'PIMPINAN'],
    '/units': ['SUPERADMIN', 'PIMPINAN', 'MANAGER'],
};

function getRequiredRole(pathname: string): string[] | null {
    for (const [prefix, roles] of Object.entries(ROLE_REQUIRED)) {
        if (pathname.startsWith(prefix)) {
            return roles;
        }
    }
    return null;
}

describe('RBAC Role Hierarchy', () => {
    it('STAFF cannot access /admin', () => {
        expect(hasSufficientRole('STAFF', getRequiredRole('/admin')!)).toBe(false);
    });

    it('PIMPINAN can access /lembaga', () => {
        expect(hasSufficientRole('PIMPINAN', getRequiredRole('/lembaga')!)).toBe(true);
    });

    it('MANAGER can access /units but not /admin', () => {
        expect(hasSufficientRole('MANAGER', getRequiredRole('/units')!)).toBe(true);
        expect(hasSufficientRole('MANAGER', getRequiredRole('/admin')!)).toBe(false);
    });

    it('SUPERADMIN can access all protected routes', () => {
        expect(hasSufficientRole('SUPERADMIN', getRequiredRole('/admin')!)).toBe(true);
        expect(hasSufficientRole('SUPERADMIN', getRequiredRole('/lembaga')!)).toBe(true);
        expect(hasSufficientRole('SUPERADMIN', getRequiredRole('/units')!)).toBe(true);
    });

    it('staff role value hierarchy correct', () => {
        expect(roleHierarchy.STAFF).toBe(0);
        expect(roleHierarchy.MANAGER).toBe(1);
        expect(roleHierarchy.PIMPINAN).toBe(2);
        expect(roleHierarchy.SUPERADMIN).toBe(3);
    });
});
