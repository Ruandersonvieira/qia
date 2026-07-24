import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";

// Motivo de negação vai na query string do redirect pro login — qualquer
// requireX novo que use loadActiveMember/denyUnless herda a mensagem
// automaticamente, sem precisar de mais um bounce silencioso.
function denyRedirect(reason: string): never {
  redirect(`/app/login?denied=${reason}`);
}

/** Sessão válida + membership ativa, sem checar role — base pra todo requireX. */
export async function requireActiveMember() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/app/login");
  const user = await db.query.users.findFirst({
    where: eq(users.authUserId, session.user.id),
  });
  if (!user) denyRedirect("no-membership");
  if (user.status !== "active") denyRedirect("inactive");
  return user;
}

function denyUnless(user: Awaited<ReturnType<typeof requireActiveMember>>, allowed: boolean) {
  if (!allowed) denyRedirect("insufficient-role");
  return { clientId: user.clientId, user };
}

/** Qualquer membro ativo do client (owner, admin ou manager) — acesso ao dashboard de gestão. */
export async function requireGestor() {
  const user = await requireActiveMember();
  return denyUnless(user, user.role === "owner" || user.role === "admin" || user.role === "manager");
}

/** Só owner/admin — gestão de usuários e configurações do client. */
export async function requireAdmin() {
  const user = await requireActiveMember();
  return denyUnless(user, user.role === "owner" || user.role === "admin");
}

/** Só respondent — tela de ciclos abertos pra responder. */
export async function requireRespondent() {
  const user = await requireActiveMember();
  return denyUnless(user, user.role === "respondent");
}
