export type AnswerTypeName = "scale" | "single_choice" | "multi_choice" | "nps" | "free_text" | "boolean";

export type QuestionInput = {
  id: string; text: string; answerType: AnswerTypeName; analysisGoal: string; howToWork: string;
  isSensitive: boolean; categoryId: string; categoryName: string;
  options: Array<{ id: string; label: string }>;
  config: { min?: number; max?: number };
};

export type AnswerInput = {
  questionId: string; anonKey: string;
  valueNumeric: number | null; maskedText: string | null; valueOptions: string[] | null;
};

export type QuestionAggregate = {
  questionId: string; text: string; answerType: AnswerTypeName; analysisGoal: string; howToWork: string;
  isSensitive: boolean; responseCount: number;
  metrics:
    | { kind: "numeric"; mean: number; distribution: Record<string, number> }
    | { kind: "nps"; score: number; promoters: number; passives: number; detractors: number }
    | { kind: "options"; counts: Record<string, number> }
    | { kind: "boolean"; yes: number; no: number }
    | { kind: "text"; texts: string[] };
};

export type CategoryAggregate = { categoryId: string; categoryName: string; questions: QuestionAggregate[] };

function aggregateQuestion(question: QuestionInput, qAnswers: AnswerInput[]): QuestionAggregate {
  const base = {
    questionId: question.id, text: question.text, answerType: question.answerType,
    analysisGoal: question.analysisGoal, howToWork: question.howToWork,
    isSensitive: question.isSensitive, responseCount: qAnswers.length,
  };
  switch (question.answerType) {
    case "scale": {
      const values = qAnswers.map((a) => a.valueNumeric).filter((v): v is number => v != null);
      const mean = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      const distribution: Record<string, number> = {};
      for (const v of values) distribution[String(v)] = (distribution[String(v)] ?? 0) + 1;
      return { ...base, metrics: { kind: "numeric", mean: Number(mean.toFixed(2)), distribution } };
    }
    case "nps": {
      const values = qAnswers.map((a) => a.valueNumeric).filter((v): v is number => v != null);
      const promoters = values.filter((v) => v >= 9).length;
      const passives = values.filter((v) => v >= 7 && v <= 8).length;
      const detractors = values.filter((v) => v <= 6).length;
      const score = values.length ? Math.round(((promoters - detractors) / values.length) * 100) : 0;
      return { ...base, metrics: { kind: "nps", score, promoters, passives, detractors } };
    }
    case "single_choice":
    case "multi_choice": {
      const labelById = new Map(question.options.map((o) => [o.id, o.label]));
      const counts: Record<string, number> = {};
      for (const a of qAnswers) {
        for (const optId of a.valueOptions ?? []) {
          const label = labelById.get(optId) ?? optId;
          counts[label] = (counts[label] ?? 0) + 1;
        }
      }
      return { ...base, metrics: { kind: "options", counts } };
    }
    case "boolean": {
      const yes = qAnswers.filter((a) => a.valueNumeric === 1).length;
      const no = qAnswers.filter((a) => a.valueNumeric === 0).length;
      return { ...base, metrics: { kind: "boolean", yes, no } };
    }
    case "free_text": {
      const texts = qAnswers.map((a) => a.maskedText).filter((t): t is string => !!t);
      return { ...base, metrics: { kind: "text", texts } };
    }
  }
}

export function aggregateByCategory(questions: QuestionInput[], answers: AnswerInput[]): CategoryAggregate[] {
  const byQuestion = new Map<string, AnswerInput[]>();
  for (const a of answers) {
    const list = byQuestion.get(a.questionId) ?? [];
    list.push(a);
    byQuestion.set(a.questionId, list);
  }
  const byCategory = new Map<string, CategoryAggregate>();
  for (const question of questions) {
    const cat = byCategory.get(question.categoryId) ?? {
      categoryId: question.categoryId, categoryName: question.categoryName, questions: [],
    };
    cat.questions.push(aggregateQuestion(question, byQuestion.get(question.id) ?? []));
    byCategory.set(question.categoryId, cat);
  }
  return [...byCategory.values()];
}
