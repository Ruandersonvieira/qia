import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  analysisResults, answers, categories, cycles, questionOptions, questions, responses, usageRecords,
} from "@/db/schema";
import { aggregateByCategory, type AnswerInput, type QuestionInput } from "./aggregate";
import { maskNames } from "./mask";
import { buildCategoryPrompt, buildCyclePrompt, type CategoryAnalysis, type CycleAnalysis } from "./prompts";
import { completeJSON, type CompleteJSON } from "./claude";

/** Valida minimamente o shape retornado pelo modelo (após cast) — evita gravar lixo
 * silenciosamente e melhora o path de erro quando o modelo foge do formato pedido. */
function assertCategoryAnalysis(value: CategoryAnalysis, categoryName: string): void {
  if (typeof value?.summary !== "string" || !value.summary) {
    throw new Error(`Resposta inválida do modelo para categoria "${categoryName}": summary ausente ou não é string`);
  }
  if (!Number.isFinite(value.score)) {
    throw new Error(`Resposta inválida do modelo para categoria "${categoryName}": score não é um número finito`);
  }
}

function assertCycleAnalysis(value: CycleAnalysis): void {
  if (typeof value?.summary !== "string" || !value.summary) {
    throw new Error("Resposta inválida do modelo para o resumo do ciclo: summary ausente ou não é string");
  }
}

export async function runAnalysis(cycleId: string, complete: CompleteJSON = completeJSON): Promise<void> {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.id, cycleId) });
  if (!cycle) throw new Error("Ciclo não encontrado");
  if (cycle.status !== "closed" && cycle.status !== "open") throw new Error(`Ciclo em status ${cycle.status}`);

  await db.update(cycles).set({ status: "processing", analysisError: null, updatedAt: new Date() }).where(eq(cycles.id, cycleId));

  try {
    const client = await db.query.clients.findFirst({ where: (c, { eq: eqf }) => eqf(c.id, cycle.clientId) });
    const minN = client?.settings.minAnonymityN ?? 5;

    const qRows = await db
      .select({
        q: questions,
        categoryName: categories.name,
      })
      .from(questions)
      .innerJoin(categories, eq(questions.categoryId, categories.id))
      .where(and(eq(questions.questionnaireId, cycle.questionnaireId), eq(questions.status, "active")));

    const optionRows = qRows.length
      ? await db.query.questionOptions.findMany({ where: inArray(questionOptions.questionId, qRows.map((r) => r.q.id)) })
      : [];

    const respRows = await db.query.responses.findMany({
      where: and(eq(responses.cycleId, cycleId), eq(responses.status, "submitted")),
    });
    const responseCount = respRows.length;
    const anonByResponseId = new Map(respRows.map((r) => [r.id, r.anonKey]));

    const answerRows = respRows.length
      ? await db.query.answers.findMany({ where: inArray(answers.responseId, respRows.map((r) => r.id)) })
      : [];

    // mascarar free_text que ainda não tem maskedText e persistir
    const freeTextQuestionIds = new Set(qRows.filter((r) => r.q.answerType === "free_text").map((r) => r.q.id));
    for (const a of answerRows) {
      if (freeTextQuestionIds.has(a.questionId) && a.valueText && !a.maskedText) {
        a.maskedText = maskNames(a.valueText);
        await db.update(answers).set({ maskedText: a.maskedText, updatedAt: new Date() }).where(eq(answers.id, a.id));
      }
    }

    // regra do N mínimo: pergunta sensível fora se responseCount < minN
    const includedQuestions: QuestionInput[] = qRows
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
        anonKey: anonByResponseId.get(a.responseId) ?? "",
        valueNumeric: a.valueNumeric != null ? Number(a.valueNumeric) : null,
        maskedText: a.maskedText,
        valueOptions: a.valueOptions,
      }));

    const categoriesAgg = aggregateByCategory(includedQuestions, answerInputs).filter((c) => c.questions.length > 0);

    const categoryOutputs: Array<{ categoryId: string; categoryName: string; analysis: CategoryAnalysis; rawMetrics: unknown }> = [];
    for (const cat of categoriesAgg) {
      const analysis = (await complete(buildCategoryPrompt(cat))) as CategoryAnalysis;
      assertCategoryAnalysis(analysis, cat.categoryName);
      categoryOutputs.push({ categoryId: cat.categoryId, categoryName: cat.categoryName, analysis, rawMetrics: cat.questions });
    }

    const cycleAnalysis = (await complete(
      buildCyclePrompt(categoryOutputs.map((c) => ({ categoryName: c.categoryName, summary: c.analysis.summary, score: c.analysis.score })))
    )) as CycleAnalysis;
    assertCycleAnalysis(cycleAnalysis);

    await db.transaction(async (tx) => {
      await tx.delete(analysisResults).where(eq(analysisResults.cycleId, cycleId)); // idempotência
      for (const c of categoryOutputs) {
        await tx.insert(analysisResults).values({
          clientId: cycle.clientId, cycleId, categoryId: c.categoryId, kind: "category_summary",
          summary: c.analysis.summary, score: String(c.analysis.score),
          recommendations: c.analysis.recommendations, rawMetrics: c.rawMetrics,
        });
      }
      await tx.insert(analysisResults).values({
        clientId: cycle.clientId, cycleId, categoryId: null, kind: "cycle_summary",
        summary: cycleAnalysis.summary, recommendations: cycleAnalysis.recommendations, rawMetrics: {},
      });

      const period = new Date().toISOString().slice(0, 8) + "01"; // primeiro dia do mês corrente
      await tx
        .insert(usageRecords)
        .values({
          clientId: cycle.clientId, cycleId, period,
          questionCount: cycle.questionCount, responseCount,
          billableUnits: String(cycle.questionCount * responseCount),
        })
        .onConflictDoUpdate({
          target: [usageRecords.cycleId, usageRecords.period],
          set: { responseCount, billableUnits: String(cycle.questionCount * responseCount), updatedAt: new Date() },
        });

      await tx.update(cycles).set({ status: "analyzed", updatedAt: new Date() }).where(eq(cycles.id, cycleId));
    });
  } catch (e) {
    await db
      .update(cycles)
      .set({ status: "closed", analysisError: e instanceof Error ? e.message : String(e), updatedAt: new Date() })
      .where(eq(cycles.id, cycleId));
    throw e;
  }
}
