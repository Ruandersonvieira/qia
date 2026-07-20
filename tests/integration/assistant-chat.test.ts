import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { analysisResults, categories, chatMessages, clients, cycles, questionnaires, questions } from "@/db/schema";
import { sendChatMessage } from "@/lib/assistant/chat";
import type { CompleteText } from "@/lib/analysis/claude";

let clientId: string;
let otherClientId: string;
let cycleId: string;
let openCycleId: string;

const fakeComplete: CompleteText = async ({ system, messages }) => {
  expect(system).toMatch(/anonim/i);
  expect(system).toContain("Clima em atenção");
  expect(messages[messages.length - 1].content).toContain("prioridade");
  return "Foque na categoria Clima.";
};

beforeAll(async () => {
  const [client] = await db.insert(clients).values({ name: "Chat", slug: `chat-${nanoid(6)}` }).returning();
  const [other] = await db.insert(clients).values({ name: "Outro", slug: `outro-${nanoid(6)}` }).returning();
  clientId = client.id;
  otherClientId = other.id;
  const [cat] = await db.insert(categories).values({ clientId, name: "Clima" }).returning();
  const [qn] = await db.insert(questionnaires).values({ clientId, title: "Clima Q3", status: "active" }).returning();
  await db.insert(questions).values({
    clientId, questionnaireId: qn.id, categoryId: cat.id, position: 1,
    text: "Ambiente?", analysisGoal: "medir clima", howToWork: "1:1s", answerType: "scale", config: { min: 1, max: 5 },
  });
  const [cycle] = await db.insert(cycles).values({
    clientId, questionnaireId: qn.id, isPublic: true, publicToken: nanoid(16), questionCount: 1, status: "analyzed",
  }).returning();
  cycleId = cycle.id;
  const [open] = await db.insert(cycles).values({
    clientId, questionnaireId: qn.id, isPublic: true, publicToken: nanoid(16), questionCount: 1, status: "open",
  }).returning();
  openCycleId = open.id;
  await db.insert(analysisResults).values([
    {
      clientId, cycleId, categoryId: cat.id, kind: "category_summary",
      summary: "Clima em atenção", score: "55", recommendations: [{ title: "1:1s", description: "..." }], rawMetrics: [],
    },
    { clientId, cycleId, categoryId: null, kind: "cycle_summary", summary: "Ciclo ok", recommendations: [], rawMetrics: {} },
  ]);
});

describe("sendChatMessage", () => {
  it("persiste par user/assistant e retorna a resposta", async () => {
    const { reply } = await sendChatMessage({ clientId, cycleId, content: "Qual a prioridade?" }, fakeComplete);
    expect(reply).toBe("Foque na categoria Clima.");

    const rows = await db.query.chatMessages.findMany({
      where: eq(chatMessages.cycleId, cycleId),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    });
    expect(rows.map((r) => r.role)).toEqual(["user", "assistant"]);
    expect(rows[0].content).toBe("Qual a prioridade?");
    expect(rows[1].content).toBe("Foque na categoria Clima.");
  });

  it("rejeita ciclo de outro client e ciclo não analisado", async () => {
    await expect(
      sendChatMessage({ clientId: otherClientId, cycleId, content: "oi" }, fakeComplete)
    ).rejects.toThrow(/não encontrado/i);
    await expect(
      sendChatMessage({ clientId, cycleId: openCycleId, content: "oi" }, fakeComplete)
    ).rejects.toThrow(/não analisado/i);
  });

  it("falha do provider não grava mensagem do assistente", async () => {
    const failing: CompleteText = async () => {
      throw new Error("api down");
    };
    await expect(sendChatMessage({ clientId, cycleId, content: "Vai falhar?" }, failing)).rejects.toThrow("api down");

    const rows = await db.query.chatMessages.findMany({
      where: eq(chatMessages.cycleId, cycleId),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
    });
    expect(rows.map((r) => r.role)).toEqual(["user", "assistant", "user"]);
    expect(rows[2].content).toBe("Vai falhar?");
  });
});
