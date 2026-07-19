"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SubmitInput } from "@/lib/public/submit-response";
import { submitPublicResponse } from "./actions";

export type QuestionOption = { id: string; label: string; value: string };

export type QuestionForForm = {
  id: string;
  text: string;
  answerType: "scale" | "single_choice" | "multi_choice" | "nps" | "free_text" | "boolean";
  isRequired: boolean;
  config: { min?: number; max?: number; minLabel?: string; maxLabel?: string };
  options: QuestionOption[];
};

type SubmitResult = { ok: true } | { ok: false; reason: "closed" | "duplicate" | "invalid" };

const NPS_VALUES = Array.from({ length: 11 }, (_, i) => i); // 0..10

function buildAnswers(questions: QuestionForForm[], formData: FormData): SubmitInput["answers"] {
  const result: SubmitInput["answers"] = [];
  for (const q of questions) {
    const name = `q-${q.id}`;
    switch (q.answerType) {
      case "scale":
      case "nps":
      case "boolean": {
        const raw = formData.get(name);
        if (raw != null && raw !== "") result.push({ questionId: q.id, valueNumeric: Number(raw) });
        break;
      }
      case "single_choice": {
        const raw = formData.get(name);
        if (raw != null && raw !== "") result.push({ questionId: q.id, valueOptions: [String(raw)] });
        break;
      }
      case "multi_choice": {
        const raw = formData.getAll(name).map(String);
        if (raw.length) result.push({ questionId: q.id, valueOptions: raw });
        break;
      }
      case "free_text": {
        const raw = formData.get(name);
        if (raw != null && String(raw).trim() !== "") result.push({ questionId: q.id, valueText: String(raw) });
        break;
      }
    }
  }
  return result;
}

function StatusMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function QuestionField({ question }: { question: QuestionForForm }) {
  const name = `q-${question.id}`;

  if (question.answerType === "scale") {
    const min = question.config.min ?? 1;
    const max = question.config.max ?? 5;
    const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{question.text}</legend>
        <div className="flex items-center justify-between gap-2">
          {values.map((v) => (
            <label key={v} className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <input type="radio" name={name} value={v} required={question.isRequired} className="size-4" />
              {v}
            </label>
          ))}
        </div>
        {(question.config.minLabel || question.config.maxLabel) && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{question.config.minLabel}</span>
            <span>{question.config.maxLabel}</span>
          </div>
        )}
      </fieldset>
    );
  }

  if (question.answerType === "nps") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{question.text}</legend>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {NPS_VALUES.map((v) => (
            <label key={v} className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <input type="radio" name={name} value={v} required={question.isRequired} className="size-4" />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.answerType === "single_choice") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{question.text}</legend>
        <div className="flex flex-col gap-2">
          {question.options.map((o) => (
            <Label key={o.id} className="flex items-center gap-2 font-normal">
              <input type="radio" name={name} value={o.id} required={question.isRequired} className="size-4" />
              {o.label}
            </Label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.answerType === "multi_choice") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {question.text}
          {question.isRequired && " *"}
        </legend>
        <div className="flex flex-col gap-2">
          {question.options.map((o) => (
            <Label key={o.id} className="flex items-center gap-2 font-normal">
              <input type="checkbox" name={name} value={o.id} className="size-4" />
              {o.label}
            </Label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.answerType === "boolean") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{question.text}</legend>
        <div className="flex gap-4">
          <Label className="flex items-center gap-2 font-normal">
            <input type="radio" name={name} value={1} required={question.isRequired} className="size-4" />
            Sim
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <input type="radio" name={name} value={0} required={question.isRequired} className="size-4" />
            Não
          </Label>
        </div>
      </fieldset>
    );
  }

  // free_text
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{question.text}</Label>
      <Textarea id={name} name={name} required={question.isRequired} />
    </div>
  );
}

export default function ResponseForm({
  publicToken,
  questions,
}: {
  publicToken: string;
  questions: QuestionForForm[];
}) {
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (result?.ok) {
    return <StatusMessage title="Obrigado pela sua resposta!" message="Sua participação foi registrada com sucesso." />;
  }
  if (result && !result.ok && result.reason === "duplicate") {
    return <StatusMessage title="Você já respondeu" message="Obrigado pela participação!" />;
  }
  if (result && !result.ok && result.reason === "closed") {
    return <StatusMessage title="Pesquisa encerrada" message="Esta pesquisa não está mais aceitando respostas." />;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    for (const q of questions) {
      if (q.answerType === "multi_choice" && q.isRequired) {
        const values = formData.getAll(`q-${q.id}`);
        if (values.length === 0) {
          setError(`Selecione ao menos uma opção em: "${q.text}"`);
          return;
        }
      }
    }

    const answersInput = buildAnswers(questions, formData);

    // Garante o cookie qia_fp antes da action: se a action precisar criar o
    // cookie via cookies().set, o Next re-renderiza a rota e o page.tsx troca
    // este form pela tela "Você já respondeu" antes do usuário ver o
    // "Obrigado". Com o cookie já presente na requisição, a action não seta
    // nada e a mensagem de sucesso permanece na tela.
    if (!document.cookie.split("; ").some((c) => c.startsWith("qia_fp="))) {
      document.cookie = `qia_fp=${crypto.randomUUID()}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }

    startTransition(async () => {
      try {
        const res = await submitPublicResponse(publicToken, answersInput);
        setResult(res);
      } catch (err) {
        console.error(err);
        setResult({ ok: false, reason: "invalid" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Pesquisa</h1>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {result && !result.ok && result.reason === "invalid" && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível registrar sua resposta. Tente novamente.
        </p>
      )}
      {questions.map((q) => (
        <QuestionField key={q.id} question={q} />
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar respostas"}
      </Button>
    </form>
  );
}
