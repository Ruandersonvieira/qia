"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, or, isNull, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { analysisResults, categories, cycles, questionnaires, questions, responses } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";
import { runAnalysis } from "@/lib/analysis/pipeline";

// datetime-local não carrega fuso; interpreta o valor no fuso do browser do
// gestor (tzOffset em minutos, padrão getTimezoneOffset). Sem offset, cai no
// fuso do servidor (comportamento antigo).
function parseLocalDatetime(value: string, tzOffsetRaw: string): Date {
  const tzOffset = Number(tzOffsetRaw);
  if (!tzOffsetRaw || !Number.isFinite(tzOffset)) return new Date(value);
  const iso = value.length === 16 ? `${value}:00` : value; // datetime-local pode omitir segundos
  return new Date(Date.parse(`${iso}Z`) + tzOffset * 60_000);
}

function parseMaxResponses(raw: string): number | null {
  const n = Number(raw);
  return raw && Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

export async function openPublicCycle(formData: FormData) {
  const { clientId } = await requireGestor();
  const questionnaireId = String(formData.get("questionnaireId"));
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const maxResponsesRaw = String(formData.get("maxResponses") ?? "");
  const tzOffsetRaw = String(formData.get("tzOffset") ?? "");

  // Garante que o questionário pertence ao client da sessão e está ativo antes
  // de contar perguntas e abrir o ciclo — evita abrir ciclo para questionário
  // de outro client ou fora do status "active".
  const questionnaire = await db.query.questionnaires.findFirst({
    where: and(
      eq(questionnaires.id, questionnaireId),
      eq(questionnaires.clientId, clientId),
      eq(questionnaires.status, "active")
    ),
  });
  if (!questionnaire) throw new Error("Questionário não encontrado ou não está ativo");

  const [{ value: questionCount }] = await db
    .select({ value: count() })
    .from(questions)
    .where(and(eq(questions.questionnaireId, questionnaireId), eq(questions.clientId, clientId), eq(questions.status, "active")));
  if (questionCount === 0) throw new Error("Questionário sem perguntas ativas");

  const [cycle] = await db
    .insert(cycles)
    .values({
      clientId,
      questionnaireId,
      isPublic: true,
      publicToken: nanoid(16),
      questionCount,
      endsAt: endsAtRaw ? parseLocalDatetime(endsAtRaw, tzOffsetRaw) : null,
      maxResponses: parseMaxResponses(maxResponsesRaw),
      status: "open",
    })
    .returning();

  redirect(`/app/ciclos/${cycle.id}`);
}

// clientId é derivado da sessão via requireGestor() — não aceitar clientId como
// argumento externo, pois esta função é chamável como endpoint público (arquivo "use server").
export async function listCycles(questionnaireId: string) {
  const { clientId } = await requireGestor();
  return db.query.cycles.findMany({
    where: and(eq(cycles.questionnaireId, questionnaireId), eq(cycles.clientId, clientId)),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
}

export async function getCycle(id: string) {
  const { clientId } = await requireGestor();
  const cycle = await db.query.cycles.findFirst({
    where: and(eq(cycles.id, id), eq(cycles.clientId, clientId)),
  });
  if (!cycle) return null;

  const [questionnaire, [{ value: responseCount }]] = await Promise.all([
    db.query.questionnaires.findFirst({
      where: and(eq(questionnaires.id, cycle.questionnaireId), eq(questionnaires.clientId, clientId)),
    }),
    db
      .select({ value: count() })
      .from(responses)
      .where(and(eq(responses.cycleId, cycle.id), eq(responses.clientId, clientId), eq(responses.status, "submitted"))),
  ]);

  return { cycle, questionnaire, responseCount };
}

export async function closeAndAnalyze(formData: FormData) {
  const { clientId } = await requireGestor();
  const cycleId = String(formData.get("cycleId"));
  const cycle = await db.query.cycles.findFirst({ where: and(eq(cycles.id, cycleId), eq(cycles.clientId, clientId)) });
  if (!cycle || (cycle.status !== "open" && cycle.status !== "closed")) return;
  try {
    await runAnalysis(cycleId);
  } catch {
    // erro fica registrado em cycles.analysisError; página exibe
  }
  revalidatePath(`/app/ciclos/${cycleId}`);
}

// Relatório final: ciclo (escopo clientId) + resultados da análise + nomes de
// categoria (globais ou do client, já que categories.clientId pode ser null).
export async function getCycleReport(id: string) {
  const { clientId } = await requireGestor();
  const result = await getCycle(id);
  if (!result || !result.questionnaire) return null;
  const { cycle } = result;
  if (cycle.status !== "analyzed") return null;

  const [results, categoryRows] = await Promise.all([
    db.query.analysisResults.findMany({
      where: and(eq(analysisResults.cycleId, cycle.id), eq(analysisResults.clientId, clientId)),
    }),
    db.query.categories.findMany({
      where: or(isNull(categories.clientId), eq(categories.clientId, clientId)),
    }),
  ]);

  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
  const cycleSummary = results.find((r) => r.kind === "cycle_summary") ?? null;
  const categorySummaries = results
    .filter((r) => r.kind === "category_summary")
    .map((r) => ({ ...r, categoryName: (r.categoryId && categoryNameById.get(r.categoryId)) || "Categoria" }));

  return { ...result, cycleSummary, categorySummaries };
}
