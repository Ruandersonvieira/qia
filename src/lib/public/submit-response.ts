import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { answers, cycles, questions, responses, users } from "@/db/schema";

export type SubmitInput = {
  publicToken: string;
  fingerprint: string;
  /** id do auth.user da sessão, se o respondente estiver logado — permite listar "já respondido" em /app/pendentes. */
  authUserId?: string;
  answers: Array<{ questionId: string; valueNumeric?: number; valueText?: string; valueOptions?: string[] }>;
};

export type SubmitResult = { ok: true } | { ok: false; reason: "closed" | "duplicate" | "invalid" };

export async function getOpenCycleByToken(publicToken: string) {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.publicToken, publicToken) });
  if (!cycle || cycle.status !== "open") return null;

  const expired = cycle.endsAt && cycle.endsAt < new Date();
  const [{ value: responseCount }] = await db
    .select({ value: count() })
    .from(responses)
    .where(and(eq(responses.cycleId, cycle.id), eq(responses.status, "submitted")));
  const full = cycle.maxResponses != null && responseCount >= cycle.maxResponses;

  if (expired || full) {
    await db.update(cycles).set({ status: "closed", updatedAt: new Date() }).where(eq(cycles.id, cycle.id));
    return null;
  }
  return cycle;
}

export async function submitResponse(input: SubmitInput): Promise<SubmitResult> {
  const cycle = await getOpenCycleByToken(input.publicToken);
  if (!cycle) return { ok: false, reason: "closed" };
  if (!input.fingerprint) return { ok: false, reason: "invalid" };

  if (input.answers.length) {
    const activeQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.questionnaireId, cycle.questionnaireId), eq(questions.status, "active")));
    const validQuestionIds = new Set(activeQuestions.map((q) => q.id));
    if (input.answers.some((a) => !validQuestionIds.has(a.questionId))) {
      return { ok: false, reason: "invalid" };
    }
  }

  // Só vincula a um usuário se ele for membro ativo deste client — a análise
  // nunca lê esse campo (só anon_key/masked_text), então não afeta o
  // anonimato do pipeline; serve só pra listar "já respondido" pro próprio respondente.
  let userId: string | null = null;
  if (input.authUserId) {
    const member = await db.query.users.findFirst({
      where: and(eq(users.authUserId, input.authUserId), eq(users.clientId, cycle.clientId), eq(users.status, "active")),
    });
    if (member) userId = member.id;
  }

  try {
    await db.transaction(async (tx) => {
      const [response] = await tx
        .insert(responses)
        .values({
          clientId: cycle.clientId,
          cycleId: cycle.id,
          userId,
          anonKey: crypto.randomUUID(),
          sessionFingerprint: input.fingerprint,
          submittedAt: new Date(),
          status: "submitted",
        })
        .returning();
      if (input.answers.length) {
        await tx.insert(answers).values(
          input.answers.map((a) => ({
            responseId: response.id,
            questionId: a.questionId,
            valueNumeric: a.valueNumeric != null ? String(a.valueNumeric) : null,
            valueText: a.valueText ?? null,
            valueOptions: a.valueOptions ?? null,
          }))
        );
      }
    });
  } catch (e: unknown) {
    const pgCode = (e as { cause?: { code?: string }; code?: string });
    if (pgCode.code === "23505" || pgCode.cause?.code === "23505") return { ok: false, reason: "duplicate" };
    throw e;
  }
  return { ok: true };
}
