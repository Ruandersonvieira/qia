"use client";

import { useState, useTransition, type FormEvent } from "react";
import { AlertCircle, Check, Clock, Lock, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SubmitInput } from "@/lib/public/submit-response";
import { submitPublicResponse } from "./actions";
import { StatusScreen } from "./status-screen";

export type QuestionOption = { id: string; label: string; value: string };

export type QuestionForForm = {
  id: string;
  text: string;
  answerType: "scale" | "single_choice" | "multi_choice" | "nps" | "free_text" | "boolean";
  isRequired: boolean;
  config: { min?: number; max?: number; minLabel?: string; maxLabel?: string };
  categoryName: string;
  options: QuestionOption[];
};

function groupByCategory(questions: QuestionForForm[]) {
  const groups: { categoryName: string; questions: QuestionForForm[] }[] = [];
  for (const q of questions) {
    const last = groups[groups.length - 1];
    if (last && last.categoryName === q.categoryName) last.questions.push(q);
    else groups.push({ categoryName: q.categoryName, questions: [q] });
  }
  return groups;
}

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

// Botão de escolha única (radio) escondido + rótulo estilizado via peer —
// mantém o form nativo/não-controlado, só troca a aparência do input cru.
function PillChoice({
  type,
  name,
  value,
  required,
  children,
  className,
  numeric = false,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string | number;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Célula quadrada e centralizada, pra grades de número (escala/NPS) em vez de lista de texto. */
  numeric?: boolean;
}) {
  return (
    <label className={cn("group relative flex cursor-pointer", className)}>
      <input type={type} name={name} value={value} required={required} className="peer sr-only" />
      <span
        className={cn(
          "flex items-center justify-center rounded-xl border border-[#dce6e4] bg-white font-medium text-[#0E2A32] transition-colors",
          numeric ? "aspect-square w-full text-sm" : "w-full gap-2 px-4 py-2.5 text-sm",
          "peer-checked:border-[#0E2A32] peer-checked:bg-[#0E2A32] peer-checked:text-white",
          "peer-hover:border-[#0E2A32]/40",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0E2A32]"
        )}
      >
        {children}
      </span>
    </label>
  );
}

