"use client";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { updateQuestionnaire } from "../actions";
import { USE_CASE_LABELS } from "../status";

interface QuestionnaireSummary {
  id: string;
  title: string;
  description: string;
  useCase: string | null;
}

export default function EditQuestionnaireDialog({ questionnaire }: { questionnaire: QuestionnaireSummary }) {
  return (
    <FormDialog
      trigger={
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-3.5" />
          Editar
        </Button>
      }
      title="Editar questionário"
      action={updateQuestionnaire}
      successMessage="Questionário atualizado."
    >
      <input type="hidden" name="id" value={questionnaire.id} />
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" defaultValue={questionnaire.title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" defaultValue={questionnaire.description} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="useCase">Caso de uso</Label>
        <SelectField
          name="useCase"
          defaultValue={questionnaire.useCase ?? "other"}
          options={Object.entries(USE_CASE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>
    </FormDialog>
  );
}
