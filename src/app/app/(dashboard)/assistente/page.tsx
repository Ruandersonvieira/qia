import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chatMessages, cycles, questionnaires } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";
import { HISTORY_LIMIT } from "@/lib/assistant/chat";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";

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
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Assistente IA</h1>
        <p className="text-sm text-muted-foreground">
          Converse sobre os resultados de um ciclo analisado. As respostas usam apenas dados agregados e anonimizados.
        </p>
      </div>

      {analyzedCycles.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Nenhum ciclo analisado ainda. Feche e analise um ciclo em{" "}
          <Link href="/app/questionarios" className="underline">Questionários</Link>{" "}
          para conversar com o assistente.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {analyzedCycles.map(({ cycle, questionnaireTitle }) => (
              <Link
                key={cycle.id}
                href={`/app/assistente?ciclo=${cycle.id}`}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  selected?.cycle.id === cycle.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                {questionnaireTitle} · {dateFormatter.format(cycle.startsAt)}
              </Link>
            ))}
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
    </div>
  );
}
