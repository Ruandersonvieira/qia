import { redirect } from "next/navigation";
import { requireActiveMember } from "@/lib/auth/session";
import { AppSidebar } from "./app-sidebar";

const GESTOR_ROLES = ["owner", "admin", "manager"];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireActiveMember();
  // Respondent não usa o dashboard de gestão — tem tela própria.
  if (user.role === "respondent") redirect("/app/pendentes");
  if (!GESTOR_ROLES.includes(user.role)) redirect("/app/login?denied=insufficient-role");
  return (
    <div className="flex min-h-screen">
      <AppSidebar userName={user.name} userRole={user.role} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
