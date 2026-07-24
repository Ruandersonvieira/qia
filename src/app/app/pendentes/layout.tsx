import { requireRespondent } from "@/lib/auth/session";
import { RespondentSidebar } from "./respondent-sidebar";

export default async function PendentesLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRespondent();
  return (
    <div className="flex min-h-screen">
      <RespondentSidebar userName={user.name} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
