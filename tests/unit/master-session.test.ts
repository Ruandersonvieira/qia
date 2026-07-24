import { describe, it, expect, beforeAll } from "vitest";
import { createMasterToken, verifyMasterToken } from "@/lib/auth/master-session";

beforeAll(() => {
  process.env.MASTER_SESSION_SECRET = "test-secret";
});

describe("master session", () => {
  it("assina e verifica token com id do master", async () => {
    const token = await createMasterToken("abc-123");
    expect(await verifyMasterToken(token)).toBe("abc-123");
  });

  it("rejeita token inválido", async () => {
    expect(await verifyMasterToken("lixo")).toBeNull();
  });

  it("rejeita token assinado com outro segredo", async () => {
    const token = await createMasterToken("abc-123");
    process.env.MASTER_SESSION_SECRET = "outro";
    expect(await verifyMasterToken(token)).toBeNull();
    process.env.MASTER_SESSION_SECRET = "test-secret";
  });
});
