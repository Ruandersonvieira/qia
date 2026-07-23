import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, ClipboardList, Inbox, Link2, RefreshCw, TrendingUp } from "lucide-react";
import { requireGestor } from "@/lib/auth/session";
import { getCycle, getCycleReport, getCycleRawSummary, closeCycle, analyzeCycle } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ShareLink from "./share-link";
import { RecommendationList } from "./recommendation-list";
import MetricChart from "./relatorio/metric-chart";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_VARIANTS, TREND_ICON, formatPeriod, scoreColorClass, scoreBarClass } from "../status";
import { EmptyState } from "../../_components/empty-state";
import { PageContainer } from "../../_components/page-container";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function CicloDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGestor();
  const { id } = await params;
  const result = await getCycle(id);
  if (!result || !result.questionnaire) notFound();
  const { cycle, questionnaire, responseCount } = result;
  const report = cycle.status === "analyzed" ? await getCycleReport(id) : null;
  const rawSummary = cycle.status !== "analyzed" ? await getCycleRawSummary(id) : null;

  return (
    <PageContainer
      icon={RefreshCw}
      title="Ciclo"
      eyebrow={
        <Link href={`/app/questionarios/${questionnaire.id}`} className="underline">
          {questionnaire.title}
        </Link>
      }
      titleExtra={
        <Badge variant={CYCLE_STATUS_VARIANTS[cycle.status]}>
          {CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status}
        </Badge>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <StatTile
          label="Respostas"
          value={cycle.maxResponses ? `${responseCount} / ${cycle.maxResponses}` : String(responseCount)}
        />
        <StatTile label="Perguntas" value={String(cycle.questionCount)} />
        <StatTile label="Período" value={formatPeriod(cycle.startsAt, cycle.endsAt)} />
      </div>

      {cycle.analysisError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Erro na análise</p>
          <p>{cycle.analysisError}</p>
        </div>
      )}

      <div className="flex gap-2">
        {cycle.status === "open" && (
          <form action={closeCycle}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <Button type="submit" variant="default">
              Fechar ciclo
            </Button>
          </form>
        )}
        {cycle.status === "closed" && (
          <form action={analyzeCycle}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <Button type="submit" variant="default">
              Analisar com IA
            </Button>
          </form>
        )}
        {cycle.status === "analyzed" && (
          <Button render={<Link href={`/app/ciclos/${cycle.id}/relatorio`} />} variant="outline" className="gap-1.5">
            <BarChart3 className="size-4" />
            Ver relatório completo
          </Button>
        )}
      </div>

      {cycle.publicToken && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold">
            <Link2 className="size-4 text-muted-foreground" />
            Link público
          </h2>
          <ShareLink publicToken={cycle.publicToken} />
        </div>
      )}

      {rawSummary && (
        <div className="space-y-4">
          <div>
            <h2 className="flex items-center gap-1.5 text-lg font-semibold">
              <ClipboardList className="size-4 text-muted-foreground" />
              Resumo das respostas
            </h2>
            <p className="text-sm text-muted-foreground">
              Prévia ao vivo, sem análise de IA — feche o ciclo e analise para ver resumo, score e
              recomendações.
            </p>
          </div>

          {rawSummary.responseCount === 0 ? (
            <EmptyState icon={Inbox}>Nenhuma resposta recebida ainda.</EmptyState>
          ) : (
            <>
              {rawSummary.categoriesAgg.map((cat) => (
                <Card key={cat.categoryId}>
                  <CardHeader>
                    <CardTitle>{cat.categoryName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {cat.questions.map((question) => (
                      <div key={question.questionId} className="space-y-2">
                        <p className="text-sm font-medium">{question.text}</p>
                        <MetricChart question={question} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
              {rawSummary.freeTextQuestionCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {rawSummary.freeTextQuestionCount}{" "}
                  {rawSummary.freeTextQuestionCount === 1
                    ? "pergunta de texto livre disponível"
                    : "perguntas de texto livre disponíveis"}{" "}
                  no relatório após a análise (nomes são mascarados nesse momento).
                </p>
              )}
              {rawSummary.hiddenSensitiveCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {rawSummary.hiddenSensitiveCount}{" "}
                  {rawSummary.hiddenSensitiveCount === 1 ? "pergunta sensível oculta" : "perguntas sensíveis ocultas"}{" "}
                  até o ciclo atingir {rawSummary.minN} respostas.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {report && report.categorySummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-muted-foreground" />
              Score por categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.categorySummaries.map((cat) => {
              const score = cat.score != null ? Number(cat.score) : null;
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{cat.categoryName}</span>
                    <div className="flex items-center gap-1.5">
                      {score != null && (
                        <span className={`font-semibold ${scoreColorClass(score)}`}>{Math.round(score)}</span>
                      )}
                      {cat.trend && <span className="text-muted-foreground">{TREND_ICON[cat.trend]}</span>}
                    </div>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted">
                    {score != null && (
                      <div
                        className={`h-2 rounded-full ${scoreBarClass(score)}`}
                        style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {report?.cycleSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ClipboardList className="size-4 text-muted-foreground" />
              Resumo geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{report.cycleSummary.summary}</p>
            <RecommendationList recommendations={report.cycleSummary.recommendations} />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
