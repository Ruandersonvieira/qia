"use server";
import { redirect } from "next/navigation";
import { and, eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { cycles, questionnaires, questions, responses } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";

// datetime-local não carrega fuso; interpreta o valor no fuso do browser do
// gestor (tzOffset em minutos, padrão getTimezoneOffset). Sem offset, cai no
// fuso do servidor (comportamento antigo).
function parseLocalDatetime(value: string, tzOffsetRaw: string): Date {
  const tzOffset = Number(tzOffsetRaw);
  if (!tzOffsetRaw || !Number.isFinite(tzOffset)) return new Date(value);
  const iso = value.length === 16 ? `${value}:00` : value; // datetime-local pode omitir segundos
  return new Date(Date.parse(`${iso}Z`) + tzOffset * 60_000);
}

function parseMaxResponses(raw: string): number | null {
  const n = Number(raw);
  return raw && Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

export async function openPublicCycle(formData: FormData) {
  const { clientId } = await requireGestor();
  const questionnaireId = String(formData.get("questionnaireId"));
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const maxResponsesRaw = String(formData.get("maxResponses") ?? "");
  const tzOffsetRaw = String(formData.get("tzOffset") ?? "");

  // Garante que o questionário pertence ao client da sessão e está ativo antes
  // de contar perguntas e abrir o ciclo — evita abrir ciclo para questionário
  // de outro client ou fora do status "active".
  const questionnaire = await db.query.questionnaires.findFirst({
    where: and(
      eq(questionnaires.id, questionnaireId),
      eq(questionnaires.clientId, clientId),
      eq(questionnaires.status, "active")
    ),
  });
  if (!questionnaire) throw new Error("Questionário não encontrado ou não está ativo");

  const [{ value: questionCount }] = await db
    .select({ value: count() })
    .from(questions)
    .where(and(eq(questions.questionnaireId, questionnaireId), eq(questions.clientId, clientId), eq(questions.status, "active")));
  if (questionCount === 0) throw new Error("Questionário sem perguntas ativas");

  const [cycle] = await db
    .insert(cycles)
    .values({
      clientId,
      questionnaireId,
      isPublic: true,
      publicToken: nanoid(16),
      questionCount,
      endsAt: endsAtRaw ? parseLocalDatetime(endsAtRaw, tzOffsetRaw) : null,
      maxResponses: parseMaxResponses(maxResponsesRaw),
      status: "open",
    })
    .returning();

  redirect(`/app/ciclos/${cycle.id}`);
}

// clientId é derivado da sessão via requireGestor() — não aceitar clientId como
// argumento externo, pois esta função é chamável como endpoint público (arquivo "use server").
export async function listCycles(questionnaireId: string) {
  const { clientId } = await requireGestor();
  return db.query.cycles.findMany({
    where: and(eq(cycles.questionnaireId, questionnaireId), eq(cycles.clientId, clientId)),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
}

export async function getCycle(id: string) {
  const { clientId } = await requireGestor();
  const cycle = await db.query.cycles.findFirst({
    where: and(eq(cycles.id, id), eq(cycles.clientId, clientId)),
  });
  if (!cycle) return null;

  const [questionnaire, [{ value: responseCount }]] = await Promise.all([
    db.query.questionnaires.findFirst({
      where: and(eq(questionnaires.id, cycle.questionnaireId), eq(questionnaires.clientId, clientId)),
    }),
    db
      .select({ value: count() })
      .from(responses)
      .where(and(eq(responses.cycleId, cycle.id), eq(responses.clientId, clientId), eq(responses.status, "submitted"))),
  ]);

  return { cycle, questionnaire, responseCount };
}
