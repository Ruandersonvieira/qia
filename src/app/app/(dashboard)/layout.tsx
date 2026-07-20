import { requireGestor } from "@/lib/auth/session";
import { AppSidebar } from "./app-sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireGestor();
  return (
    <div className="flex min-h-screen">
      <AppSidebar userName={user.name} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
