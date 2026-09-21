"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export interface GuardUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  unitId?: string | null;
  unitIsRetail?: boolean | null;
  lembagaId?: string | null;
}

export interface PageGuardOptions {
  allow?: (user: GuardUser | null) => boolean;
  redirectTo?: string;
}

const DEFAULT_REDIRECT = "/dashboard";

export function usePageGuard(roles?: string[], opts?: PageGuardOptions) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = (session?.user as GuardUser | undefined) ?? null;
  const redirectTo = opts?.redirectTo ?? DEFAULT_REDIRECT;
  const allow = opts?.allow;
  const rolesList = roles ?? [];

  const permitted = allow
    ? allow(user)
    : !!user?.role && rolesList.includes(user.role);

  useEffect(() => {
    if (status === "loading") return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!permitted) router.replace(redirectTo);
  }, [status, user, permitted, router, redirectTo, rolesList, allow]);

  return { permitted, user, status };
}