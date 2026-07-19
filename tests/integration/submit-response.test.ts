import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db/client";
import { clients, questionnaires, questions, categories, cycles, responses } from "@/db/schema";
import { submitResponse } from "@/lib/public/submit-response";
import { nanoid } from "nanoid";

let token: string;
let questionId: string;

beforeAll(async () => {
  const [client] = await db.insert(clients).values({ name: "T", slug: `t-${nanoid(6)}` }).returning();
  const [cat] = await db.insert(categories).values({ clientId: client.id, name: "Clima" }).returning();
  const [qn] = await db.insert(questionnaires).values({ clientId: client.id, title: "Q", status: "active" }).returning();
  const [q] = await db.insert(questions).values({
    clientId: client.id, questionnaireId: qn.id, categoryId: cat.id, position: 1,
    text: "Nota?", analysisGoal: "g", howToWork: "h", answerType: "scale", config: { min: 1, max: 5 },
  }).returning();
  questionId = q.id;
  token = nanoid(16);
  await db.insert(cycles).values({
    clientId: client.id, questionnaireId: qn.id, isPublic: true, publicToken: token, questionCount: 1, status: "open",
  });
});

describe("submitResponse", () => {
  it("grava response + answers", async () => {
    const result = await submitResponse({
      publicToken: token,
      fingerprint: "fp-1",
      answers: [{ questionId, valueNumeric: 4 }],
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejeita fingerprint duplicado", async () => {
    const result = await submitResponse({
      publicToken: token,
      fingerprint: "fp-1",
      answers: [{ questionId, valueNumeric: 5 }],
    });
    expect(result).toEqual({ ok: false, reason: "duplicate" });
  });

  it("rejeita token inexistente", async () => {
    const result = await submitResponse({ publicToken: "nope", fingerprint: "fp-2", answers: [] });
    expect(result).toEqual({ ok: false, reason: "closed" });
  });

  it("fecha ciclo ao atingir maxResponses", async () => {
    // ciclo com maxResponses = 1
    const t2 = nanoid(16);
    const cycle = await db.query.cycles.findFirst({ where: (c, { eq }) => eq(c.publicToken, token) });
    await db.insert(cycles).values({
      clientId: cycle!.clientId, questionnaireId: cycle!.questionnaireId,
      isPublic: true, publicToken: t2, questionCount: 1, maxResponses: 1, status: "open",
    });
    expect(await submitResponse({ publicToken: t2, fingerprint: "a", answers: [{ questionId, valueNumeric: 3 }] })).toEqual({ ok: true });
    expect(await submitResponse({ publicToken: t2, fingerprint: "b", answers: [{ questionId, valueNumeric: 3 }] })).toEqual({ ok: false, reason: "closed" });
  });
});
