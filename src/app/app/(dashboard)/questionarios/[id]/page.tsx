import Link from "next/link";
import { notFound } from "next/navigation";
import { requireGestor } from "@/lib/auth/session";
import { getQuestionnaire, updateQuestionnaireStatus } from "../actions";
import { listQuestions } from "./perguntas/actions";
import { listCategories } from "../../categorias/actions";
import { openPublicCycle, listCycles } from "../../ciclos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TzOffsetInput } from "@/components/tz-offset-input";
import QuestionForm from "./question-form";
import QuestionList from "./question-list";

const CYCLE_STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  open: "Aberto",
  closed: "Fechado",
  processing: "Processando",
  analyzed: "Analisado",
};

const CYCLE_STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  scheduled: "outline",
  open: "default",
  closed: "secondary",
  processing: "secondary",
  analyzed: "outline",
};

const USE_CASE_LABELS: Record<string, string> = {
  clima: "Clima",
  nr1: "NR-1",
  market_research: "Pesquisa de mercado",
  nps: "NPS",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  active: "default",
  archived: "outline",
};

export default async function QuestionarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGestor();
  const { id } = await params;
  const questionnaire = await getQuestionnaire(id);
  if (!questionnaire) notFound();
  const [questions, categories, cycles] = await Promise.all([
    listQuestions(id),
    listCategories(),
    listCycles(id),
  ]);
  const isActive = questionnaire.status === "active";

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{questionnaire.title}</h1>
          <Badge variant={STATUS_VARIANTS[questionnaire.status]}>
            {STATUS_LABELS[questionnaire.status]}
          </Badge>
        </div>
        {questionnaire.description && (
          <p className="text-muted-foreground">{questionnaire.description}</p>
        )}
        {questionnaire.useCase && (
          <p className="text-sm text-muted-foreground">
            Caso de uso: {USE_CASE_LABELS[questionnaire.useCase]}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {questionnaire.status !== "active" && (
            <form action={updateQuestionnaireStatus}>
              <input type="hidden" name="id" value={questionnaire.id} />
              <input type="hidden" name="status" value="active" />
              <Button type="submit" variant="default">
                Ativar
              </Button>
            </form>
          )}
          {questionnaire.status !== "archived" && (
            <form action={updateQuestionnaireStatus}>
              <input type="hidden" name="id" value={questionnaire.id} />
              <input type="hidden" name="status" value="archived" />
              <Button type="submit" variant="outline">
                Arquivar
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Perguntas</h2>
        <QuestionList questionnaireId={id} questions={questions} categories={categories} />
        <QuestionForm questionnaireId={id} categories={categories} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ciclos</h2>

        <form action={openPublicCycle} className="space-y-4 rounded-lg border p-4">
          <input type="hidden" name="questionnaireId" value={id} />
          <TzOffsetInput />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="endsAt">Encerra em (opcional)</Label>
              <Input id="endsAt" type="datetime-local" name="endsAt" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxResponses">Máximo de respostas (opcional)</Label>
              <Input id="maxResponses" type="number" name="maxResponses" min={1} />
            </div>
          </div>

          <Button type="submit" disabled={!isActive}>
            Abrir ciclo
          </Button>
          {!isActive && (
            <p className="text-sm text-muted-foreground">
              Ative o questionário para poder abrir um ciclo público.
            </p>
          )}
        </form>

        {cycles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum ciclo criado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {cycles.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={CYCLE_STATUS_VARIANTS[c.status]}>
                      {CYCLE_STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Criado em {new Date(c.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Button render={<Link href={`/app/ciclos/${c.id}`} />} variant="outline" size="sm">
                  Ver ciclo
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
