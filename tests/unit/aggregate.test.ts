import { describe, it, expect } from "vitest";
import { aggregateByCategory, type QuestionInput, type AnswerInput } from "@/lib/analysis/aggregate";

const q = (over: Partial<QuestionInput>): QuestionInput => ({
  id: "q1", text: "Pergunta", answerType: "scale", analysisGoal: "g", howToWork: "h",
  isSensitive: false, categoryId: "c1", categoryName: "Clima", options: [], config: { min: 1, max: 5 },
  ...over,
});

describe("aggregateByCategory", () => {
  it("agrega scale com média e distribuição", () => {
    const answers: AnswerInput[] = [
      { questionId: "q1", anonKey: "a", valueNumeric: 4, maskedText: null, valueOptions: null },
      { questionId: "q1", anonKey: "b", valueNumeric: 2, maskedText: null, valueOptions: null },
    ];
    const [cat] = aggregateByCategory([q({})], answers);
    expect(cat.categoryName).toBe("Clima");
    expect(cat.questions[0].responseCount).toBe(2);
    expect(cat.questions[0].metrics).toEqual({ kind: "numeric", mean: 3, distribution: { "2": 1, "4": 1 } });
  });

  it("agrega nps com promotores/detratores", () => {
    const answers: AnswerInput[] = [9, 10, 7, 3].map((v, i) => ({
      questionId: "q1", anonKey: String(i), valueNumeric: v, maskedText: null, valueOptions: null,
    }));
    const [cat] = aggregateByCategory([q({ answerType: "nps" })], answers);
    // promoters 2, passives 1, detractors 1 → score = (2-1)/4*100 = 25
    expect(cat.questions[0].metrics).toEqual({ kind: "nps", score: 25, promoters: 2, passives: 1, detractors: 1 });
  });

  it("agrega choices por label", () => {
    const question = q({ answerType: "single_choice", options: [{ id: "o1", label: "Sim" }, { id: "o2", label: "Não" }] });
    const answers: AnswerInput[] = [
      { questionId: "q1", anonKey: "a", valueNumeric: null, maskedText: null, valueOptions: ["o1"] },
      { questionId: "q1", anonKey: "b", valueNumeric: null, maskedText: null, valueOptions: ["o1"] },
      { questionId: "q1", anonKey: "c", valueNumeric: null, maskedText: null, valueOptions: ["o2"] },
    ];
    const [cat] = aggregateByCategory([question], answers);
    expect(cat.questions[0].metrics).toEqual({ kind: "options", counts: { Sim: 2, "Não": 1 } });
  });

  it("agrega free_text como lista de textos mascarados", () => {
    const answers: AnswerInput[] = [
      { questionId: "q1", anonKey: "a", valueNumeric: null, maskedText: "muita pressão", valueOptions: null },
    ];
    const [cat] = aggregateByCategory([q({ answerType: "free_text" })], answers);
    expect(cat.questions[0].metrics).toEqual({ kind: "text", texts: ["muita pressão"] });
  });

  it("agrega boolean", () => {
    const answers: AnswerInput[] = [
      { questionId: "q1", anonKey: "a", valueNumeric: 1, maskedText: null, valueOptions: null },
      { questionId: "q1", anonKey: "b", valueNumeric: 0, maskedText: null, valueOptions: null },
    ];
    const [cat] = aggregateByCategory([q({ answerType: "boolean" })], answers);
    expect(cat.questions[0].metrics).toEqual({ kind: "boolean", yes: 1, no: 1 });
  });

  it("agrupa perguntas de categorias diferentes separadamente", () => {
    const qs = [q({}), q({ id: "q2", categoryId: "c2", categoryName: "NPS", answerType: "nps" })];
    const result = aggregateByCategory(qs, []);
    expect(result.map((c) => c.categoryName)).toEqual(["Clima", "NPS"]);
  });
});
