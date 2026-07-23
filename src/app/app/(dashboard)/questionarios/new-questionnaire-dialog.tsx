"use client";
import { Plus } from "lucide-react";
import { createQuestionnaire } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { USE_CASE_LABELS } from "./status";

export function NewQuestionnaireDialog() {
  return (
    <FormDialog
      trigger={
        <Button className="gap-1.5">
          <Plus className="size-4" />
          Novo questionário
        </Button>
      }
      title="Novo questionário"
      action={createQuestionnaire}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" type="text" name="title" placeholder="Ex.: Pesquisa de Clima" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" placeholder="Descrição opcional" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="useCase">Caso de uso</Label>
        <SelectField
          name="useCase"
          defaultValue="other"
          options={Object.entries(USE_CASE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>
    </FormDialog>
  );
}
