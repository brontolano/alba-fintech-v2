import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/options';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

// Schema for settings keys that are expected
const settingsSchema = z.object({
  key: z.string().min(1, 'Key wajib diisi'),
  value: z.string().nullable().optional(),
  description: z.string().optional().nullable(),
});

// Schema for batch settings update
const batchUpdateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().nullable().optional(),
    })
  ),
});

// Default settings keys
const DEFAULT_SETTINGS_KEYS = [
  'app_name',
  'app_description',
  'currency',
  'timezone',
  'theme',
  'primary_color',
  'compact_mode',
  'email_notifications',
  'push_notifications',
  'in_app_notifications',
  'reminders',
  'session_timeout',
  'enable_2fa',
];

// Default values for settings
const DEFAULT_SETTINGS_VALUES: Record<string, string> = {
  app_name: 'ALBA Finance',
  app_description: 'Sistem Manajemen Keuangan Unit',
  currency: 'IDR',
  timezone: 'Asia/Jakarta',
  theme: 'light',
  primary_color: '#10b981',
  compact_mode: 'false',
  email_notifications: 'true',
  push_notifications: 'true',
  in_app_notifications: 'true',
  reminders: 'true',
  session_timeout: '1800',
  enable_2fa: 'false',
};

// Descriptions for settings
const SETTINGS_DESCRIPTIONS: Record<string, string> = {
  app_name: 'Nama aplikasi yang ditampilkan di header',
  app_description: 'Deskripsi singkat aplikasi',
  currency: 'Mata uang yang digunakan',
  timezone: 'Zona waktu aplikasi',
  theme: 'Tema tampilan aplikasi (light/dark/auto)',
  primary_color: 'Warna utama aplikasi',
  compact_mode: 'Gunakan tampilan kompak (true/false)',
  email_notifications: 'Aktifkan notifikasi email (true/false)',
  push_notifications: 'Aktifkan notifikasi push (true/false)',
  in_app_notifications: 'Aktifkan notifikasi dalam aplikasi (true/false)',
  reminders: 'Aktifkan pengingat (true/false)',
  session_timeout: 'Durasi sesi dalam detik sebelum timeout',
  enable_2fa: 'Wajibkan autentikasi dua faktor (true/false)',
};

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC - only SUPERADMIN and PIMPINAN can manage settings
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all settings
    const settingsList = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object
    const settings: Record<string, string> = {};
    for (const key of DEFAULT_SETTINGS_KEYS) {
      const existing = settingsList.find((s) => s.key === key);
      settings[key] = existing?.value ?? DEFAULT_SETTINGS_VALUES[key] ?? '';
    }

    return NextResponse.json({
      data: settings,
      summary: {
        total: settingsList.length,
        availableKeys: DEFAULT_SETTINGS_KEYS,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[Settings API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC - only SUPERADMIN can create new settings
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Create or update setting
    const setting = await prisma.systemSetting.upsert({
      where: { key: parsed.data.key },
      update: {
        value: parsed.data.value,
        description: parsed.data.description,
      },
      create: {
        key: parsed.data.key,
        value: parsed.data.value,
        description: parsed.data.description ?? SETTINGS_DESCRIPTIONS[parsed.data.key] ?? '',
      },
    });

    return NextResponse.json({
      message: 'Setting berhasil disimpan',
      data: setting,
    }, { status: 201 });
  } catch (error) {
    console.error('[Settings API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC - only SUPERADMIN and PIMPINAN can update settings
    const role = (session.user as any)?.role;
    if (role !== 'SUPERADMIN' && role !== 'PIMPINAN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = batchUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.errors }, { status: 400 });
    }

    // Update each setting
    const updatedSettings: Array<{ key: string; value: string | null }> = [];
    for (const { key, value } of parsed.data.settings) {
      const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          description: SETTINGS_DESCRIPTIONS[key] ?? '',
        },
      });
      updatedSettings.push({ key: setting.key, value: setting.value });
    }

    return NextResponse.json({
      message: `${updatedSettings.length} pengaturan berhasil diperbarui`,
      data: updatedSettings,
    }, { status: 200 });
  } catch (error) {
    console.error('[Settings API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}