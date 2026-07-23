"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, or, isNull, count, inArray, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { analysisResults, answers, categories, clients, cycles, questionnaires, questionOptions, questions, responses } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";
import { runAnalysis } from "@/lib/analysis/pipeline";
import { aggregateByCategory, type AnswerInput, type QuestionAggregate, type QuestionInput } from "@/lib/analysis/aggregate";
import { rankQuestions } from "@/lib/analysis/question-ranking";

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

// Ciclos abertos de todos os questionários do client, para o dashboard —
// não existe listagem por questionnaireId aqui, é cross-questionário.
export async function listOpenCyclesForClient() {
  const { clientId } = await requireGestor();
  const openCycles = await db.query.cycles.findMany({
    where: and(eq(cycles.clientId, clientId), eq(cycles.status, "open")),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  if (openCycles.length === 0) return [];

  const cycleIds = openCycles.map((c) => c.id);
  const questionnaireIds = [...new Set(openCycles.map((c) => c.questionnaireId))];

  const [questionnaireRows, responseCounts] = await Promise.all([
    db.query.questionnaires.findMany({
      where: and(eq(questionnaires.clientId, clientId), inArray(questionnaires.id, questionnaireIds)),
    }),
    db
      .select({ cycleId: responses.cycleId, value: count() })
      .from(responses)
      .where(and(eq(responses.clientId, clientId), eq(responses.status, "submitted"), inArray(responses.cycleId, cycleIds)))
      .groupBy(responses.cycleId),
  ]);

  const titleById = new Map(questionnaireRows.map((q) => [q.id, q.title]));
  const responseCountById = new Map(responseCounts.map((r) => [r.cycleId, r.value]));

  return openCycles.map((cycle) => ({
    cycle,
    questionnaireTitle: titleById.get(cycle.questionnaireId) ?? "—",
    responseCount: responseCountById.get(cycle.id) ?? 0,
  }));
}

// Visão geral da tela /app/ciclos: todos os ciclos do client (com título do
// questionário e contagem de respostas enviadas), KPIs agregados e tendências
// por categoria do último ciclo analisado.
export async function getCiclosOverview() {
  const { clientId } = await requireGestor();

  const cycleRows = await db
    .select({
      id: cycles.id,
      status: cycles.status,
      startsAt: cycles.startsAt,
      endsAt: cycles.endsAt,
      questionCount: cycles.questionCount,
      analysisError: cycles.analysisError,
      createdAt: cycles.createdAt,
      questionnaireTitle: questionnaires.title,
      responseCount: count(responses.id),
    })
    .from(cycles)
    .innerJoin(questionnaires, eq(cycles.questionnaireId, questionnaires.id))
    .leftJoin(responses, and(eq(responses.cycleId, cycles.id), eq(responses.status, "submitted")))
    .where(eq(cycles.clientId, clientId))
    .groupBy(cycles.id, questionnaires.title)
    .orderBy(desc(cycles.createdAt));

  const openCycles = cycleRows.filter((c) => c.status === "open").length;
  const totalResponses = cycleRows.reduce((sum, c) => sum + c.responseCount, 0);
  const lastAnalyzed = cycleRows.find((c) => c.status === "analyzed") ?? null;

  let categoryTrends: Array<{ categoryName: string; score: number | null; trend: "up" | "stable" | "down" | null }> = [];
  if (lastAnalyzed) {
    const [results, categoryRows] = await Promise.all([
      db.query.analysisResults.findMany({
        where: and(
          eq(analysisResults.cycleId, lastAnalyzed.id),
          eq(analysisResults.clientId, clientId),
          eq(analysisResults.kind, "category_summary")
        ),
      }),
      db.query.categories.findMany({
        where: or(isNull(categories.clientId), eq(categories.clientId, clientId)),
      }),
    ]);
    const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
    categoryTrends = results.map((r) => ({
      categoryName: (r.categoryId && categoryNameById.get(r.categoryId)) || "Categoria",
      score: r.score != null ? Number(r.score) : null,
      trend: r.trend,
    }));
  }

  return { cycles: cycleRows, kpis: { openCycles, totalResponses }, categoryTrends };
}

// Resumo ao vivo das respostas antes da análise por IA (open/closed/processing) —
// mesma regra de anonimato (minAnonymityN) da pipeline, mas texto livre nunca
// aparece aqui: não foi mascarado ainda, só entra na análise/relatório.
export async function getCycleRawSummary(cycleId: string) {
  const { clientId } = await requireGestor();
  const cycle = await db.query.cycles.findFirst({ where: and(eq(cycles.id, cycleId), eq(cycles.clientId, clientId)) });
  if (!cycle) return null;

  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  const minN = client?.settings.minAnonymityN ?? 5;

  const qRows = await db
    .select({ q: questions, categoryName: categories.name })
    .from(questions)
    .innerJoin(categories, eq(questions.categoryId, categories.id))
    .where(and(eq(questions.questionnaireId, cycle.questionnaireId), eq(questions.status, "active")));

  const nonTextRows = qRows.filter((r) => r.q.answerType !== "free_text");
  const optionRows = nonTextRows.length
    ? await db.query.questionOptions.findMany({ where: inArray(questionOptions.questionId, nonTextRows.map((r) => r.q.id)) })
    : [];

  const respRows = await db.query.responses.findMany({
    where: and(eq(responses.cycleId, cycleId), eq(responses.clientId, clientId), eq(responses.status, "submitted")),
  });
  const responseCount = respRows.length;

  const answerRows = respRows.length
    ? await db.query.answers.findMany({ where: inArray(answers.responseId, respRows.map((r) => r.id)) })
    : [];

  const includedQuestions: QuestionInput[] = nonTextRows
    .filter((r) => !r.q.isSensitive || responseCount >= minN)
    .map((r) => ({
      id: r.q.id, text: r.q.text, answerType: r.q.answerType,
      analysisGoal: r.q.analysisGoal, howToWork: r.q.howToWork,
      isSensitive: r.q.isSensitive, categoryId: r.q.categoryId, categoryName: r.categoryName,
      options: optionRows.filter((o) => o.questionId === r.q.id).map((o) => ({ id: o.id, label: o.label })),
      config: r.q.config,
    }));
  const includedIds = new Set(includedQuestions.map((q) => q.id));

  const answerInputs: AnswerInput[] = answerRows
    .filter((a) => includedIds.has(a.questionId))
    .map((a) => ({
      questionId: a.questionId,
      anonKey: "",
      valueNumeric: a.valueNumeric != null ? Number(a.valueNumeric) : null,
      maskedText: null,
      valueOptions: a.valueOptions,
    }));

  const categoriesAgg = aggregateByCategory(includedQuestions, answerInputs).filter((c) => c.questions.length > 0);
  const freeTextQuestionCount = qRows.length - nonTextRows.length;
  const hiddenSensitiveCount = nonTextRows.length - includedQuestions.length;

  return { responseCount, categoriesAgg, freeTextQuestionCount, hiddenSensitiveCount, minN };
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
  const insights = results.find((r) => r.kind === "cycle_insights") ?? null;
  const categorySummaries = results
    .filter((r) => r.kind === "category_summary")
    .map((r) => ({ ...r, categoryName: (r.categoryId && categoryNameById.get(r.categoryId)) || "Categoria" }));

  const allQuestions = categorySummaries.flatMap((c) => (Array.isArray(c.rawMetrics) ? (c.rawMetrics as QuestionAggregate[]) : []));
  const npsScores = allQuestions.filter((q) => q.metrics.kind === "nps").map((q) => (q.metrics as { score: number }).score);
  const npsAvg = npsScores.length ? Math.round(npsScores.reduce((s, v) => s + v, 0) / npsScores.length) : null;
  const participationRate = cycle.maxResponses ? result.responseCount / cycle.maxResponses : null;
  const questionRanking = rankQuestions(categorySummaries.map((c) => ({ categoryName: c.categoryName, rawMetrics: c.rawMetrics as QuestionAggregate[] })));

  return {
    ...result,
    cycleSummary,
    categorySummaries,
    insights,
    kpis: {
      overallScore: cycleSummary?.score != null ? Number(cycleSummary.score) : null,
      overallTrend: cycleSummary?.trend ?? null,
      npsAvg,
      participationRate,
    },
    questionRanking,
  };
}
