"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, count, ilike, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { questionnaires, questions } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/toast";
import { PAGE_SIZE, type PagedResult } from "../_components/paged-result";

const USE_CASES = ["clima", "nr1", "market_research", "nps", "other"] as const;

export async function listQuestionnaires(params: { q?: string; status?: string; page?: number } = {}) {
  const { clientId } = await requireGestor();
  const page = params.page && params.page >= 1 ? params.page : 1;
  const where = and(
    eq(questionnaires.clientId, clientId),
    params.q ? ilike(questionnaires.title, `%${params.q}%`) : undefined,
    params.status ? eq(questionnaires.status, params.status as (typeof questionnaires.status.enumValues)[number]) : undefined
  );

  const [qs, [{ value: total }]] = await Promise.all([
    db.query.questionnaires.findMany({
      where,
      orderBy: (q, { desc }) => [desc(q.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ value: count() }).from(questionnaires).where(where),
  ]);

  const counts = qs.length
    ? await db
        .select({ questionnaireId: questions.questionnaireId, count: count() })
        .from(questions)
        .where(and(eq(questions.clientId, clientId), inArray(questions.questionnaireId, qs.map((q) => q.id))))
        .groupBy(questions.questionnaireId)
    : [];
  const countMap = new Map(counts.map((c) => [c.questionnaireId, c.count]));
  const data = qs.map((q) => ({ ...q, questionCount: countMap.get(q.id) ?? 0 }));
  return { data, total } satisfies PagedResult<(typeof data)[number]>;
}

// clientId é derivado da sessão via requireGestor() — não aceitar clientId como
// argumento externo, pois esta função é chamável como endpoint público (arquivo "use server").
export async function getQuestionnaire(id: string) {
  const { clientId } = await requireGestor();
  return db.query.questionnaires.findFirst({
    where: and(eq(questionnaires.id, id), eq(questionnaires.clientId, clientId)),
  });
}

export async function createQuestionnaire(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { clientId } = await requireGestor();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const useCaseRaw = String(formData.get("useCase") ?? "");
  if (!title) return { ok: false, error: "Título é obrigatório" };
  const [q] = await db
    .insert(questionnaires)
    .values({
      clientId,
      title,
      description,
      useCase: (USE_CASES as readonly string[]).includes(useCaseRaw) ? (useCaseRaw as (typeof USE_CASES)[number]) : null,
    })
    .returning();
  // redirect() lança um sinal interno do Next e nunca retorna — a página de
  // destino substitui o modal, então fechar/toast aqui seria inútil.
  redirect(`/app/questionarios/${q.id}`);
}

export async function updateQuestionnaire(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const useCaseRaw = String(formData.get("useCase") ?? "");
  if (!title) return { ok: false, error: "Título é obrigatório" };
  await db
    .update(questionnaires)
    .set({
      title,
      description,
      useCase: (USE_CASES as readonly string[]).includes(useCaseRaw) ? (useCaseRaw as (typeof USE_CASES)[number]) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(questionnaires.id, id), eq(questionnaires.clientId, clientId)));
  revalidatePath(`/app/questionarios/${id}`);
  revalidatePath("/app/questionarios");
  return { ok: true };
}

export async function updateQuestionnaireStatus(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["draft", "active", "archived"].includes(status)) return;
  await db
    .update(questionnaires)
    .set({ status: status as "draft" | "active" | "archived", updatedAt: new Date() })
    .where(and(eq(questionnaires.id, id), eq(questionnaires.clientId, clientId)));
  revalidatePath(`/app/questionarios/${id}`);
  revalidatePath("/app/questionarios");
}
