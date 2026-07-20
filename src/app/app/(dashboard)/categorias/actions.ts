"use server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";

export async function listCategories() {
  const { clientId } = await requireGestor();
  return db.query.categories.findMany({
    where: or(isNull(categories.clientId), eq(categories.clientId, clientId)),
    orderBy: (c, { asc }) => [asc(c.name)],
  });
}

export async function createCategory(formData: FormData) {
  const { clientId } = await requireGestor();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;
  await db.insert(categories).values({ clientId, name, description });
  revalidatePath("/app/categorias");
}

export async function updateCategory(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;
  await db
    .update(categories)
    .set({ name, description, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.clientId, clientId))); // globais não são editáveis
  revalidatePath("/app/categorias");
}
