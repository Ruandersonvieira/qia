import Link from 'next/link';
import { Inbox, RefreshCw, TrendingUp } from 'lucide-react';
import { requireGestor } from '@/lib/auth/session';
import { getCiclosOverview } from './actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_VARIANTS,
  TREND_ICON,
  formatPeriod,
  scoreColorClass,
} from './status';
import { EmptyState } from '../_components/empty-state';
import { PageContainer } from '../_components/page-container';

const SECTION_ORDER = [
  'open',
  'processing',
  'closed',
  'scheduled',
  'analyzed',
] as const;
const SECTION_TITLES: Record<string, string> = {
  open: 'Abertos',
  processing: 'Processando',
  closed: 'Fechados',
  scheduled: 'Agendados',
  analyzed: 'Analisados',
};

function KpiCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${valueClass ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function CiclosPage() {
  await requireGestor();
  const { cycles, kpis, categoryTrends } = await getCiclosOverview();

  const scores = categoryTrends.flatMap((c) =>
    c.score != null ? [c.score] : []
  );
  const avgScore =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;

  return (
    <PageContainer icon={RefreshCw} title="Ciclos">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Ciclos abertos" value={String(kpis.openCycles)} />
        <KpiCard
          label="Respostas recebidas"
          value={String(kpis.totalResponses)}
        />
        <KpiCard
          label="Score médio"
          value={avgScore != null ? String(Math.round(avgScore)) : '—'}
          valueClass={avgScore != null ? scoreColorClass(avgScore) : undefined}
        />
      </div>

      {categoryTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-muted-foreground" />
              Tendência por categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {categoryTrends.map((c) => (
              <span
                key={c.categoryName}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
              >
                {c.categoryName}
                {c.score != null && (
                  <span className={`font-semibold ${scoreColorClass(c.score)}`}>
                    {Math.round(c.score)}
                  </span>
                )}
                {c.trend && (
                  <span className="text-muted-foreground">
                    {TREND_ICON[c.trend]}
                  </span>
                )}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {cycles.length === 0 && (
        <EmptyState icon={Inbox}>
          Nenhum ciclo ainda. Crie um ciclo a partir de um{' '}
          <Link href="/app/questionarios" className="underline">
            questionário
          </Link>
          .
        </EmptyState>
      )}

      {SECTION_ORDER.map((status) => {
        const group = cycles.filter((c) => c.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status} className="space-y-3">
            <h2 className="text-lg font-semibold">{SECTION_TITLES[status]}</h2>
            <div className="divide-y rounded-lg border">
              {group.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/app/ciclos/${c.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {c.questionnaireTitle}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {formatPeriod(c.startsAt, c.endsAt)} · {c.responseCount}{' '}
                      {c.responseCount === 1 ? 'resposta' : 'respostas'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c.analysisError && (
                      <Badge variant="destructive">Erro na análise</Badge>
                    )}
                    <Badge variant={CYCLE_STATUS_VARIANTS[c.status]}>
                      {CYCLE_STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                    {c.status === 'analyzed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/app/ciclos/${c.id}/relatorio`} />}
                      >
                        Ver relatório
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </PageContainer>
  );
}
