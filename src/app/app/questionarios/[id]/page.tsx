import { notFound } from "next/navigation";
import { requireGestor } from "@/lib/auth/session";
import { getQuestionnaire, updateQuestionnaireStatus } from "../actions";
import { listQuestions } from "./perguntas/actions";
import { listCategories } from "../../categorias/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuestionForm from "./question-form";
import QuestionList from "./question-list";

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
  const [questions, categories] = await Promise.all([listQuestions(id), listCategories()]);

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
        <p className="text-sm text-muted-foreground">
          Nenhum ciclo criado ainda. A criação de ciclos será adicionada em breve.
        </p>
      </div>
    </div>
  );
}
