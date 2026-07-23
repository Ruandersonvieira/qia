import type { QuestionAggregate } from "./aggregate";

export type RankedQuestion = {
  questionId: string;
  text: string;
  categoryName: string;
  healthScore: number;
};

// Só perguntas com direção boa/ruim inerente entram no ranking — múltipla
// escolha e texto livre não têm "resposta melhor", então ficariam fora de
// contexto num ranking de saúde 0-100.
function questionHealthScore(question: QuestionAggregate): number | null {
  const { metrics } = question;
  if (metrics.kind === "numeric") {
    const values = Object.keys(metrics.distribution).map(Number);
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return 100;
    return ((metrics.mean - min) / (max - min)) * 100;
  }
  if (metrics.kind === "nps") {
    // score já é -100..100 (aggregate.ts); reescala pra 0..100 pra comparar
    // na mesma régua das demais perguntas do ranking.
    return (metrics.score + 100) / 2;
  }
  if (metrics.kind === "boolean") {
    const total = metrics.yes + metrics.no;
    if (total === 0) return null;
    return (metrics.yes / total) * 100;
  }
  return null;
}

export function rankQuestions(
  categories: Array<{ categoryName: string; rawMetrics: QuestionAggregate[] }>,
  size = 3
): { best: RankedQuestion[]; worst: RankedQuestion[] } {
  const ranked: RankedQuestion[] = [];
  for (const cat of categories) {
    for (const q of cat.rawMetrics) {
      if (q.responseCount === 0) continue;
      const healthScore = questionHealthScore(q);
      if (healthScore == null) continue;
      ranked.push({ questionId: q.questionId, text: q.text, categoryName: cat.categoryName, healthScore });
    }
  }
  const sorted = [...ranked].sort((a, b) => b.healthScore - a.healthScore);
  const n = sorted.length;
  // Com poucas perguntas, size melhores + size piores se sobreporiam — divide
  // a lista ao meio nesse caso em vez de deixar o pior lado vazio.
  const bestCount = Math.min(size, Math.ceil(n / 2));
  const worstCount = Math.min(size, n - bestCount);
  const best = sorted.slice(0, bestCount);
  const worst = sorted.slice(n - worstCount, n).reverse();
  return { best, worst };
}
