"use server";
import { revalidatePath } from "next/cache";
import { and, count, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/toast";
import { PAGE_SIZE, type PagedResult } from "../_components/paged-result";

export async function listCategories(params: { q?: string; type?: "global" | "own"; page?: number } = {}) {
  const { clientId } = await requireGestor();
  const page = params.page && params.page >= 1 ? params.page : 1;
  const ownership = or(isNull(categories.clientId), eq(categories.clientId, clientId));
  const typeFilter =
    params.type === "global" ? isNull(categories.clientId) : params.type === "own" ? eq(categories.clientId, clientId) : undefined;
  const where = and(ownership, typeFilter, params.q ? ilike(categories.name, `%${params.q}%`) : undefined);

  const [data, [{ value: total }]] = await Promise.all([
    db.query.categories.findMany({
      where,
      orderBy: (c, { asc }) => [asc(c.name)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ value: count() }).from(categories).where(where),
  ]);

  return { data, total } satisfies PagedResult<(typeof data)[number]>;
}

// Lista completa, sem paginação — pra pickers (ex: selecionar categoria da
// pergunta), onde truncar em 20 esconderia opções silenciosamente.
export async function listAllCategories() {
  const { clientId } = await requireGestor();
  return db.query.categories.findMany({
    where: or(isNull(categories.clientId), eq(categories.clientId, clientId)),
    orderBy: (c, { asc }) => [asc(c.name)],
  });
}

export async function createCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { clientId } = await requireGestor();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { ok: false, error: "Nome é obrigatório" };
  await db.insert(categories).values({ clientId, name, description });
  revalidatePath("/app/categorias");
  return { ok: true };
}

export async function updateCategory(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { ok: false, error: "Nome é obrigatório" };
  await db
    .update(categories)
    .set({ name, description, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.clientId, clientId))); // globais não são editáveis
  revalidatePath("/app/categorias");
  return { ok: true };
}
