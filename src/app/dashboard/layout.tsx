import { DashboardShell } from "@/components/DashboardShell";
import { isStoreAdminSession } from "@/lib/admin-auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell isStoreOwner={await isStoreAdminSession()}>{children}</DashboardShell>;
}
