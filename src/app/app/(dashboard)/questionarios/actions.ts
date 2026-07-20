"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, count } from "drizzle-orm";
import { db } from "@/db/client";
import { questionnaires, questions } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";

const USE_CASES = ["clima", "nr1", "market_research", "nps", "other"] as const;

export async function listQuestionnaires() {
  const { clientId } = await requireGestor();
  const qs = await db.query.questionnaires.findMany({
    where: eq(questionnaires.clientId, clientId),
    orderBy: (q, { desc }) => [desc(q.createdAt)],
  });
  const counts = await db
    .select({ questionnaireId: questions.questionnaireId, count: count() })
    .from(questions)
    .where(eq(questions.clientId, clientId))
    .groupBy(questions.questionnaireId);
  const countMap = new Map(counts.map((c) => [c.questionnaireId, c.count]));
  return qs.map((q) => ({ ...q, questionCount: countMap.get(q.id) ?? 0 }));
}

// clientId é derivado da sessão via requireGestor() — não aceitar clientId como
// argumento externo, pois esta função é chamável como endpoint público (arquivo "use server").
export async function getQuestionnaire(id: string) {
  const { clientId } = await requireGestor();
  return db.query.questionnaires.findFirst({
    where: and(eq(questionnaires.id, id), eq(questionnaires.clientId, clientId)),
  });
}

export async function createQuestionnaire(formData: FormData) {
  const { clientId } = await requireGestor();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const useCaseRaw = String(formData.get("useCase") ?? "");
  if (!title) return;
  const [q] = await db
    .insert(questionnaires)
    .values({
      clientId,
      title,
      description,
      useCase: (USE_CASES as readonly string[]).includes(useCaseRaw) ? (useCaseRaw as (typeof USE_CASES)[number]) : null,
    })
    .returning();
  redirect(`/app/questionarios/${q.id}`);
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
