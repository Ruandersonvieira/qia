"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
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

  let signup;
  try {
    signup = await auth.api.signUpEmail({
      body: { email: invited.email, password, name: invited.name },
    });
  } catch {
    return { error: "Não foi possível concluir o cadastro. Este email pode já possuir uma conta ativa — contate o suporte." };
  }

  await db
    .update(users)
    .set({ authUserId: signup.user.id, status: "active", inviteToken: null, inviteExpiresAt: null })
    .where(eq(users.id, invited.id));

  redirect("/app/login?convite=ok");
}
