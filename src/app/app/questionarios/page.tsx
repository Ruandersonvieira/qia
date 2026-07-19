import Link from "next/link";
import { requireGestor } from "@/lib/auth/session";
import { listQuestionnaires } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const USE_CASE_LABELS: Record<string, string> = {
  clima: "Clima",
  nr1: "NR-1",
  market_research: "Pesquisa de mercado",
  nps: "NPS",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  active: "default",
  archived: "outline",
};

export default async function QuestionariosPage() {
  await requireGestor();
  const questionnaires = await listQuestionnaires();

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Questionários</h1>
        <Button render={<Link href="/app/questionarios/novo" />}>Novo questionário</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Caso de uso</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-28">Perguntas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questionnaires.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum questionário criado ainda.
              </TableCell>
            </TableRow>
          )}
          {questionnaires.map((q) => (
            <TableRow key={q.id}>
              <TableCell className="font-medium">
                <Link className="underline" href={`/app/questionarios/${q.id}`}>
                  {q.title}
                </Link>
              </TableCell>
              <TableCell>{q.useCase ? USE_CASE_LABELS[q.useCase] : "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
              </TableCell>
              <TableCell>{q.questionCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
