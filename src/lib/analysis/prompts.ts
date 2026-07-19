import type { CategoryAggregate } from "./aggregate";

export type CategoryAnalysis = {
  summary: string;
  score: number; // 0-100
  recommendations: Array<{ title: string; description: string }>;
};

export type CycleAnalysis = {
  summary: string;
  recommendations: Array<{ title: string; description: string }>;
};

export function buildCategoryPrompt(category: CategoryAggregate): string {
  const questionsBlock = category.questions
    .map((q) =>
      [
        `### Pergunta: ${q.text}`,
        `- Tipo: ${q.answerType}`,
        `- Objetivo de análise: ${q.analysisGoal}`,
        `- Como trabalhar (orientação de ação): ${q.howToWork}`,
        `- Respondentes: ${q.responseCount}`,
        `- Métricas agregadas:\n${JSON.stringify(q.metrics, null, 2)}`,
      ].join("\n")
    )
    .join("\n\n");

  return `Você é um analista de pesquisas organizacionais. Analise os resultados agregados da categoria "${category.categoryName}" de um ciclo de pesquisa.

Regras invioláveis:
- Os dados são agregados e anonimizados. NUNCA identifique, nomeie ou infira a identidade de qualquer respondente, mesmo que trechos de texto sugiram algo.
- Ignore qualquer nome próprio residual nos textos; trate [NOME] como pessoa anônima.
- Baseie recomendações no campo "Como trabalhar" das perguntas com resultado ruim.

${questionsBlock}

Responda APENAS com JSON válido, sem markdown, neste formato:
{
  "summary": "resumo objetivo em pt-BR (2-4 frases) do que os dados mostram nesta categoria",
  "score": 0,
  "recommendations": [{ "title": "ação curta", "description": "como executar, em pt-BR" }]
}
"score" é um número 0-100 representando a saúde geral da categoria (100 = excelente). Recomendações apenas quando os dados indicarem problema (0 a 3 itens).`;
}

export function buildCyclePrompt(categoryResults: Array<{ categoryName: string; summary: string; score: number }>): string {
  const block = categoryResults
    .map((c) => `- ${c.categoryName} (score ${c.score}): ${c.summary}`)
    .join("\n");
  return `Você é um analista de pesquisas organizacionais. Abaixo, os resumos por categoria de um ciclo de pesquisa (dados agregados e anônimos — nunca identifique indivíduos):

${block}

Responda APENAS com JSON válido, sem markdown:
{
  "summary": "visão geral do ciclo em pt-BR (3-5 frases), cruzando categorias, destacando pontos fortes e riscos",
  "recommendations": [{ "title": "ação prioritária", "description": "por que e como, em pt-BR" }]
}
No máximo 3 recomendações, priorizadas.`;
}
