import { Card, CardContent } from "@/components/ui/card";
import { TREND_ICON, scoreColorClass } from "../../status";

type Kpis = {
  overallScore: number | null;
  overallTrend: "up" | "stable" | "down" | null;
  npsAvg: number | null;
  participationRate: number | null;
};

function KpiTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {children}
      </CardContent>
    </Card>
  );
}

export function KpiRow({ kpis, responseCount }: { kpis: Kpis; responseCount: number }) {
  const tiles: React.ReactNode[] = [];

  if (kpis.overallScore != null) {
    tiles.push(
      <KpiTile key="score" label="Nota geral">
        <div className="flex items-center gap-1.5">
          <span className={`text-2xl font-bold ${scoreColorClass(kpis.overallScore)}`}>
            {Math.round(kpis.overallScore)}
          </span>
          {kpis.overallTrend && <span className="text-lg text-muted-foreground">{TREND_ICON[kpis.overallTrend]}</span>}
        </div>
      </KpiTile>
    );
  }

  tiles.push(
    <KpiTile key="participation" label={kpis.participationRate != null ? "Taxa de participação" : "Respostas"}>
      <span className="text-2xl font-bold">
        {kpis.participationRate != null ? `${Math.round(kpis.participationRate * 100)}%` : responseCount}
      </span>
    </KpiTile>
  );

  if (kpis.npsAvg != null) {
    tiles.push(
      <KpiTile key="nps" label="NPS médio">
        <span className="text-2xl font-bold">{kpis.npsAvg}</span>
      </KpiTile>
    );
  }

  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{tiles}</div>;
}
