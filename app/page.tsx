import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";

// Landing & anjungan dinonaktifkan sementara — root langsung arahkan
// ke dashboard (sudah login) atau halaman login.
export default async function HomePage() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // Invalid JWT / DB error — treat as no session
  }

  redirect(session ? "/dashboard" : "/login");
}
