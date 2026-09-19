import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { exportDatabase } from "../lib/data-management";

const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 14);
const backupDirectory = path.resolve(process.env.BACKUP_DIRECTORY || "backups");

function backupFileName(date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `alba-backup-${stamp}.json`;
}

async function removeExpiredBackups() {
  const files = await readdir(backupDirectory, { withFileTypes: true });
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  await Promise.all(
    files
      .filter(
        (file) =>
          file.isFile() &&
          file.name.startsWith("alba-backup-") &&
          file.name.endsWith(".json"),
      )
      .map(async (file) => {
        const filePath = path.join(backupDirectory, file.name);
        if ((await stat(filePath)).mtimeMs < cutoff) await unlink(filePath);
      }),
  );
}

async function main() {
  if (!Number.isInteger(RETENTION_DAYS) || RETENTION_DAYS < 1) {
    throw new Error(
      "BACKUP_RETENTION_DAYS harus berupa bilangan bulat minimal 1",
    );
  }

  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const prisma = new PrismaClient();
  try {
    const backup = await exportDatabase(prisma);
    const target = path.join(backupDirectory, backupFileName());
    await writeFile(target, JSON.stringify(backup), {
      encoding: "utf8",
      mode: 0o600,
    });
    await removeExpiredBackups();
    console.log(
      JSON.stringify({ ok: true, file: target, retentionDays: RETENTION_DAYS }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[Backup] failed", error);
  process.exitCode = 1;
});
