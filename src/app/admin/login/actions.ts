"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { masterUsers } from "@/db/schema";
import { createMasterToken, MASTER_COOKIE } from "@/lib/auth/master-session";

export async function masterLogin(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const master = await db.query.masterUsers.findFirst({ where: eq(masterUsers.email, email) });
  if (!master || master.status !== "active" || !(await bcrypt.compare(password, master.passwordHash))) {
    return { error: "Credenciais inválidas" };
  }
  (await cookies()).set(MASTER_COOKIE, await createMasterToken(master.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}
