import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
import fs from 'node:fs';

if (fs.existsSync('.env')) config({ path: '.env' });
if (fs.existsSync('.env.local')) config({ path: '.env.local' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'mysql://placeholder:placeholder@localhost:3306/placeholder',
  },
});