import { completeJSON as anthropicCompleteJSON, type CompleteJSON } from "./claude";
import { completeJSON as openaiCompleteJSON } from "./openai";

const PROVIDERS: Record<string, CompleteJSON> = {
  anthropic: anthropicCompleteJSON,
  openai: openaiCompleteJSON,
};

export function resolveCompleteJSON(name: string | undefined = process.env.ANALYSIS_PROVIDER): CompleteJSON {
  const provider = PROVIDERS[name ?? "anthropic"];
  if (!provider) {
    throw new Error(`ANALYSIS_PROVIDER inválido: "${name}" (aceitos: ${Object.keys(PROVIDERS).join(", ")})`);
  }
  return provider;
}

// lê a env a cada chamada, não no import — permite trocar de provider sem
// depender da ordem de carregamento dos módulos
export const completeJSON: CompleteJSON = (prompt) => resolveCompleteJSON()(prompt);
