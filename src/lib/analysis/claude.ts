import Anthropic from "@anthropic-ai/sdk";

export type CompleteJSON = (prompt: string) => Promise<unknown>;

// cliente lazy: instanciar no import quebraria quando só a chave do outro
// provider está configurada (o SDK exige ANTHROPIC_API_KEY no construtor)
let client: Anthropic | undefined;

export const completeJSON: CompleteJSON = async (prompt) => {
  client ??= new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseJsonResponse(text);
};

/** Extrai JSON da resposta do modelo, tolerando fence markdown e whitespace nas bordas. */
export function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = (fenced ? fenced[1] : trimmed).trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error(`Resposta do modelo não é JSON válido: ${jsonText.slice(0, 200)}`);
  }
}
