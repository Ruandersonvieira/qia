import { describe, expect, it } from "vitest";
import { buildAssistantSystemPrompt, type AssistantCycleContext } from "@/lib/assistant/prompt";

const ctx: AssistantCycleContext = {
  questionnaireTitle: "Clima Q3",
  questions: [
    { text: "Como está o ambiente?", analysisGoal: "medir clima", howToWork: "rodar 1:1s", categoryName: "Clima" },
  ],
  results: [
    {
      kind: "category_summary", categoryName: "Clima", summary: "Clima em atenção", score: "55",
      recommendations: [{ title: "Rodar 1:1s", description: "com todos" }],
      rawMetrics: [{ questionId: "q1", metrics: { avg: 3.2 } }],
    },
    { kind: "cycle_summary", categoryName: null, summary: "Ciclo ok no geral", score: null, recommendations: [], rawMetrics: {} },
  ],
};

describe("buildAssistantSystemPrompt", () => {
  it("inclui guardrails de anonimato", () => {
    const prompt = buildAssistantSystemPrompt(ctx);
    expect(prompt).toMatch(/anonim/i);
    expect(prompt).toMatch(/agregad/i);
    expect(prompt).toMatch(/individua/i);
  });

  it("inclui dados do ciclo: perguntas, resumos, scores e recomendações", () => {
    const prompt = buildAssistantSystemPrompt(ctx);
    expect(prompt).toContain("Clima Q3");
    expect(prompt).toContain("Como está o ambiente?");
    expect(prompt).toContain("medir clima");
    expect(prompt).toContain("rodar 1:1s");
    expect(prompt).toContain("Clima em atenção");
    expect(prompt).toContain("55");
    expect(prompt).toContain("Rodar 1:1s");
    expect(prompt).toContain("Ciclo ok no geral");
  });
});
