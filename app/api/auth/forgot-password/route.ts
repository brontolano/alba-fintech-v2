import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().email() });

/**
 * Stub alur Lupa Kata Sandi (prototipe: verifikasi OTP via WhatsApp Pesantren).
 *
 * Saat DB hosting tidak terjangkau, endpoint ini tetap merespons 202 dengan
 * mode 'unavailable' agar UI tidak menampilkan error keras. Ketika DB aktif,
 * ganti TODO di bawah dengan: lookup user → generate OTP → kirim via WhatsApp
 * Gateway (pengaturan integrasi ada di menu Pengaturan Aplikasi Superadmin).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body tidak valid' },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Email tidak valid' },
      { status: 400 }
    );
  }

  // TODO(whatsapp-gateway): kirim OTP ke nomor WA terdaftar user ini.
  // Untuk sekarang: tandai alur belum tersedia penuh secara eksplisit.
  //
  // - HTTP 503 (Service Unavailable) + Retry-After memberi sinyal standar
  //   ke middleware/proxy/UI bahwa ini BUKAN respons sukses, walau
  //   field `success: true` & `mode: 'unavailable'` dipertahankan agar
  //   konsumen lama tidak crash dan UI dapat menampilkan pesan informatif.
  // - Lihat audit docs/AUDIT-MODUL-2026-10-05 (HIGH — Password reset).
  return NextResponse.json(
    {
      success: true,
      mode: 'unavailable',
      message:
        'Fitur reset via WhatsApp sedang dalam pengembangan. Silakan hubungi Superadmin untuk reset kata sandi.',
    },
    {
      status: 503,
      headers: {
        'Retry-After': '86400', // 1 hari — gateway WA pesantren dijadwalkan aktif setelahnya
        'X-Alba-Feature': 'forgot-password',
        'X-Alba-Feature-Status': 'unavailable',
      },
    },
  );
}
