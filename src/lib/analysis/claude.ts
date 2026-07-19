import Anthropic from "@anthropic-ai/sdk";

export type CompleteJSON = (prompt: string) => Promise<unknown>;

const client = new Anthropic();

export const completeJSON: CompleteJSON = async (prompt) => {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(jsonText);
};
