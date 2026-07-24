"use client";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Mesmo hue único do MetricChart (referências/palette.md do skill de dataviz)
// — comparação de magnitude entre categorias, não identidade, então uma cor só.
const ACCENT = "#256abf";
const ROW_HEIGHT = 36;

export function CategoryComparisonChart({ data }: { data: Array<{ categoryName: string; score: number }> }) {
  if (data.length === 0) return null;
  const rows = [...data].sort((a, b) => b.score - a.score);
  const height = Math.max(rows.length * ROW_HEIGHT, 72);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis
          type="category"
          dataKey="categoryName"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--popover-foreground)" }}
          formatter={(value) => [Math.round(Number(value)), "Score"]}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={24} fill={ACCENT} isAnimationActive={false}>
          <LabelList
            dataKey="score"
            position="right"
            formatter={(v) => (typeof v === "number" ? Math.round(v) : "")}
            style={{ fill: "var(--foreground)", fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
