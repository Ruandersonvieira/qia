import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptInviteForm } from "./accept-invite-form";

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invited = await db.query.users.findFirst({ where: eq(users.inviteToken, token) });
  const invalid =
    !invited || invited.status !== "invited" || !invited.inviteExpiresAt || invited.inviteExpiresAt < new Date();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        {invalid ? (
          <CardHeader>
            <CardTitle>Convite inválido ou expirado</CardTitle>
          </CardHeader>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Bem-vindo, {invited.name} — defina sua senha</CardTitle>
            </CardHeader>
            <CardContent>
              <AcceptInviteForm token={token} />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
