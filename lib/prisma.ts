import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export function createPrismaClient(logMode: 'quiet' | 'standard' = 'standard'): PrismaClient {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
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