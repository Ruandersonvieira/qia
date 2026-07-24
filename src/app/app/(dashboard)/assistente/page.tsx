import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { CheckCircle2, MessageCircleOff, Sparkles } from "lucide-react";
import { db } from "@/db/client";
import { chatMessages, cycles, questionnaires } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";
import { HISTORY_LIMIT } from "@/lib/assistant/chat";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { EmptyState } from "../_components/empty-state";
import { PageContainer } from "../_components/page-container";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function AssistentePage({
  searchParams,
}: {
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const { clientId } = await requireGestor();
  const { ciclo } = await searchParams;

  const analyzedCycles = await db
    .select({ cycle: cycles, questionnaireTitle: questionnaires.title })
    .from(cycles)
    .innerJoin(questionnaires, eq(cycles.questionnaireId, questionnaires.id))
    .where(and(eq(cycles.clientId, clientId), eq(cycles.status, "analyzed")))
    .orderBy(desc(cycles.updatedAt));

  const selected = analyzedCycles.find((c) => c.cycle.id === ciclo) ?? analyzedCycles[0] ?? null;

  const history = selected
    ? await db.query.chatMessages.findMany({
        where: and(eq(chatMessages.cycleId, selected.cycle.id), eq(chatMessages.clientId, clientId)),
        orderBy: (m, { asc }) => [asc(m.createdAt)],
        limit: HISTORY_LIMIT,
      })
    : [];

  return (
    <PageContainer
      icon={Sparkles}
      title="Assistente IA"
      description="Converse sobre os resultados de um ciclo analisado. As respostas usam apenas dados agregados e anonimizados."
    >
      {analyzedCycles.length === 0 ? (
        <EmptyState icon={MessageCircleOff}>
          Nenhum ciclo analisado ainda. Feche e analise um ciclo em{" "}
          <Link href="/app/questionarios" className="underline">Questionários</Link>{" "}
          para conversar com o assistente.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {analyzedCycles.map(({ cycle, questionnaireTitle }) => {
              const isSelected = selected?.cycle.id === cycle.id;
              return (
                <Link
                  key={cycle.id}
                  href={`/app/assistente?ciclo=${cycle.id}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                  )}
                >
                  {isSelected && <CheckCircle2 className="size-3.5" />}
                  {questionnaireTitle} · {dateFormatter.format(cycle.startsAt)}
                </Link>
              );
            })}
          </div>
          {selected && (
            <ChatPanel
              key={selected.cycle.id}
              cycleId={selected.cycle.id}
              initialMessages={history.map((m) => ({ role: m.role, content: m.content }))}
            />
          )}
        </>
      )}
    </PageContainer>
  );
}
