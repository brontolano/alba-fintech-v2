import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { Role, TransactionType } from '@prisma/client';

// Role hierarchy: higher roles can access lower role resources
const roleHierarchy: Record<Role, number> = {
    STAFF: 0,
    MANAGER: 1,
    PIMPINAN: 2,
    SUPERADMIN: 3,
};

// Permission map: what roles can do what actions
const permissions: Record<
    string,
    { roles: Role[]; unitScope?: boolean; lembagaScope?: boolean }
> = {
    // Lembaga management - SUPERADMIN only
    lembaga: { roles: ['SUPERADMIN'] },
    // Unit management - SUPERADMIN for create, PIMPINAN+ for read
    units: { roles: ['SUPERADMIN'] },
    units_read: { roles: ['PIMPINAN'] },
    // User management
    users: { roles: ['SUPERADMIN', 'PIMPINAN'] },
    users_self: { roles: ['MANAGER'] },
    // Transactions
    transactions: { roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
    // Approvals
    approvals: { roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'] },
    // Inventory
    inventory: { roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
    // Bank accounts
    bank_accounts: { roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'] },
    // Financial notes
    financial_notes: { roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER'] },
    // Notifications
    notifications: { roles: ['SUPERADMIN', 'PIMPINAN', 'MANAGER', 'STAFF'] },
    // Broadcast messages
    broadcast_messages: { roles: ['SUPERADMIN', 'PIMPINAN'] },
    // Financial categories
    financial_categories: { roles: ['SUPERADMIN'] },
    // Settings
    settings: { roles: ['SUPERADMIN'] },
    settings_read: { roles: ['PIMPINAN'] },
    // Audit logs
    audit_logs: { roles: ['SUPERADMIN', 'PIMPINAN'] },
};

// Route permission mapping
const routePermissions: Record<string, string> = {
    '/api/lembaga': 'lembaga',
    '/api/units': 'units',
    '/api/units/': 'units',
    '/api/users': 'users',
    '/api/users/profile': 'users',
    '/api/transactions': 'transactions',
    '/api/transactions/': 'transactions',
    '/api/approvals': 'approvals',
    '/api/approvals/': 'approvals',
    '/api/inventory': 'inventory',
    '/api/inventory/': 'inventory',
    '/api/bank-accounts': 'bank_accounts',
    '/api/bank-accounts/': 'bank_accounts',
    '/api/financial-notes': 'financial_notes',
    '/api/financial-notes/': 'financial_notes',
    '/api/notifications': 'notifications',
    '/api/notifications/': 'notifications',
    '/api/broadcast-messages': 'broadcast_messages',
    '/api/broadcast-messages/': 'broadcast_messages',
    '/api/financial-categories': 'financial_categories',
    '/api/financial-categories/': 'financial_categories',
    '/api/settings': 'settings',
    '/api/audit-logs': 'audit_logs',
};

interface AuthResult {
    authorized: boolean;
    user?: {
        id: string;
        email: string;
        role: Role;
        unitId?: string;
        lembagaId: string;
    };
    error?: string;
}

/**
 * Middleware to check authentication and RBAC authorization.
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @param resource - The resource key from permissions map
 * @returns AuthResult with user info if authorized
 */
export async function requireAuth(
    req: NextApiRequest,
    res: NextApiResponse,
    resource?: string
): Promise<AuthResult> {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.sub) {
        return {
            authorized: false,
            error: 'Authentication required',
        };
    }

    const user = {
        id: token.sub,
        email: token.email as string,
        role: (token.role as Role) || 'STAFF',
        unitId: token.unitId as string | undefined,
        lembagaId: token.lembagaId as string,
    };

    // If resource is specified, check authorization
    if (resource && resource !== 'public') {
        const permission = permissions[resource];
        if (!permission) {
            return {
                authorized: false,
                error: 'Resource not found',
            };
        }

        // Check role access
        if (!permission.roles.includes(user.role)) {
            return {
                authorized: false,
                error: 'Insufficient permissions',
            };
        }
    }

    return {
        authorized: true,
        user,
    };
}

/**
 * Check if user's role is at least the minimum required role.
 * @param userRole - User's current role
 * @param requiredRole - Minimum required role
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can access data within the same unit and lembaga.
 * @param userUnitId - User's unit ID
 * @param userLembagaId - User's lembaga ID
 * @param targetUnitId - Target resource's unit ID
 * @param targetLembagaId - Target resource's lembaga ID
 */
export function canAccessUnit(
    userUnitId: string | undefined,
    userLembagaId: string,
    targetUnitId?: string,
    targetLembagaId?: string
): boolean {
    // SUPERADMIN can access everything
    // PIMPINAN already checked by role for their lembaga
    // MANAGER: only their own unit
    if (!targetLembagaId || userLembagaId === targetLembagaId) {
        // Within same lembaga
        if (!targetUnitId || !userUnitId || userUnitId === targetUnitId) {
            return true;
        }
    }
    return false;
}

/**
 * Get the resource key for a given API route path.
 * @param path - The API route path (e.g., /api/transactions/123)
 */
export function getResourceFromPath(path: string): string | undefined {
    // Normalize path - remove numeric IDs and trailing slashes
    const normalizedPath = path.replace(/\/\d+$/, '').replace(/\/$/, '');

    // Direct match
    if (routePermissions[normalizedPath]) {
        return routePermissions[normalizedPath];
    }

    // Check parent paths
    for (const route of Object.keys(routePermissions)) {
        if (normalizedPath.startsWith(route)) {
            return routePermissions[route];
        }
    }

    return undefined;
}

/**
 * Wrap an API handler with auth and RBAC checking.
 * @param handler - The API handler function
 * @param resource - The resource key for permission checking
 */
export function withAuth(
    handler: (req: NextApiRequest, res: NextApiResponse, user: any) => Promise<void>,
    resource?: string
) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const auth = await requireAuth(req, res, resource);

        if (!auth.authorized || !auth.user) {
            return res.status(401).json({ error: auth.error || 'Unauthorized' });
        }

        // Attach user to req for downstream use
        (req as any).user = auth.user;

        try {
            await handler(req, res, auth.user);
        } catch (error: any) {
            console.error('[API Error]', error);
            if (error.code === 'P2002') {
                // BUG-002: P2002 error message mapping fix
                return res.status(409).json({
                    error: 'Data sudah ada',
                    field: error.meta?.target?.[0] || 'unknown',
                });
            }
            return res.status(500).json({ error: error.message || 'Internal server error' });
        }
    };
}
