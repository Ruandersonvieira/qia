import { describe, it, expect, beforeAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { analysisResults, answers, categories, clients, cycles, questionnaires, questions, responses, usageRecords } from "@/db/schema";
import { runAnalysis } from "@/lib/analysis/pipeline";

let cycleId: string;

const fakeComplete = async (prompt: string) => {
  if (prompt.includes("resumos por categoria")) {
    return { summary: "Ciclo ok no geral", recommendations: [{ title: "Agir", description: "..." }] };
  }
  return { summary: "Categoria com atenção", score: 55, recommendations: [{ title: "Rodar 1:1s", description: "..." }] };
};

beforeAll(async () => {
  const [client] = await db.insert(clients).values({ name: "P", slug: `p-${nanoid(6)}` }).returning();
  const [cat] = await db.insert(categories).values({ clientId: client.id, name: "Clima" }).returning();
  const [catSens] = await db.insert(categories).values({ clientId: client.id, name: "Demografia" }).returning();
  const [qn] = await db.insert(questionnaires).values({ clientId: client.id, title: "Q", status: "active" }).returning();
  const [q1] = await db.insert(questions).values({
    clientId: client.id, questionnaireId: qn.id, categoryId: cat.id, position: 1,
    text: "Ambiente?", analysisGoal: "g", howToWork: "h", answerType: "scale", config: { min: 1, max: 5 },
  }).returning();
  const [q2] = await db.insert(questions).values({
    clientId: client.id, questionnaireId: qn.id, categoryId: cat.id, position: 2,
    text: "Comentários?", analysisGoal: "g", howToWork: "h", answerType: "free_text",
  }).returning();
  const [q3] = await db.insert(questions).values({
    clientId: client.id, questionnaireId: qn.id, categoryId: catSens.id, position: 3,
    text: "Etnia?", analysisGoal: "g", howToWork: "h", answerType: "free_text", isSensitive: true,
  }).returning();
  const [cycle] = await db.insert(cycles).values({
    clientId: client.id, questionnaireId: qn.id, isPublic: true, publicToken: nanoid(16),
    questionCount: 3, status: "closed",
  }).returning();
  cycleId = cycle.id;
  // 2 respostas (< minAnonymityN=5 → pergunta sensível fica fora)
  for (const [i, score] of [4, 2].entries()) {
    const [r] = await db.insert(responses).values({
      clientId: client.id, cycleId, anonKey: `anon-${i}`, sessionFingerprint: `fp-${i}`,
      submittedAt: new Date(), status: "submitted",
    }).returning();
    await db.insert(answers).values([
      { responseId: r.id, questionId: q1.id, valueNumeric: String(score) },
      { responseId: r.id, questionId: q2.id, valueText: "Muita pressão da Maria Silva" },
      { responseId: r.id, questionId: q3.id, valueText: "parda" },
    ]);
  }
});

describe("runAnalysis", () => {
  it("gera analysis_results por categoria + resumo do ciclo e usage_record", async () => {
    await runAnalysis(cycleId, fakeComplete);

    const cycle = await db.query.cycles.findFirst({ where: eq(cycles.id, cycleId) });
    expect(cycle!.status).toBe("analyzed");

    const results = await db.query.analysisResults.findMany({ where: eq(analysisResults.cycleId, cycleId) });
    const kinds = results.map((r) => r.kind).sort();
    // 1 category_summary (Clima) + 1 cycle_summary; Demografia excluída pelo N mínimo
    expect(kinds).toEqual(["category_summary", "cycle_summary"]);

    const [usage] = await db.query.usageRecords.findMany({ where: eq(usageRecords.cycleId, cycleId) });
    expect(usage.questionCount).toBe(3);
    expect(usage.responseCount).toBe(2);
    expect(Number(usage.billableUnits)).toBe(6); // 3 perguntas x 2 respostas

    // mascaramento persistido
    const persisted = await db.query.answers.findMany();
    const withMask = persisted.find((a) => a.valueText === "Muita pressão da Maria Silva");
    expect(withMask!.maskedText).toBe("Muita pressão da [NOME]");
  });

  it("é idempotente (reprocessar substitui resultados)", async () => {
    await db.update(cycles).set({ status: "closed" }).where(eq(cycles.id, cycleId));
    await runAnalysis(cycleId, fakeComplete);
    const results = await db.query.analysisResults.findMany({ where: eq(analysisResults.cycleId, cycleId) });
    expect(results).toHaveLength(2);
  });

  it("em erro, volta status pra closed e grava analysisError", async () => {
    await db.update(cycles).set({ status: "closed" }).where(eq(cycles.id, cycleId));
    const boom = async () => { throw new Error("api caiu"); };
    await expect(runAnalysis(cycleId, boom)).rejects.toThrow();
    const cycle = await db.query.cycles.findFirst({ where: eq(cycles.id, cycleId) });
    expect(cycle!.status).toBe("closed");
    expect(cycle!.analysisError).toContain("api caiu");
  });

  it("grava trend comparando com o ciclo anterior analisado", async () => {
    // ciclo 1 já está analyzed (score 55 no fakeComplete)
    const first = await db.query.cycles.findFirst({ where: eq(cycles.id, cycleId) });
    await db.update(cycles).set({ status: "analyzed" }).where(eq(cycles.id, cycleId));
    const [second] = await db.insert(cycles).values({
      clientId: first!.clientId, questionnaireId: first!.questionnaireId, isPublic: true,
      publicToken: nanoid(16), questionCount: 3, status: "closed",
      startsAt: new Date(first!.startsAt.getTime() + 1000),
    }).returning();
    const [r] = await db.insert(responses).values({
      clientId: first!.clientId, cycleId: second.id, anonKey: "anon-t", sessionFingerprint: "fp-t",
      submittedAt: new Date(), status: "submitted",
    }).returning();
    const qs = await db.query.questions.findMany({
      where: eq(questions.questionnaireId, first!.questionnaireId),
    });
    const scaleQ = qs.find((q) => q.answerType === "scale")!;
    await db.insert(answers).values([{ responseId: r.id, questionId: scaleQ.id, valueNumeric: "5" }]);

    const fakeComplete70 = async (prompt: string) => {
      if (prompt.includes("resumos por categoria")) {
        return { summary: "Ciclo melhorou", recommendations: [] };
      }
      return { summary: "Categoria saudável", score: 70, recommendations: [] };
    };
    await runAnalysis(second.id, fakeComplete70);

    const results = await db.query.analysisResults.findMany({
      where: and(eq(analysisResults.cycleId, second.id), eq(analysisResults.kind, "category_summary")),
    });
    expect(results.length).toBeGreaterThan(0);
    // 70 vs 55 → Δ +15 → up
    expect(results[0].trend).toBe("up");
  });
});
