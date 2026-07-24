"use client";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import QuestionForm, { type InitialQuestion } from "./question-form";
import { updateQuestion } from "./perguntas/actions";

interface Category {
  id: string;
  name: string;
}

export default function EditQuestionDialog({
  questionnaireId,
  categories,
  question,
}: {
  questionnaireId: string;
  categories: Category[];
  question: InitialQuestion;
}) {
  return (
    <FormDialog
      trigger={
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-3.5" />
          Editar
        </Button>
      }
      title="Editar pergunta"
      action={updateQuestion}
      successMessage="Pergunta atualizada."
    >
      <QuestionForm questionnaireId={questionnaireId} categories={categories} initialQuestion={question} />
    </FormDialog>
  );
}
