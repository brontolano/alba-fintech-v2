"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        const message =
          result.error.includes("Cookies") || result.error.includes("cookie")
            ? "Browser atau instalasi aplikasi tidak bisa menyimpan sesi. Silakan login ulang dalam browser bawaan atau cek izin cookie."
            : result.error;

        toast.error("Login gagal", {
          description: message,
        });
      } else {
        toast.success("Login berhasil!");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan", {
        description:
          "Sesi login mungkin gagal disimpan oleh browser. Coba masuk kembali.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary/40 focus:outline-none text-sm bg-background text-foreground placeholder:text-muted-foreground"
          placeholder="Email"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary/40 focus:outline-none text-sm bg-background text-foreground placeholder:text-muted-foreground"
            placeholder="Password"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Lupa kata sandi — prototipe: verifikasi OTP via WhatsApp Pesantren */}
      <div className="flex justify-end -mt-2">
        <Link
          href="/forgot-password"
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Lupa kata sandi?
        </Link>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <span>Masuk</span>
          )}
        </button>
      </div>
    </form>
  );
}
