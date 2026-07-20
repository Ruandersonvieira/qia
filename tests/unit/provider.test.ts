import { describe, expect, it } from "vitest";
import { resolveCompleteJSON } from "@/lib/analysis/provider";
import { completeJSON as anthropicCompleteJSON } from "@/lib/analysis/claude";
import { completeJSON as openaiCompleteJSON } from "@/lib/analysis/openai";

describe("resolveCompleteJSON", () => {
  it("retorna o provider anthropic quando pedido", () => {
    expect(resolveCompleteJSON("anthropic")).toBe(anthropicCompleteJSON);
  });

  it("retorna o provider openai quando pedido", () => {
    expect(resolveCompleteJSON("openai")).toBe(openaiCompleteJSON);
  });

  it("usa anthropic como default quando env não define provider", () => {
    expect(resolveCompleteJSON(undefined)).toBe(anthropicCompleteJSON);
  });

  it("lança erro claro para valor não reconhecido", () => {
    expect(() => resolveCompleteJSON("gemini")).toThrowError(/ANALYSIS_PROVIDER[\s\S]*gemini[\s\S]*anthropic[\s\S]*openai/);
  });
});
