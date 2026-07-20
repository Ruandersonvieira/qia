export type Trend = "up" | "down" | "stable";

const DELTA = 5; // score 0-100; threshold provisório (spec fatia 2)

export function computeTrend(current: number, previous: number | null): Trend | null {
  if (previous == null) return null;
  const delta = current - previous;
  if (delta >= DELTA) return "up";
  if (delta <= -DELTA) return "down";
  return "stable";
}
