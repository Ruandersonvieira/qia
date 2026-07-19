import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { answers, cycles, responses } from "@/db/schema";

export type SubmitInput = {
  publicToken: string;
  fingerprint: string;
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

  try {
    await db.transaction(async (tx) => {
      const [response] = await tx
        .insert(responses)
        .values({
          clientId: cycle.clientId,
          cycleId: cycle.id,
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
