import {
  completeJSON as anthropicCompleteJSON,
  completeText as anthropicCompleteText,
  type CompleteJSON,
  type CompleteText,
} from "./claude";
import { completeJSON as openaiCompleteJSON, completeText as openaiCompleteText } from "./openai";

type Provider = { completeJSON: CompleteJSON; completeText: CompleteText };

const PROVIDERS: Record<string, Provider> = {
  anthropic: { completeJSON: anthropicCompleteJSON, completeText: anthropicCompleteText },
  openai: { completeJSON: openaiCompleteJSON, completeText: openaiCompleteText },
};

function resolveProvider(name: string | undefined): Provider {
  const provider = PROVIDERS[name ?? "anthropic"];
  if (!provider) {
    throw new Error(`ANALYSIS_PROVIDER inválido: "${name}" (aceitos: ${Object.keys(PROVIDERS).join(", ")})`);
  }
  return provider;
}

export function resolveCompleteJSON(name: string | undefined = process.env.ANALYSIS_PROVIDER): CompleteJSON {
  return resolveProvider(name).completeJSON;
}

export function resolveCompleteText(name: string | undefined = process.env.ANALYSIS_PROVIDER): CompleteText {
  return resolveProvider(name).completeText;
}

// lê a env a cada chamada, não no import — permite trocar de provider sem
// depender da ordem de carregamento dos módulos
export const completeJSON: CompleteJSON = (prompt) => resolveCompleteJSON()(prompt);
export const completeText: CompleteText = (params) => resolveCompleteText()(params);
