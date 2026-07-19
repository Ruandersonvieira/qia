import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGestor } from "@/lib/auth/session";
import { getCycle, closeAndAnalyze } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ShareLink from "./share-link";

const CYCLE_STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  open: "Aberto",
  closed: "Fechado",
  processing: "Analisando...",
  analyzed: "Analisado",
};

const CYCLE_STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  scheduled: "outline",
  open: "default",
  closed: "secondary",
  processing: "secondary",
  analyzed: "outline",
};

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

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href={`/app/questionarios/${questionnaire.id}`} className="underline">
            {questionnaire.title}
          </Link>
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Ciclo</h1>
          <Badge variant={CYCLE_STATUS_VARIANTS[cycle.status]}>
            {CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {cycle.questionCount} {cycle.questionCount === 1 ? "pergunta" : "perguntas"} · {responseCount}{" "}
          {responseCount === 1 ? "resposta enviada" : "respostas enviadas"}
        </p>
      </div>

      {cycle.analysisError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Erro na análise</p>
          <p>{cycle.analysisError}</p>
        </div>
      )}

      <div className="flex gap-2">
        {cycle.status === "open" && (
          <form action={closeAndAnalyze}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <Button type="submit" variant="default">
              Fechar e analisar
            </Button>
          </form>
        )}
        {cycle.status === "closed" && cycle.analysisError && (
          <form action={closeAndAnalyze}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <Button type="submit" variant="default">
              Tentar análise novamente
            </Button>
          </form>
        )}
        {cycle.status === "analyzed" && (
          <Button render={<Link href={`/app/ciclos/${cycle.id}/relatorio`} />} variant="outline">
            Ver relatório
          </Button>
        )}
      </div>

      {cycle.publicToken && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Link público</h2>
          <ShareLink publicToken={cycle.publicToken} />
        </div>
      )}
    </div>
  );
}
