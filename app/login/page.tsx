import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/options";
import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";

export const metadata = {
  title: "Login - ALBA Finance v3",
  description: "Masuk ke Aplikasi Keuangan Pondok Pesantren Al-Basyariyah",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // Invalid JWT / DB error — show login form, don't throw
  }

  if (session?.user) {
    redirect("/dashboard");
  }

  const showSessionBanner = searchParams?.reason === "session";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-4 sm:p-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-20 h-20 flex-shrink-0">
            <Image
              src="/logo-baru.png"
              alt="Logo Al-Basyariyah"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl sm:text-5xl font-black text-primary leading-none tracking-tight">
              KEUANGAN
            </h1>
            <p className="text-lg sm:text-xl text-foreground font-bold tracking-[0.3em] mt-1">
              AL-BASYARIAH
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Jl. Mahmud, Rahayu, Kec. Margaasih,
          <br />
          Kab. Bandung, Jawa Barat 40218
        </p>

        {showSessionBanner && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Sesi login Anda berakhir atau browser tidak dapat menyimpan cookie
            dengan aman. Silakan masuk kembali.
          </div>
        )}

        <div className="mt-8 bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">
            MASUK
          </h2>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 Pondok Pesantren Al-Basyariyah. All rights reserved.
        </p>
      </div>
    </div>
  );
}
