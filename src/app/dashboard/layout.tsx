import { DashboardNav } from "@/components/DashboardNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <DashboardNav />
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-8">{children}</main>
    </div>
  );
}
