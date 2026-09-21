import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return new PrismaMariaDb(url);
}

export function createPrismaClient(logMode: 'quiet' | 'standard' = 'standard'): PrismaClient {
  const adapter = createAdapter();
  return new PrismaClient({
    adapter,
    log:
      logMode === 'quiet'
        ? ['error']
        : process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
  });
}

export const prisma =
  globalForPrisma.prisma ||
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
