import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function poolConfigFromUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    // Shared hosting MySQL membatasi koneksi per user (max_connections_per_hour,
    // mis. 500/jam). Pool kecil + tetap memakai koneksi idle menekan jumlah
    // handshake baru per jam; pool besar justru memboroskan kuota saat restart
    // atau reconnect setelah pool timeout.
    connectionLimit: 2,
    connectTimeout: 8000,
  };
}

function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return new PrismaMariaDb(poolConfigFromUrl(url));
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
