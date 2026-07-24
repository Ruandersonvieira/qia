import { describe, it, expect } from "vitest";
import { maskNames } from "@/lib/analysis/mask";

describe("maskNames", () => {
  it("mascara nome composto", () => {
    expect(maskNames("Falei com Maria Silva ontem")).toBe("Falei com [NOME] ontem");
  });
  it("mascara nome com conectivo", () => {
    expect(maskNames("O time da Ana Paula de Souza é ótimo")).toBe("O time da [NOME] é ótimo");
  });
  it("mascara múltiplos nomes", () => {
    expect(maskNames("João Pedro e Carla Dias brigaram")).toBe("[NOME] brigaram");
  });
  it("não mascara palavra única capitalizada em início de frase", () => {
    expect(maskNames("Gosto do ambiente")).toBe("Gosto do ambiente");
  });
  it("preserva texto sem nomes", () => {
    expect(maskNames("salário baixo e muita pressão")).toBe("salário baixo e muita pressão");
  });
});
