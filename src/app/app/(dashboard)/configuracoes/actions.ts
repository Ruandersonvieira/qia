"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export async function updateClientSettings(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const { clientId } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const minAnonymityN = Number(formData.get("minAnonymityN"));
  if (!name) return { error: "Nome é obrigatório" };
  if (!Number.isFinite(minAnonymityN) || minAnonymityN < 1) {
    return { error: "Anonimato mínimo deve ser um número maior ou igual a 1" };
  }

  await db
    .update(clients)
    .set({ name, settings: { minAnonymityN: Math.floor(minAnonymityN) }, updatedAt: new Date() })
    .where(eq(clients.id, clientId));

  revalidatePath("/app/configuracoes");
  return {};
}
