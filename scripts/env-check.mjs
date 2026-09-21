import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NODE_ENV",
];
const OPTIONAL = [
  "BACKUP_DIRECTORY",
  "BACKUP_RETENTION_DAYS",
  "GOOGLE_APPS_SCRIPT_URL",
  "GOOGLE_APPS_SCRIPT_SECRET",
];
const PLACEHOLDER_HINTS = /ganti_|yourpassword|your_password|xxxx/i;

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const q = value[0];
    if ((q === '"' || q === "'") && value.endsWith(q)) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(".env"));
loadEnvFile(resolve(".env.local"));

function isSet(key) {
  const value = process.env[key];
  return (
    value !== undefined &&
    value.trim() !== "" &&
    !PLACEHOLDER_HINTS.test(value.trim())
  );
}

console.log("== Checklist Environment ALBA Finance ==");
console.log("Format: NAMA_VAR | status\n");

const rows = [];
const missing = [];

for (const key of REQUIRED) {
  const ok = isSet(key);
  rows.push([key, ok ? "SET" : "MISSING (WAJIB)"]);
  if (!ok) missing.push(key);
}
for (const key of OPTIONAL) {
  rows.push([key, isSet(key) ? "SET" : "kosong (opsional)"]);
}

const width = Math.max(...rows.map(([k]) => k.length));
for (const [key, status] of rows) {
  console.log(`  ${key.padEnd(width)}  ${status}`);
}

console.log("");
if (missing.length === 0) {
  console.log("Semua variabel WAJIB sudah terisi. Siap deploy.");
  process.exit(0);
} else {
  console.log(`Kurang variabel WAJIB: ${missing.join(", ")}`);
  console.log("Isi di hPanel > Node.js > Environment Variables, lalu push ulang.");
  process.exit(1);
}