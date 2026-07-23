import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FileText, Home, Inbox, Plus, RefreshCw, Tags } from "lucide-react";
import { requireGestor } from "@/lib/auth/session";
import { listQuestionnaires } from "./questionarios/actions";
import { listCategories } from "./categorias/actions";
import { listOpenCyclesForClient } from "./ciclos/actions";
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_VARIANTS, formatPeriod } from "./ciclos/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./_components/empty-state";
import { PageContainer } from "./_components/page-container";

function StatTile({
  href, icon: Icon, label, value, caption,
}: { href: string; icon: LucideIcon; label: string; value: number; caption: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-5 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
    </Link>
  );
}

export default async function AppHome() {
  const { user } = await requireGestor();
  const [allQuestionnaires, activeQuestionnaires, ownCategories, openCycles] = await Promise.all([
    listQuestionnaires(),
    listQuestionnaires({ status: "active" }),
    listCategories({ type: "own" }),
    listOpenCyclesForClient(),
  ]);

  const activeCount = activeQuestionnaires.total;
  const clientCategoriesCount = ownCategories.total;

  return (
    <PageContainer
      icon={Home}
      title={`Olá, ${user.name}`}
      description="Resumo dos seus questionários e ciclos."
      action={
        <Button render={<Link href="/app/questionarios" />} className="gap-1.5">
          <Plus className="size-4" />
          Novo questionário
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          href="/app/questionarios"
          icon={FileText}
          label="Questionários ativos"
          value={activeCount}
          caption={`${allQuestionnaires.total} no total`}
        />
        <StatTile
          href="/app/categorias"
          icon={Tags}
          label="Categorias"
          value={clientCategoriesCount}
          caption="criadas por você"
        />
        <StatTile
          href="/app/questionarios"
          icon={RefreshCw}
          label="Ciclos abertos"
          value={openCycles.length}
          caption={openCycles.length > 0 ? "coletando respostas agora" : "nenhum no momento"}
        />
      </div>

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <RefreshCw className="size-4 text-muted-foreground" />
          Ciclos abertos
        </h2>
        {openCycles.length === 0 ? (
          <EmptyState icon={Inbox}>
            Nenhum ciclo aberto. Abra um a partir de um{" "}
            <Link href="/app/questionarios" className="underline">
              questionário ativo
            </Link>
            .
          </EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border">
            {openCycles.map(({ cycle, questionnaireTitle, responseCount }) => (
              <li key={cycle.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <Link href={`/app/ciclos/${cycle.id}`} className="font-medium underline">
                    {questionnaireTitle}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatPeriod(cycle.startsAt, cycle.endsAt)} · {responseCount}{" "}
                    {responseCount === 1 ? "resposta" : "respostas"}
                  </p>
                </div>
                <Badge variant={CYCLE_STATUS_VARIANTS[cycle.status]}>
                  {CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
