import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "@/lib/analysis/claude";

describe("parseJsonResponse", () => {
  it("parseia JSON puro", () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it("remove fence markdown com whitespace nas bordas", () => {
    expect(parseJsonResponse('\n```json\n{"a":1}\n```   \n')).toEqual({ a: 1 });
  });

  it("remove fence sem tag json", () => {
    expect(parseJsonResponse('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("erro descritivo quando não é JSON", () => {
    expect(() => parseJsonResponse("texto solto")).toThrow(/não é JSON válido/);
  });
});
