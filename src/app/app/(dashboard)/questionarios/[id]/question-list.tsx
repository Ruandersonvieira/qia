import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { archiveQuestion, deleteQuestion, moveQuestion } from "./perguntas/actions";
import EditQuestionDialog from "./edit-question-dialog";
import type { AnswerType } from "./question-form";

const ANSWER_TYPE_LABELS: Record<string, string> = {
  scale: "Escala",
  single_choice: "Escolha única",
  multi_choice: "Múltipla escolha",
  nps: "NPS 0-10",
  free_text: "Texto livre",
  boolean: "Sim/Não",
};

interface QuestionOption {
  id: string;
  label: string;
}

interface Question {
  id: string;
  text: string;
  categoryId: string;
  answerType: AnswerType;
  analysisGoal: string;
  howToWork: string;
  isRequired: boolean;
  isSensitive: boolean;
  config: { min?: number; max?: number; minLabel?: string; maxLabel?: string };
  status: string;
  options: QuestionOption[];
  hasAnswers: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface QuestionListProps {
  questionnaireId: string;
  questions: Question[];
  categories: Category[];
}

export default function QuestionList({ questionnaireId, questions, categories }: QuestionListProps) {
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada ainda.</p>;
  }

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const activeIds = questions.filter((q) => q.status === "active").map((q) => q.id);

  return (
    <ul className="space-y-3">
      {questions.map((q) => {
        const isActive = q.status === "active";
        const activeIdx = activeIds.indexOf(q.id);
        const canMoveUp = isActive && activeIdx > 0;
        const canMoveDown = isActive && activeIdx >= 0 && activeIdx < activeIds.length - 1;

        return (
          <li key={q.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium">{q.text}</p>
                <p className="text-sm text-muted-foreground">
                  {categoryNames.get(q.categoryId) ?? "Sem categoria"} ·{" "}
                  {ANSWER_TYPE_LABELS[q.answerType] ?? q.answerType}
                </p>
                {q.options.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Opções: {q.options.map((o) => o.label).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {q.isRequired && <Badge variant="secondary">Obrigatória</Badge>}
                {q.isSensitive && <Badge variant="destructive">Sensível</Badge>}
                {q.status === "archived" && <Badge variant="outline">Arquivada</Badge>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <EditQuestionDialog questionnaireId={questionnaireId} categories={categories} question={q} />
              {isActive && (
                <>
                  <form action={moveQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="questionnaireId" value={questionnaireId} />
                    <input type="hidden" name="direction" value="up" />
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon-sm"
                      disabled={!canMoveUp}
                      title="Mover para cima"
                    >
                      ↑
                    </Button>
                  </form>
                  <form action={moveQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="questionnaireId" value={questionnaireId} />
                    <input type="hidden" name="direction" value="down" />
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon-sm"
                      disabled={!canMoveDown}
                      title="Mover para baixo"
                    >
                      ↓
                    </Button>
                  </form>
                  <form action={archiveQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="questionnaireId" value={questionnaireId} />
                    <Button type="submit" variant="outline" size="sm">
                      Arquivar
                    </Button>
                  </form>
                </>
              )}
              <span title={q.hasAnswers ? "Pergunta possui respostas — apenas arquivar é possível" : undefined}>
                <form action={deleteQuestion}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="questionnaireId" value={questionnaireId} />
                  <Button type="submit" variant="destructive" size="sm" disabled={q.hasAnswers}>
                    Excluir
                  </Button>
                </form>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
