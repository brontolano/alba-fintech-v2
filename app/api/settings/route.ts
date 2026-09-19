import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/options";
import { getServerSession } from "next-auth";
import { z } from "zod";

// Schema for settings keys that are expected
const settingsSchema = z.object({
  key: z.string().min(1, "Key wajib diisi"),
  value: z.string().nullable().optional(),
  description: z.string().optional().nullable(),
});

// Schema for batch settings update
const batchUpdateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().nullable().optional(),
    }),
  ),
});

// Default settings keys
const DEFAULT_SETTINGS_KEYS = [
  "app_name",
  "app_description",
  "currency",
  "timezone",
  "theme",
  "primary_color",
  "compact_mode",
  "email_notifications",
  "push_notifications",
  "in_app_notifications",
  "reminders",
  "session_timeout",
  "enable_2fa",
];

// Default values for settings
const DEFAULT_SETTINGS_VALUES: Record<string, string> = {
  app_name: "ALBA Finance",
  app_description: "Sistem Manajemen Keuangan Unit",
  currency: "IDR",
  timezone: "Asia/Jakarta",
  theme: "light",
  primary_color: "#10b981",
  compact_mode: "false",
  email_notifications: "true",
  push_notifications: "true",
  in_app_notifications: "true",
  reminders: "true",
  session_timeout: "1800",
  enable_2fa: "false",
};

// Descriptions for settings
const SETTINGS_DESCRIPTIONS: Record<string, string> = {
  app_name: "Nama aplikasi yang ditampilkan di header",
  app_description: "Deskripsi singkat aplikasi",
  currency: "Mata uang yang digunakan",
  timezone: "Zona waktu aplikasi",
  theme: "Tema tampilan aplikasi (light/dark/auto)",
  primary_color: "Warna utama aplikasi",
  compact_mode: "Gunakan tampilan kompak (true/false)",
  email_notifications: "Aktifkan notifikasi email (true/false)",
  push_notifications: "Aktifkan notifikasi push (true/false)",
  in_app_notifications: "Aktifkan notifikasi dalam aplikasi (true/false)",
  reminders: "Aktifkan pengingat (true/false)",
  session_timeout: "Durasi sesi dalam detik sebelum timeout",
  enable_2fa: "Wajibkan autentikasi dua faktor (true/false)",
};

/**
 * Ensure all default settings exist in the database.
 * Creates any missing rows with default values + upsert.
 * If the table doesn't exist yet, this is a no-op (caller falls back to defaults).
 */
async function ensureDefaultSettings() {
  try {
    for (const key of DEFAULT_SETTINGS_KEYS) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: {},
        create: {
          key,
          value: DEFAULT_SETTINGS_VALUES[key] ?? "",
          description: SETTINGS_DESCRIPTIONS[key] ?? "",
        },
      });
    }
  } catch (err: any) {
    // P2021 = table doesn't exist. Log and continue; caller will use defaults.
    if (err?.code === "P2021") {
      console.warn(
        "[Settings API] system_settings table does not exist yet; using defaults",
      );
    } else {
      throw err;
    }
  }
}

/**
 * Build a flat settings object from DB rows, falling back to defaults.
 */
function buildSettingsObject(rows: { key: string; value: string | null }[]) {
  const settings: Record<string, string> = {};
  const dbKeys = new Set(rows.map((r) => r.key));
  for (const key of DEFAULT_SETTINGS_KEYS) {
    if (dbKeys.has(key)) {
      const row = rows.find((r) => r.key === key);
      settings[key] = row!.value ?? DEFAULT_SETTINGS_VALUES[key] ?? "";
    } else {
      settings[key] = DEFAULT_SETTINGS_VALUES[key] ?? "";
    }
  }
  return settings;
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC - only SUPERADMIN can manage settings
    const role = (session.user as any)?.role;
    if (role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Forbidden - only SUPERADMIN can manage settings" },
        { status: 403 },
      );
    }

    // Ensure defaults exist in DB (no-op if table doesn't exist)
    await ensureDefaultSettings();

    // Fetch from database
    let rows: { key: string; value: string | null }[] = [];
    try {
      rows = await prisma.systemSetting.findMany({
        where: { key: { in: DEFAULT_SETTINGS_KEYS } },
        select: { key: true, value: true },
      });
    } catch (err: any) {
      // P2021 = table doesn't exist. Fall back to empty rows → all defaults.
      if (err?.code === "P2021") {
        console.warn(
          "[Settings API] system_settings table does not exist yet; returning defaults only",
        );
        rows = [];
      } else {
        throw err;
      }
    }

    const settings = buildSettingsObject(rows);

    return NextResponse.json(
      {
        data: settings,
        summary: {
          total: DEFAULT_SETTINGS_KEYS.length,
          availableKeys: DEFAULT_SETTINGS_KEYS,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Settings API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC - only SUPERADMIN can create new settings
    const role = (session.user as any)?.role;
    if (role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.errors },
        { status: 400 },
      );
    }

    // Persist to database
    try {
      const existing = await prisma.systemSetting.findUnique({
        where: { key: parsed.data.key },
      });

      let result;
      if (existing) {
        result = await prisma.systemSetting.update({
          where: { key: parsed.data.key },
          data: {
            value: parsed.data.value,
            description: parsed.data.description ?? existing.description,
          },
        });
      } else {
        result = await prisma.systemSetting.create({
          data: {
            key: parsed.data.key,
            value: parsed.data.value,
            description:
              parsed.data.description ??
              SETTINGS_DESCRIPTIONS[parsed.data.key] ??
              "",
          },
        });
      }

      return NextResponse.json(
        {
          message: "Setting berhasil disimpan",
          data: {
            key: result.key,
            value: result.value,
            description: result.description,
          },
        },
        { status: 201 },
      );
    } catch (err: any) {
      if (err?.code === "P2021") {
        console.warn(
          "[Settings API] system_settings table does not exist; cannot persist setting",
        );
        return NextResponse.json(
          {
            error:
              "Table system_settings belum ada di database. Hubungi administrator.",
          },
          { status: 503 },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("[Settings API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC - only SUPERADMIN can update settings
    const role = (session.user as any)?.role;
    if (role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Forbidden - only SUPERADMIN can update settings" },
        { status: 403 },
      );
    }

    // Parse body
    const body = await request.json();
    const parsed = batchUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.errors },
        { status: 400 },
      );
    }

    // Persist all settings to database (upsert pattern)
    try {
      const updatedSettings: Array<{ key: string; value: string | null }> = [];
      for (const { key, value } of parsed.data.settings) {
        const result = await prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: {
            key,
            value,
            description: SETTINGS_DESCRIPTIONS[key] ?? "",
          },
        });
        updatedSettings.push({ key: result.key, value: result.value });
      }

      return NextResponse.json(
        {
          message: `${updatedSettings.length} pengaturan berhasil diperbarui`,
          data: updatedSettings,
        },
        { status: 200 },
      );
    } catch (err: any) {
      if (err?.code === "P2021") {
        console.warn(
          "[Settings API] system_settings table does not exist; cannot save settings",
        );
        return NextResponse.json(
          {
            error:
              "Table system_settings belum ada di database. Hubungi administrator.",
          },
          { status: 503 },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("[Settings API] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