function ScaleField({ question, name }: { question: QuestionForForm; name: string }) {
  const min = question.config.min ?? 1;
  const max = question.config.max ?? 5;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-2">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(values.length, 5)}, minmax(0, 1fr))` }}>
        {values.map((v) => (
          <PillChoice key={v} type="radio" name={name} value={v} required={question.isRequired} numeric>
            {v}
          </PillChoice>
        ))}
      </div>
      {(question.config.minLabel || question.config.maxLabel) && (
        <div className="flex justify-between text-xs text-[#46626B]">
          <span>{question.config.minLabel}</span>
          <span>{question.config.maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function NpsField({ question, name }: { question: QuestionForForm; name: string }) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {NPS_VALUES.map((v) => (
          <PillChoice key={v} type="radio" name={name} value={v} required={question.isRequired} numeric>
            {v}
          </PillChoice>
        ))}
      </div>
      <div className="flex justify-between text-xs text-[#46626B]">
        <span>Pouco provável</span>
        <span>Muito provável</span>
      </div>
    </div>
  );
}

function QuestionBody({ question }: { question: QuestionForForm }) {
  const name = `q-${question.id}`;

  if (question.answerType === "scale") return <ScaleField question={question} name={name} />;
  if (question.answerType === "nps") return <NpsField question={question} name={name} />;

  if (question.answerType === "single_choice") {
    return (
      <div className="flex flex-col gap-2">
        {question.options.map((o) => (
          <PillChoice key={o.id} type="radio" name={name} value={o.id} required={question.isRequired}>
            {o.label}
          </PillChoice>
        ))}
      </div>
    );
  }

  if (question.answerType === "multi_choice") {
    return (
      <div className="flex flex-col gap-2">
        {question.options.map((o) => (
          <PillChoice key={o.id} type="checkbox" name={name} value={o.id}>
            {o.label}
          </PillChoice>
        ))}
      </div>
    );
  }

  if (question.answerType === "boolean") {
    return (
      <div className="flex gap-2">
        <PillChoice type="radio" name={name} value={1} required={question.isRequired} className="flex-1">
          <span className="w-full text-center">Sim</span>
        </PillChoice>
        <PillChoice type="radio" name={name} value={0} required={question.isRequired} className="flex-1">
          <span className="w-full text-center">Não</span>
        </PillChoice>
      </div>
    );
  }

  // free_text
  return (
    <Textarea
      id={name}
      name={name}
      required={question.isRequired}
      placeholder="Digite sua resposta"
      className="border-[#dce6e4] bg-white"
    />
  );
}

function QuestionCard({ index, question }: { index: number; question: QuestionForForm }) {
  const name = `q-${question.id}`;
  return (
    <div className="rounded-2xl border border-[#dce6e4] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0E2A32] text-xs font-semibold text-white">
          {index + 1}
        </span>
        {question.answerType === "free_text" ? (
          <Label htmlFor={name} className="text-base leading-snug font-medium text-[#0E2A32]">
            {question.text}
            {question.isRequired && <span className="ml-1 text-red-500">*</span>}
          </Label>
        ) : (
          <p className="text-base leading-snug font-medium text-[#0E2A32]">
            {question.text}
            {question.isRequired && <span className="ml-1 text-red-500">*</span>}
          </p>
        )}
      </div>
      <div className="pl-9">
        <QuestionBody question={question} />
      </div>
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
    return (
      <StatusScreen
        icon={PartyPopper}
        title="Obrigado pela sua resposta!"
        message="Sua participação foi registrada com sucesso."
      />
    );
  }
  if (result && !result.ok && result.reason === "duplicate") {
    return <StatusScreen icon={PartyPopper} title="Você já respondeu" message="Obrigado pela participação!" />;
  }
  if (result && !result.ok && result.reason === "closed") {
    return (
      <StatusScreen icon={Clock} title="Pesquisa encerrada" message="Esta pesquisa não está mais aceitando respostas." />
    );
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

  const groups = groupByCategory(questions);
  let runningIndex = 0;

  return (
    <div className="min-h-screen bg-[#F3F6F5]">
      <div className="sticky top-0 z-10 bg-[#0E2A32] px-6 py-4 text-[#F3F6F5] shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            qia<span className="text-[#FFC940]">.</span>
          </span>
          <span className="text-xs text-[#F3F6F5]/60">Resposta 100% anônima</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg flex-col gap-4 px-6 py-8">
        <div className="mb-2 space-y-1">
          <h1 className="text-xl font-bold text-[#0E2A32]">Pesquisa</h1>
          <p className="text-sm text-[#46626B]">
            {questions.length} {questions.length === 1 ? "pergunta" : "perguntas"} · leva menos de 2 minutos
          </p>
        </div>

        {error && (
          <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </p>
        )}
        {result && !result.ok && result.reason === "invalid" && (
          <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            Não foi possível registrar sua resposta. Tente novamente.
          </p>
        )}

        {groups.map((group) => (
          <div key={group.categoryName} className="space-y-3">
            <h2 className="text-xs font-semibold tracking-wide text-[#46626B] uppercase">
              {group.categoryName}
            </h2>
            <div className="space-y-4">
              {group.questions.map((q) => {
                const index = runningIndex++;
                return <QuestionCard key={q.id} index={index} question={q} />;
              })}
            </div>
          </div>
        ))}

        <Button
          type="submit"
          disabled={pending}
          className="h-11 gap-1.5 rounded-full bg-[#FFC940] text-base font-semibold text-[#0E2A32] transition-transform hover:-translate-y-0.5 hover:bg-[#FFD25C] disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? (
            "Enviando…"
          ) : (
            <>
              <Check className="size-4" />
              Enviar respostas
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#46626B]">
          <Lock className="size-3" />
          Ninguém da sua empresa vê sua resposta individualmente.
        </p>
      </form>
    </div>
  );
}
