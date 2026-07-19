"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createQuestion } from "./perguntas/actions";

type AnswerType = "scale" | "single_choice" | "multi_choice" | "nps" | "free_text" | "boolean";

const ANSWER_TYPE_OPTIONS: { value: AnswerType; label: string }[] = [
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

interface QuestionFormProps {
  questionnaireId: string;
  categories: Category[];
}

export default function QuestionForm({ questionnaireId, categories }: QuestionFormProps) {
  const [answerType, setAnswerType] = useState<AnswerType>("scale");

  const isScale = answerType === "scale";
  const isChoice = answerType === "single_choice" || answerType === "multi_choice";

  return (
    <form action={createQuestion} className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="questionnaireId" value={questionnaireId} />

      <div className="space-y-2">
        <Label htmlFor="text">Pergunta</Label>
        <Textarea id="text" name="text" placeholder="Texto da pergunta" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="categoryId">Categoria</Label>
          <Select name="categoryId" defaultValue={categories[0]?.id}>
            <SelectTrigger id="categoryId" className="w-full">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="answerType">Tipo de resposta</Label>
          <Select
            name="answerType"
            defaultValue="scale"
            onValueChange={(value) => setAnswerType(value as AnswerType)}
          >
            <SelectTrigger id="answerType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANSWER_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="analysisGoal">Objetivo de análise</Label>
        <Textarea
          id="analysisGoal"
          name="analysisGoal"
          placeholder="O que essa pergunta busca revelar na análise"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="howToWork">Como trabalhar</Label>
        <Textarea
          id="howToWork"
          name="howToWork"
          placeholder="Como a IA deve interpretar e trabalhar essa resposta"
        />
      </div>

      {isScale && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="scaleMin">Mínimo</Label>
            <Input id="scaleMin" type="number" name="scaleMin" defaultValue={1} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scaleMax">Máximo</Label>
            <Input id="scaleMax" type="number" name="scaleMax" defaultValue={5} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scaleMinLabel">Rótulo mínimo</Label>
            <Input id="scaleMinLabel" type="text" name="scaleMinLabel" placeholder="Ex.: Discordo totalmente" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scaleMaxLabel">Rótulo máximo</Label>
            <Input id="scaleMaxLabel" type="text" name="scaleMaxLabel" placeholder="Ex.: Concordo totalmente" />
          </div>
        </div>
      )}

      {isChoice && (
        <div className="space-y-2">
          <Label htmlFor="options">Opções (uma por linha)</Label>
          <Textarea id="options" name="options" placeholder={"Opção 1\nOpção 2\nOpção 3"} />
        </div>
      )}

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isRequired" defaultChecked className="size-4" />
          Obrigatória
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isSensitive" className="size-4" />
          Sensível
        </label>
      </div>

      <Button type="submit">Adicionar pergunta</Button>
    </form>
  );
}
