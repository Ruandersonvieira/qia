import { and, eq, or, isNull, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { analysisResults, categories, chatMessages, cycles, questionnaires, questions } from "@/db/schema";
import type { ChatMessage, CompleteText } from "@/lib/analysis/claude";
import { completeText } from "@/lib/analysis/provider";
import { buildAssistantSystemPrompt } from "./prompt";

export const HISTORY_LIMIT = 30;

/** Junta mensagens consecutivas do mesmo role — a API da Anthropic exige turnos
 * alternados, e uma falha anterior do provider pode deixar dois "user" seguidos. */
function collapseConsecutiveRoles(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else out.push({ ...m });
  }
  return out;
}

export async function loadCycleContext(clientId: string, cycleId: string) {
  const cycle = await db.query.cycles.findFirst({
    where: and(eq(cycles.id, cycleId), eq(cycles.clientId, clientId)),
  });
  if (!cycle) throw new Error("Ciclo não encontrado");
  if (cycle.status !== "analyzed") throw new Error("Ciclo ainda não analisado");

  const [questionnaire, qRows, results, categoryRows] = await Promise.all([
    db.query.questionnaires.findFirst({
      where: and(eq(questionnaires.id, cycle.questionnaireId), eq(questionnaires.clientId, clientId)),
    }),
    db
      .select({ q: questions, categoryName: categories.name })
      .from(questions)
      .innerJoin(categories, eq(questions.categoryId, categories.id))
      .where(and(eq(questions.questionnaireId, cycle.questionnaireId), eq(questions.status, "active"))),
    db.query.analysisResults.findMany({
      where: and(eq(analysisResults.cycleId, cycleId), eq(analysisResults.clientId, clientId)),
    }),
    db.query.categories.findMany({
      where: or(isNull(categories.clientId), eq(categories.clientId, clientId)),
    }),
  ]);

  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
  return {
    cycle,
    questionnaireTitle: questionnaire?.title ?? "Questionário",
    questions: qRows.map((r) => ({
      text: r.q.text, analysisGoal: r.q.analysisGoal, howToWork: r.q.howToWork, categoryName: r.categoryName,
    })),
    results: results.map((r) => ({
      kind: r.kind,
      categoryName: r.categoryId ? categoryNameById.get(r.categoryId) ?? "Categoria" : null,
      summary: r.summary, score: r.score, recommendations: r.recommendations, rawMetrics: r.rawMetrics,
    })),
  };
}

export async function sendChatMessage(
  { clientId, cycleId, content }: { clientId: string; cycleId: string; content: string },
  complete: CompleteText = completeText
): Promise<{ reply: string }> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Mensagem vazia");

  const ctx = await loadCycleContext(clientId, cycleId);
  const system = buildAssistantSystemPrompt(ctx);

  const historyRows = await db.query.chatMessages.findMany({
    where: and(eq(chatMessages.cycleId, cycleId), eq(chatMessages.clientId, clientId)),
    orderBy: [desc(chatMessages.createdAt)],
    limit: HISTORY_LIMIT,
  });
  const history: ChatMessage[] = historyRows.reverse().map((m) => ({ role: m.role, content: m.content }));

  await db.insert(chatMessages).values({ clientId, cycleId, role: "user", content: trimmed });

  const messages = collapseConsecutiveRoles([...history, { role: "user", content: trimmed }]);
  // falha aqui: mensagem do assistente não é gravada; a do usuário fica (histórico consistente)
  const reply = await complete({ system, messages });

  await db.insert(chatMessages).values({ clientId, cycleId, role: "assistant", content: reply });
  return { reply };
}
