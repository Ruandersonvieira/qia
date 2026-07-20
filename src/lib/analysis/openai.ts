import OpenAI from "openai";
import { parseJsonResponse, type CompleteJSON } from "./claude";

// cliente lazy: instanciar no import quebraria quando só a chave do outro
// provider está configurada (o SDK exige OPENAI_API_KEY no construtor)
let client: OpenAI | undefined;

export const completeJSON: CompleteJSON = async (prompt) => {
  client ??= new OpenAI();
  const completion = await client.chat.completions.create({
    model: "gpt-5-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });
  return parseJsonResponse(completion.choices[0]?.message?.content ?? "");
};
