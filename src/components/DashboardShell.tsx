"use client";

import { usePathname } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";
import { SessionInactivityGuard } from "@/components/SessionInactivityGuard";

export function DashboardShell({ children, isStoreOwner }: { children: React.ReactNode; isStoreOwner: boolean }) {
  const isLogin = usePathname() === "/dashboard/login";
  if (isLogin) return children;

  return (
    <div className="lg:flex">
      <SessionInactivityGuard logoutPath="/dashboard/login?reason=inactive" />
      <DashboardNav isStoreOwner={isStoreOwner} />
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
