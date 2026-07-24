import { describe, expect, it } from "vitest";
import { rankQuestions } from "./question-ranking";
import type { QuestionAggregate } from "./aggregate";

function q(overrides: Partial<QuestionAggregate> & { metrics: QuestionAggregate["metrics"] }): QuestionAggregate {
  return {
    questionId: "q1", text: "pergunta", answerType: "scale", analysisGoal: "", howToWork: "",
    isSensitive: false, responseCount: 1,
    ...overrides,
  };
}

describe("rankQuestions", () => {
  it("normaliza scale pelo min/max da distribuição observada", () => {
    const { best, worst } = rankQuestions([
      {
        categoryName: "Clima",
        rawMetrics: [
          q({ questionId: "high", metrics: { kind: "numeric", mean: 5, distribution: { "1": 1, "5": 1 } } }),
          q({ questionId: "low", metrics: { kind: "numeric", mean: 1, distribution: { "1": 1, "5": 1 } } }),
        ],
      },
    ]);
    expect(best[0].questionId).toBe("high");
    expect(best[0].healthScore).toBe(100);
    expect(worst[0].questionId).toBe("low");
    expect(worst[0].healthScore).toBe(0);
  });

  it("rescala nps de -100..100 pra 0..100", () => {
    const { best } = rankQuestions([
      { categoryName: "NPS", rawMetrics: [q({ metrics: { kind: "nps", score: 40, promoters: 5, passives: 2, detractors: 1 } })] },
    ]);
    expect(best[0].healthScore).toBe(70);
  });

  it("ignora perguntas sem direção boa/ruim (options, texto) e sem respostas", () => {
    const { best, worst } = rankQuestions([
      {
        categoryName: "Cat",
        rawMetrics: [
          q({ questionId: "opts", metrics: { kind: "options", counts: { a: 3 } } }),
          q({ questionId: "text", metrics: { kind: "text", texts: ["oi"] } }),
          q({ questionId: "empty", responseCount: 0, metrics: { kind: "boolean", yes: 0, no: 0 } }),
        ],
      },
    ]);
    expect(best).toHaveLength(0);
    expect(worst).toHaveLength(0);
  });

  it("não duplica pergunta em best e worst quando há poucas perguntas", () => {
    const { best, worst } = rankQuestions([
      {
        categoryName: "Cat",
        rawMetrics: [
          q({ questionId: "a", metrics: { kind: "boolean", yes: 8, no: 2 } }),
          q({ questionId: "b", metrics: { kind: "boolean", yes: 2, no: 8 } }),
        ],
      },
    ]);
    const ids = [...best, ...worst].map((r) => r.questionId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
