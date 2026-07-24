import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { Lock, PartyPopper } from "lucide-react";
import { db } from "@/db/client";
import { categories, questions, questionOptions, responses } from "@/db/schema";
import { getOpenCycleByToken } from "@/lib/public/submit-response";
import ResponseForm, { type QuestionForForm } from "./response-form";
import { StatusScreen } from "./status-screen";

export default async function PublicResponsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Sem sessão: rota pública. Não usar requireGestor aqui.
  const cycle = await getOpenCycleByToken(token);
  if (!cycle) {
    return <StatusScreen icon={Lock} title="Pesquisa encerrada" message="Esta pesquisa está encerrada." />;
  }

  // O cookie qia_fp só existe depois de um envio anterior (é criado dentro da
  // server action submitPublicResponse). Se já existir e houver response
  // gravada com esse fingerprint neste ciclo, o visitante já respondeu.
  const jar = await cookies();
  const fp = jar.get("qia_fp")?.value;
  if (fp) {
    const existing = await db.query.responses.findFirst({
      where: and(eq(responses.cycleId, cycle.id), eq(responses.sessionFingerprint, fp)),
    });
    if (existing) {
      return <StatusScreen icon={PartyPopper} title="Você já respondeu" message="Obrigado pela participação!" />;
    }
  }

  const activeQuestions = await db.query.questions.findMany({
    where: and(
      eq(questions.questionnaireId, cycle.questionnaireId),
      eq(questions.clientId, cycle.clientId),
      eq(questions.status, "active")
    ),
    orderBy: (q, { asc }) => [asc(q.position)],
  });

  const questionIds = activeQuestions.map((q) => q.id);
  const options = questionIds.length
    ? await db.query.questionOptions.findMany({
        where: inArray(questionOptions.questionId, questionIds),
        orderBy: (o, { asc }) => [asc(o.position)],
      })
    : [];
  const optionsByQuestion = new Map<string, typeof options>();
  for (const o of options) {
    const list = optionsByQuestion.get(o.questionId);
    if (list) list.push(o);
    else optionsByQuestion.set(o.questionId, [o]);
  }

  const categoryIds = [...new Set(activeQuestions.map((q) => q.categoryId))];
  const categoryRows = categoryIds.length
    ? await db.query.categories.findMany({ where: inArray(categories.id, categoryIds) })
    : [];
  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));

  const formQuestions: QuestionForForm[] = activeQuestions.map((q) => ({
    id: q.id,
    text: q.text,
    answerType: q.answerType,
    isRequired: q.isRequired,
    config: q.config,
    categoryName: categoryNameById.get(q.categoryId) ?? "Geral",
    options: (optionsByQuestion.get(q.id) ?? []).map((o) => ({ id: o.id, label: o.label, value: o.value })),
  }));

  return <ResponseForm publicToken={token} questions={formQuestions} />;
}
