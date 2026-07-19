import { describe, it, expect } from "vitest";
import { buildCategoryPrompt, buildCyclePrompt } from "@/lib/analysis/prompts";
import type { CategoryAggregate } from "@/lib/analysis/aggregate";

const category: CategoryAggregate = {
  categoryId: "c1",
  categoryName: "Clima",
  questions: [{
    questionId: "q1", text: "Como avalia o ambiente?", answerType: "scale",
    analysisGoal: "Medir percepção do ambiente", howToWork: "Se baixo, rodar 1:1s",
    isSensitive: false, responseCount: 2,
    metrics: { kind: "numeric", mean: 3, distribution: { "2": 1, "4": 1 } },
  }],
};

describe("buildCategoryPrompt", () => {
  const prompt = buildCategoryPrompt(category);
  it("inclui categoria, pergunta, objetivo e como trabalhar", () => {
    expect(prompt).toContain("Clima");
    expect(prompt).toContain("Como avalia o ambiente?");
    expect(prompt).toContain("Medir percepção do ambiente");
    expect(prompt).toContain("Se baixo, rodar 1:1s");
  });
  it("inclui métricas agregadas", () => {
    expect(prompt).toContain('"mean": 3');
  });
  it("pede JSON com summary, score e recommendations", () => {
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"score"');
    expect(prompt).toContain('"recommendations"');
  });
  it("proíbe identificação de indivíduos", () => {
    expect(prompt.toLowerCase()).toContain("nunca identifique");
  });
});

describe("buildCyclePrompt", () => {
  it("inclui resumos por categoria", () => {
    const prompt = buildCyclePrompt([{ categoryName: "Clima", summary: "Ambiente mediano", score: 60 }]);
    expect(prompt).toContain("Clima");
    expect(prompt).toContain("Ambiente mediano");
  });
});
