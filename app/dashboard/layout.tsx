import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { DashboardClient } from "./DashboardClient";

export const metadata = {
  title: "Dashboard - ALBA Finance v3",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // JWT/DB error — fall through to redirect
  }

  if (!session?.user || !session.user.isActive) {
    redirect("/login");
  }

  return <DashboardClient user={session.user!} children={children} />;
}
