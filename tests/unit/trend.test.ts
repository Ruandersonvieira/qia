import { describe, it, expect } from "vitest";
import { computeTrend } from "@/lib/analysis/trend";

describe("computeTrend", () => {
  it("sem anterior → null", () => {
    expect(computeTrend(70, null)).toBeNull();
  });
  it("Δ ≥ +5 → up", () => {
    expect(computeTrend(75, 70)).toBe("up");
    expect(computeTrend(80, 70)).toBe("up");
  });
  it("Δ ≤ -5 → down", () => {
    expect(computeTrend(65, 70)).toBe("down");
  });
  it("entre -5 e +5 → stable", () => {
    expect(computeTrend(72, 70)).toBe("stable");
    expect(computeTrend(66, 70)).toBe("stable");
    expect(computeTrend(74.9, 70)).toBe("stable");
  });
});
