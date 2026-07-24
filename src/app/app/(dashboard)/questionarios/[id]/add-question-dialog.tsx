"use client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import QuestionForm from "./question-form";
import { createQuestion } from "./perguntas/actions";

interface Category {
  id: string;
  name: string;
}

export default function AddQuestionDialog({
  questionnaireId,
  categories,
}: {
  questionnaireId: string;
  categories: Category[];
}) {
  return (
    <FormDialog
      trigger={
        <Button className="gap-1.5">
          <Plus className="size-4" />
          Adicionar pergunta
        </Button>
      }
      title="Adicionar pergunta"
      action={createQuestion}
      successMessage="Pergunta adicionada."
    >
      <QuestionForm questionnaireId={questionnaireId} categories={categories} />
    </FormDialog>
  );
}
