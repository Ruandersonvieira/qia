import type { QuestionAggregate } from "@/lib/analysis/aggregate";

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 shrink-0 truncate">{label}</span>
      <div className="h-4 flex-1 rounded bg-muted">
        <div className="h-4 rounded bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

function ColoredBar({
  label, count, total, colorClass,
}: {
  label: string; count: number; total: number; colorClass: string;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 shrink-0 truncate">{label}</span>
      <div className="h-4 flex-1 rounded bg-muted">
        <div className={`h-4 rounded ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

const TEXT_PREVIEW_LIMIT = 20;

export default function MetricChart({ question }: { question: QuestionAggregate }) {
  const { metrics } = question;

  if (metrics.kind === "numeric") {
    const total = Object.values(metrics.distribution).reduce((s, n) => s + n, 0);
    const entries = Object.entries(metrics.distribution).sort((a, b) => Number(a[0]) - Number(b[0]));
    return (
      <div className="space-y-1.5">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem respostas.</p>
        ) : (
          entries.map(([value, count]) => <Bar key={value} label={value} count={count} total={total} />)
        )}
        <p className="text-sm text-muted-foreground">Média: {metrics.mean}</p>
      </div>
    );
  }

  if (metrics.kind === "nps") {
    const total = metrics.promoters + metrics.passives + metrics.detractors;
    return (
      <div className="space-y-1.5">
        <ColoredBar label="Promotores" count={metrics.promoters} total={total} colorClass="bg-green-600" />
        <ColoredBar label="Neutros" count={metrics.passives} total={total} colorClass="bg-amber-600" />
        <ColoredBar label="Detratores" count={metrics.detractors} total={total} colorClass="bg-red-600" />
        <p className="text-sm text-muted-foreground">Score NPS: {metrics.score}</p>
      </div>
    );
  }

  if (metrics.kind === "options") {
    const total = Object.values(metrics.counts).reduce((s, n) => s + n, 0);
    const entries = Object.entries(metrics.counts).sort((a, b) => b[1] - a[1]);
    return (
      <div className="space-y-1.5">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem respostas.</p>
        ) : (
          entries.map(([label, count]) => <Bar key={label} label={label} count={count} total={total} />)
        )}
      </div>
    );
  }

  if (metrics.kind === "boolean") {
    const total = metrics.yes + metrics.no;
    return (
      <div className="space-y-1.5">
        <Bar label="Sim" count={metrics.yes} total={total} />
        <Bar label="Não" count={metrics.no} total={total} />
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
