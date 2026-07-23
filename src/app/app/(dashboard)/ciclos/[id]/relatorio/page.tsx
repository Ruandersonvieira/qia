import { notFound } from "next/navigation";
import { BarChart3, ClipboardList, Lightbulb } from "lucide-react";
import { requireGestor } from "@/lib/auth/session";
import { getCycleReport } from "../../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuestionAggregate } from "@/lib/analysis/aggregate";
import type { Recommendation } from "@/db/schema";
import MetricChart from "./metric-chart";
import { KpiRow } from "./kpi-row";
import { CategoryComparisonChart } from "./category-comparison-chart";
import { QuestionRanking } from "./question-ranking";
import { RecommendationList } from "../recommendation-list";
import { TREND_ICON, formatPeriod, scoreColorClass } from "../../status";
import { PageContainer } from "../../../_components/page-container";

export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGestor();
  const { id } = await params;
  const report = await getCycleReport(id);
  if (!report) notFound();
  const { cycle, questionnaire, responseCount, cycleSummary, categorySummaries, insights, kpis, questionRanking } = report;
  if (!questionnaire) notFound();

  const categoryScores = categorySummaries
    .filter((c) => c.score != null)
    .map((c) => ({ categoryName: c.categoryName, score: Number(c.score) }));

  return (
    <PageContainer
      icon={BarChart3}
      eyebrow="Relatório do ciclo"
      title={questionnaire.title}
      description={
        <p>
          {formatPeriod(cycle.startsAt, cycle.endsAt)} · {responseCount}{" "}
          {responseCount === 1 ? "resposta" : "respostas"} · {cycle.questionCount}{" "}
          {cycle.questionCount === 1 ? "pergunta" : "perguntas"}
        </p>
      }
    >
      <KpiRow kpis={kpis} responseCount={responseCount} />

      {insights && (insights.recommendations as Recommendation[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Lightbulb className="size-4 text-muted-foreground" />
              Insights e tendências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecommendationList
              recommendations={insights.recommendations as Recommendation[]}
              variant="featured"
            />
          </CardContent>
        </Card>
      )}

      {categoryScores.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparativo entre categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryComparisonChart data={categoryScores} />
          </CardContent>
        </Card>
      )}

      {(questionRanking.best.length > 0 || questionRanking.worst.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Ranking de perguntas</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionRanking best={questionRanking.best} worst={questionRanking.worst} />
          </CardContent>
        </Card>
      )}

      {cycleSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ClipboardList className="size-4 text-muted-foreground" />
              Resumo geral
            </CardTitle>
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
    </PageContainer>
  );
}
