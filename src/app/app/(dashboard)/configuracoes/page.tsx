import { eq } from "drizzle-orm";
import { Settings } from "lucide-react";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { SettingsForm } from "./settings-form";
import { ChangePasswordForm } from "./change-password-form";
import { PageContainer } from "../_components/page-container";

export default async function ConfiguracoesPage() {
  const { clientId } = await requireAdmin();
  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  if (!client) throw new Error("Client não encontrado");

  return (
    <PageContainer icon={Settings} title="Configurações">
      <SettingsForm name={client.name} minAnonymityN={client.settings.minAnonymityN} />
      <div>
        <h2 className="text-lg font-semibold text-[#0E2A32]">Segurança</h2>
        <p className="mt-1 text-sm text-muted-foreground">Trocar a senha da sua conta.</p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>
    </PageContainer>
  );
}
