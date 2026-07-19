"use server";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { user as authUser, users } from "@/db/schema";
import { auth } from "@/lib/auth/auth";

export async function acceptInvite(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8) return { error: "Senha precisa de ao menos 8 caracteres" };
  if (password !== confirmPassword) return { error: "As senhas não coincidem" };

  const invited = await db.query.users.findFirst({ where: eq(users.inviteToken, token) });
  if (!invited || invited.status !== "invited" || !invited.inviteExpiresAt || invited.inviteExpiresAt < new Date()) {
    return { error: "Convite inválido ou expirado" };
  }

  let authUserId: string;
  try {
    const signup = await auth.api.signUpEmail({
      body: { email: invited.email, password, name: invited.name },
    });
    authUserId = signup.user.id;
  } catch (err) {
    console.error("acceptInvite: signUpEmail falhou", err);
    // Recuperação: se um aceite anterior criou o auth user mas caiu antes de
    // ativar o convite, adota o auth user existente do mesmo email.
    const existing = await db.query.user.findFirst({
      where: sql`lower(${authUser.email}) = lower(${invited.email})`,
    });
    if (!existing) {
      return { error: "Não foi possível concluir o cadastro. Tente novamente ou contate o suporte." };
    }
    authUserId = existing.id;
  }

  try {
    await db
      .update(users)
      .set({ authUserId, status: "active", inviteToken: null, inviteExpiresAt: null })
      .where(eq(users.id, invited.id));
  } catch (err) {
    console.error("acceptInvite: falha ao ativar usuário convidado", err);
    return { error: "Não foi possível concluir o cadastro. Tente novamente ou contate o suporte." };
  }

  redirect("/app/login?convite=ok");
}
