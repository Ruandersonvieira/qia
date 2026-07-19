"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { answers, questionOptions, questionnaires, questions } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";

const ANSWER_TYPES = ["scale", "single_choice", "multi_choice", "nps", "free_text", "boolean"] as const;
type AnswerType = (typeof ANSWER_TYPES)[number];

// clientId é derivado da sessão via requireGestor() — não aceitar clientId como
// argumento externo, pois esta função é chamável como endpoint público (arquivo "use server").
export async function listQuestions(questionnaireId: string) {
  const { clientId } = await requireGestor();
  const rows = await db.query.questions.findMany({
    where: and(eq(questions.questionnaireId, questionnaireId), eq(questions.clientId, clientId)),
    orderBy: (q, { asc }) => [asc(q.position)],
  });
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [options, answeredRows] = await Promise.all([
    db.query.questionOptions.findMany({
      where: inArray(questionOptions.questionId, ids),
      orderBy: (o, { asc }) => [asc(o.position)],
    }),
    db
      .select({ questionId: answers.questionId })
      .from(answers)
      .where(inArray(answers.questionId, ids))
      .groupBy(answers.questionId),
  ]);

  const answeredSet = new Set(answeredRows.map((a) => a.questionId));
  const optionsByQuestion = new Map<string, typeof options>();
  for (const o of options) {
    const list = optionsByQuestion.get(o.questionId);
    if (list) list.push(o);
    else optionsByQuestion.set(o.questionId, [o]);
  }

  return rows.map((q) => ({
    ...q,
    options: optionsByQuestion.get(q.id) ?? [],
    hasAnswers: answeredSet.has(q.id),
  }));
}

export async function createQuestion(formData: FormData) {
  const { clientId } = await requireGestor();
  const questionnaireId = String(formData.get("questionnaireId"));

  // Garante que o questionário pertence ao cliente da sessão antes de inserir.
  const questionnaire = await db.query.questionnaires.findFirst({
    where: and(eq(questionnaires.id, questionnaireId), eq(questionnaires.clientId, clientId)),
  });
  if (!questionnaire) return;

  const answerTypeRaw = String(formData.get("answerType"));
  if (!(ANSWER_TYPES as readonly string[]).includes(answerTypeRaw)) return;
  const answerType = answerTypeRaw as AnswerType;

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(position), 0)` })
    .from(questions)
    .where(and(eq(questions.questionnaireId, questionnaireId), eq(questions.clientId, clientId)));

  const config =
    answerType === "scale"
      ? {
          min: Number(formData.get("scaleMin") ?? 1),
          max: Number(formData.get("scaleMax") ?? 5),
          minLabel: String(formData.get("scaleMinLabel") ?? ""),
          maxLabel: String(formData.get("scaleMaxLabel") ?? ""),
        }
      : {};

  const [q] = await db
    .insert(questions)
    .values({
      clientId,
      questionnaireId,
      categoryId: String(formData.get("categoryId")),
      position: max + 1,
      text: String(formData.get("text") ?? "").trim(),
      analysisGoal: String(formData.get("analysisGoal") ?? "").trim(),
      howToWork: String(formData.get("howToWork") ?? "").trim(),
      answerType,
      isRequired: formData.get("isRequired") === "on",
      isSensitive: formData.get("isSensitive") === "on",
      config,
    })
    .returning();

  if (answerType === "single_choice" || answerType === "multi_choice") {
    const labels = String(formData.get("options") ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (labels.length) {
      await db.insert(questionOptions).values(
        labels.map((label, i) => ({
          questionId: q.id,
          position: i + 1,
          label,
          value: label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_"),
        }))
      );
    }
  }
  revalidatePath(`/app/questionarios/${questionnaireId}`);
}

export async function archiveQuestion(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const questionnaireId = String(formData.get("questionnaireId"));
  await db
    .update(questions)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(questions.id, id), eq(questions.clientId, clientId)));
  revalidatePath(`/app/questionarios/${questionnaireId}`);
}

export async function deleteQuestion(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const questionnaireId = String(formData.get("questionnaireId"));
  const question = await db.query.questions.findFirst({
    where: and(eq(questions.id, id), eq(questions.clientId, clientId)),
  });
  if (!question) return; // não existe ou não é deste client
  const hasAnswers = await db.query.answers.findFirst({ where: eq(answers.questionId, id) });
  if (hasAnswers) return; // com resposta: só arquivar
  await db.transaction(async (tx) => {
    await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));
    await tx.delete(questions).where(and(eq(questions.id, id), eq(questions.clientId, clientId)));
  });
  revalidatePath(`/app/questionarios/${questionnaireId}`);
}

export async function moveQuestion(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const questionnaireId = String(formData.get("questionnaireId"));
  const direction = String(formData.get("direction")); // "up" | "down"
  const all = await db.query.questions.findMany({
    where: and(eq(questions.questionnaireId, questionnaireId), eq(questions.clientId, clientId), eq(questions.status, "active")),
    orderBy: (q, { asc }) => [asc(q.position)],
  });
  const idx = all.findIndex((q) => q.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= all.length) return;
  await db.transaction(async (tx) => {
    await tx.update(questions).set({ position: all[swapWith].position }).where(eq(questions.id, all[idx].id));
    await tx.update(questions).set({ position: all[idx].position }).where(eq(questions.id, all[swapWith].id));
  });
  revalidatePath(`/app/questionarios/${questionnaireId}`);
}
