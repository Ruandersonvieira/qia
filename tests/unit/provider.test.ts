import { describe, expect, it } from "vitest";
import { resolveCompleteJSON, resolveCompleteText } from "@/lib/analysis/provider";
import { completeJSON as anthropicCompleteJSON, completeText as anthropicCompleteText } from "@/lib/analysis/claude";
import { completeJSON as openaiCompleteJSON, completeText as openaiCompleteText } from "@/lib/analysis/openai";

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

describe("resolveCompleteText", () => {
  it("retorna o provider pedido e usa anthropic como default", () => {
    expect(resolveCompleteText("anthropic")).toBe(anthropicCompleteText);
    expect(resolveCompleteText("openai")).toBe(openaiCompleteText);
    expect(resolveCompleteText(undefined)).toBe(anthropicCompleteText);
  });

  it("lança erro claro para valor não reconhecido", () => {
    expect(() => resolveCompleteText("gemini")).toThrowError(/ANALYSIS_PROVIDER[\s\S]*gemini/);
  });
});
