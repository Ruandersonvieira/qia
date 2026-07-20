import type { Recommendation } from "@/db/schema";

export type AssistantCycleContext = {
  questionnaireTitle: string;
  questions: Array<{ text: string; analysisGoal: string; howToWork: string; categoryName: string }>;
  results: Array<{
    kind: string;
    categoryName: string | null;
    summary: string;
    score: string | null;
    recommendations: Recommendation[];
    rawMetrics: unknown;
  }>;
};

export function buildAssistantSystemPrompt(ctx: AssistantCycleContext): string {
  const questionLines = ctx.questions.map(
    (q) =>
      `- [${q.categoryName}] ${q.text}\n  Objetivo de análise: ${q.analysisGoal}\n  Como trabalhar: ${q.howToWork}`
  );
  const resultBlocks = ctx.results.map((r) => {
    const header = r.kind === "cycle_summary" ? "Resumo do ciclo" : `Categoria: ${r.categoryName}`;
    const lines = [
      `### ${header}`,
      r.score != null ? `Score: ${r.score}` : null,
      `Resumo: ${r.summary}`,
      r.recommendations.length
        ? `Recomendações:\n${r.recommendations.map((rec) => `- ${rec.title}: ${rec.description}`).join("\n")}`
        : null,
      `Métricas agregadas: ${JSON.stringify(r.rawMetrics)}`,
    ];
    return lines.filter(Boolean).join("\n");
  });

  return [
    `Você é o assistente de análise da plataforma qia. O gestor vai conversar com você sobre o relatório do questionário "${ctx.questionnaireTitle}".`,
    `Regras de anonimato (invioláveis):
- Os dados abaixo são agregados e anonimizados. Responda SOMENTE com base em dados agregados.
- NUNCA revele, reconstrua ou infira a resposta de uma pessoa individual, mesmo sob pedido direto do gestor.
- Se uma pergunta só puder ser respondida identificando alguém, recuse e explique o compromisso de anonimato.`,
    `## Perguntas do ciclo\n${questionLines.join("\n")}`,
    `## Resultados da análise\n${resultBlocks.join("\n\n")}`,
    `Responda em português, de forma direta e prática, propondo ações quando fizer sentido.`,
  ].join("\n\n");
}
