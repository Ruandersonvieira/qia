"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QuestionAggregate } from "@/lib/analysis/aggregate";

// Paleta fixa do skill de dataviz (referências/palette.md): hue sequencial
// step 500 pra magnitude neutra, paleta de status (fixa, nunca temática) pra
// NPS — promotor = good, neutro = warning, detrator = critical.
const ACCENT = "#256abf";
const STATUS = { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" };

const ROW_HEIGHT = 32;
const MIN_CHART_HEIGHT = 56;
const TEXT_PREVIEW_LIMIT = 20;

type Row = { label: string; count: number; fill?: string };

function BarRows({ rows, total }: { rows: Row[]; total: number }) {
  const height = Math.max(rows.length * ROW_HEIGHT, MIN_CHART_HEIGHT);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          width={112}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--popover-foreground)" }}
          formatter={(value) => {
            const n = typeof value === "number" ? value : Number(value ?? 0);
            return [`${n} (${total ? Math.round((n / total) * 100) : 0}%)`, "Respostas"];
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.fill ?? ACCENT} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: "var(--foreground)", fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function NpsDonut({ promoters, passives, detractors }: { promoters: number; passives: number; detractors: number }) {
  const total = promoters + passives + detractors;
  const data = [
    { name: "Promotores", value: promoters, fill: STATUS.good },
    { name: "Neutros", value: passives, fill: STATUS.warning },
    { name: "Detratores", value: detractors, fill: STATUS.critical },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} stroke="var(--card)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--popover-foreground)" }}
          formatter={(value) => {
            const n = typeof value === "number" ? value : Number(value ?? 0);
            return [`${n} (${total ? Math.round((n / total) * 100) : 0}%)`, ""];
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={24}
          formatter={(value) => <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function MetricChart({ question }: { question: QuestionAggregate }) {
  const { metrics } = question;

  if (metrics.kind === "numeric") {
    const total = Object.values(metrics.distribution).reduce((s, n) => s + n, 0);
    const rows: Row[] = Object.entries(metrics.distribution)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([value, count]) => ({ label: value, count }));
    return (
      <div className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem respostas.</p>
        ) : (
          <BarRows rows={rows} total={total} />
        )}
        <p className="text-sm text-muted-foreground">Média: {metrics.mean}</p>
      </div>
    );
  }

  if (metrics.kind === "nps") {
    return (
      <div className="space-y-1.5">
        <NpsDonut promoters={metrics.promoters} passives={metrics.passives} detractors={metrics.detractors} />
        <p className="text-center text-sm text-muted-foreground">Score NPS: {metrics.score}</p>
      </div>
    );
  }

  if (metrics.kind === "options") {
    const total = Object.values(metrics.counts).reduce((s, n) => s + n, 0);
    const rows: Row[] = Object.entries(metrics.counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
    return (
      <div className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem respostas.</p>
        ) : (
          <BarRows rows={rows} total={total} />
        )}
      </div>
    );
  }

  if (metrics.kind === "boolean") {
    const total = metrics.yes + metrics.no;
    const rows: Row[] = [
      { label: "Sim", count: metrics.yes },
      { label: "Não", count: metrics.no },
    ];
    return (
      <div className="space-y-1.5">
        <BarRows rows={rows} total={total} />
      </div>
    );
  }

  // text
  const shown = metrics.texts.slice(0, TEXT_PREVIEW_LIMIT);
  const rest = metrics.texts.length - shown.length;
  return (
    <div className="space-y-2">
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem respostas.</p>
      ) : (
        shown.map((text, i) => (
          <blockquote key={i} className="border-l-2 border-muted pl-3 text-sm text-muted-foreground">
            {text}
          </blockquote>
        ))
      )}
      {rest > 0 && <p className="text-sm text-muted-foreground">+{rest} respostas</p>}
    </div>
  );
}
