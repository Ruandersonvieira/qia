import { notFound } from "next/navigation";
import { requireGestor } from "@/lib/auth/session";
import { getCycleReport } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuestionAggregate } from "@/lib/analysis/aggregate";
import type { Recommendation } from "@/db/schema";
import MetricChart from "./metric-chart";

function scoreColorClass(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

const TREND_ICON: Record<string, string> = { up: "↑", stable: "↔", down: "↓" };

function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) return null;
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm">
      {recommendations.map((r, i) => (
        <li key={i}>
          <span className="font-medium">{r.title}</span>
          {r.description && <span className="text-muted-foreground"> — {r.description}</span>}
        </li>
      ))}
    </ol>
  );
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function formatPeriod(startsAt: Date, endsAt: Date | null): string {
  const start = dateFormatter.format(startsAt);
  if (!endsAt) return `desde ${start}`;
  return `${start} a ${dateFormatter.format(endsAt)}`;
}

export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGestor();
  const { id } = await params;
  const report = await getCycleReport(id);
  if (!report) notFound();
  const { cycle, questionnaire, responseCount, cycleSummary, categorySummaries } = report;
  if (!questionnaire) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Relatório do ciclo</p>
        <h1 className="text-2xl font-bold">{questionnaire.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatPeriod(cycle.startsAt, cycle.endsAt)} · {responseCount}{" "}
          {responseCount === 1 ? "resposta" : "respostas"} · {cycle.questionCount}{" "}
          {cycle.questionCount === 1 ? "pergunta" : "perguntas"}
        </p>
      </div>

      {cycleSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{cycleSummary.summary}</p>
            <RecommendationList recommendations={cycleSummary.recommendations} />
          </CardContent>
        </Card>
      )}

      {categorySummaries.map((cat) => {
        const score = cat.score != null ? Number(cat.score) : null;
        const rawMetrics = (Array.isArray(cat.rawMetrics) ? cat.rawMetrics : []) as QuestionAggregate[];
        return (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <CardTitle>{cat.categoryName}</CardTitle>
              {score != null && (
                <div className="flex items-center gap-1">
                  <span className={`text-2xl font-bold ${scoreColorClass(score)}`}>{Math.round(score)}</span>
                  {cat.trend && <span className="text-lg text-muted-foreground">{TREND_ICON[cat.trend]}</span>}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm">{cat.summary}</p>
                <RecommendationList recommendations={cat.recommendations} />
              </div>

              {rawMetrics.length > 0 && (
                <div className="space-y-6 border-t pt-4">
                  {rawMetrics.map((question) => (
                    <div key={question.questionId} className="space-y-2">
                      <p className="text-sm font-medium">{question.text}</p>
                      <MetricChart question={question} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
