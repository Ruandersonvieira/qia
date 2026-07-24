"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";

export type AnswerType = "scale" | "single_choice" | "multi_choice" | "nps" | "free_text" | "boolean";

export const ANSWER_TYPE_OPTIONS: { value: AnswerType; label: string }[] = [
  { value: "scale", label: "Escala" },
  { value: "single_choice", label: "Escolha única" },
  { value: "multi_choice", label: "Múltipla escolha" },
  { value: "nps", label: "NPS 0-10" },
  { value: "free_text", label: "Texto livre" },
  { value: "boolean", label: "Sim/Não" },
];

interface Category {
  id: string;
  name: string;
}

function OptionsEditor({ initialLabels }: { initialLabels: string[] }) {
  const labels = initialLabels.length ? initialLabels : ["", ""];
  const [options, setOptions] = useState(labels.map((text, i) => ({ id: i + 1, text })));
  const nextId = useRef(options.length + 1);

  function updateOption(id: number, text: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  }
  function addOption() {
    setOptions((prev) => [...prev, { id: nextId.current++, text: "" }]);
  }
  function removeOption(id: number) {
    setOptions((prev) => (prev.length > 1 ? prev.filter((o) => o.id !== id) : prev));
  }

  const serialized = options.map((o) => o.text.trim()).filter(Boolean).join("\n");

  return (
    <div className="space-y-2">
      <Label>Opções</Label>
      <input type="hidden" name="options" value={serialized} />
      <div className="space-y-2">
        {options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <Input
              value={o.text}
              onChange={(e) => updateOption(o.id, e.target.value)}
              placeholder={`Opção ${i + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeOption(o.id)}
              disabled={options.length <= 1}
              aria-label="Remover opção"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1.5">
        <Plus className="size-4" />
        Adicionar opção
      </Button>
    </div>
  );
}

export interface InitialQuestion {
  id: string;
  categoryId: string;
  text: string;
  analysisGoal: string;
  howToWork: string;
  answerType: AnswerType;
  isRequired: boolean;
  isSensitive: boolean;
  config: { min?: number; max?: number; minLabel?: string; maxLabel?: string };
  options: { label: string }[];
  hasAnswers: boolean;
}

interface QuestionFormProps {
  questionnaireId: string;
  categories: Category[];
  initialQuestion?: InitialQuestion;
}

export default function QuestionForm({ questionnaireId, categories, initialQuestion }: QuestionFormProps) {
  const [answerType, setAnswerType] = useState<AnswerType>(initialQuestion?.answerType ?? "scale");
  const answerTypeLocked = initialQuestion?.hasAnswers ?? false;

  const isScale = answerType === "scale";
  const isChoice = answerType === "single_choice" || answerType === "multi_choice";
  const config = initialQuestion?.config ?? {};

  return (
    <>
      <input type="hidden" name="questionnaireId" value={questionnaireId} />
      {initialQuestion && <input type="hidden" name="id" value={initialQuestion.id} />}

      <div className="space-y-2">
        <Label htmlFor="text">Pergunta</Label>
        <Textarea id="text" name="text" placeholder="Texto da pergunta" defaultValue={initialQuestion?.text} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="categoryId">Categoria</Label>
          <SelectField
            name="categoryId"
            defaultValue={initialQuestion?.categoryId ?? categories[0]?.id}
            placeholder="Selecione uma categoria"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="answerType">Tipo de resposta</Label>
          {answerTypeLocked ? (
            <div className="flex h-8 items-center rounded-lg border border-input bg-muted/50 px-2.5 text-sm text-muted-foreground">
              {ANSWER_TYPE_OPTIONS.find((o) => o.value === answerType)?.label}
              <input type="hidden" name="answerType" value={answerType} />
            </div>
          ) : (
            <SelectField
              name="answerType"
              defaultValue="scale"
              options={ANSWER_TYPE_OPTIONS}
              onValueChange={(value) => setAnswerType(value as AnswerType)}
            />
          )}
          {answerTypeLocked && (
            <p className="text-xs text-muted-foreground">
              Não pode ser alterado — pergunta já tem respostas.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="analysisGoal">Objetivo de análise</Label>
        <Textarea
          id="analysisGoal"
          name="analysisGoal"
          placeholder="O que essa pergunta busca revelar na análise"
          defaultValue={initialQuestion?.analysisGoal}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="howToWork">Como trabalhar</Label>
        <Textarea
          id="howToWork"
          name="howToWork"
          placeholder="Como a IA deve interpretar e trabalhar essa resposta"
          defaultValue={initialQuestion?.howToWork}
        />
      </div>

      {isScale && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="scaleMin">Mínimo</Label>
            <Input id="scaleMin" type="number" name="scaleMin" defaultValue={config.min ?? 1} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scaleMax">Máximo</Label>
            <Input id="scaleMax" type="number" name="scaleMax" defaultValue={config.max ?? 5} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scaleMinLabel">Rótulo mínimo</Label>
            <Input
              id="scaleMinLabel"
              type="text"
              name="scaleMinLabel"
              placeholder="Ex.: Discordo totalmente"
              defaultValue={config.minLabel}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scaleMaxLabel">Rótulo máximo</Label>
            <Input
              id="scaleMaxLabel"
              type="text"
              name="scaleMaxLabel"
              placeholder="Ex.: Concordo totalmente"
              defaultValue={config.maxLabel}
            />
          </div>
        </div>
      )}

      {isChoice && (
        <OptionsEditor initialLabels={(initialQuestion?.options ?? []).map((o) => o.label)} />
      )}

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isRequired"
            defaultChecked={initialQuestion?.isRequired ?? true}
            className="size-4"
          />
          Obrigatória
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isSensitive"
            defaultChecked={initialQuestion?.isSensitive ?? false}
            className="size-4"
          />
          Sensível
        </label>
      </div>
    </>
  );
}
