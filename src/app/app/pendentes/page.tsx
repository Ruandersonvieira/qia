import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { db } from "@/db/client";
import { cycles, questionnaires, responses } from "@/db/schema";
import { requireRespondent } from "@/lib/auth/session";

export default async function PendentesPage() {
  const { clientId, user } = await requireRespondent();

  const [openCycles, answeredRows] = await Promise.all([
    db
      .select({ id: cycles.id, publicToken: cycles.publicToken, title: questionnaires.title })
      .from(cycles)
      .innerJoin(questionnaires, eq(cycles.questionnaireId, questionnaires.id))
      .where(and(eq(cycles.clientId, clientId), eq(cycles.status, "open"), eq(cycles.isPublic, true))),
    db
      .select({
        id: responses.id,
        cycleId: responses.cycleId,
        submittedAt: responses.submittedAt,
        title: questionnaires.title,
      })
      .from(responses)
      .innerJoin(cycles, eq(responses.cycleId, cycles.id))
      .innerJoin(questionnaires, eq(cycles.questionnaireId, questionnaires.id))
      .where(and(eq(responses.userId, user.id), eq(responses.status, "submitted"))),
  ]);

  const answeredCycleIds = new Set(answeredRows.map((r) => r.cycleId));
  const pending = openCycles.filter((c) => c.publicToken && !answeredCycleIds.has(c.id));

  return (
    <div className="mx-auto max-w-lg space-y-8 px-6 py-10">
      <div>
        <p className="text-sm text-muted-foreground">Olá, {user.name}</p>
        <h1 className="text-xl font-bold">Meus questionários</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Abertos pra responder</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pendente no momento.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="size-4 text-muted-foreground" />
                  <span className="font-medium">{c.title}</span>
                </div>
                <Link
                  href={`/r/${c.publicToken}`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Responder
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Já respondidos</h2>
        {answeredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não respondeu nenhum.</p>
        ) : (
          <ul className="space-y-3">
            {answeredRows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="font-medium">{r.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("pt-BR") : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
