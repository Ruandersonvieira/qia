import Link from "next/link";
import { FileText, Inbox } from "lucide-react";
import { requireGestor } from "@/lib/auth/session";
import { listQuestionnaires } from "./actions";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn, type DataTableFilter } from "../_components/data-table";
import { PageContainer } from "../_components/page-container";
import { NewQuestionnaireDialog } from "./new-questionnaire-dialog";
import { USE_CASE_LABELS, STATUS_LABELS, STATUS_VARIANTS } from "./status";
import { parsePage, parseParam } from "../_components/paged-result";

type Questionnaire = Awaited<ReturnType<typeof listQuestionnaires>>["data"][number];

const columns: DataTableColumn<Questionnaire>[] = [
  {
    header: "Título",
    cellClassName: "font-medium",
    cell: (q) => (
      <Link className="underline" href={`/app/questionarios/${q.id}`}>
        {q.title}
      </Link>
    ),
  },
  {
    header: "Caso de uso",
    cell: (q) => (q.useCase ? USE_CASE_LABELS[q.useCase] : "—"),
  },
  {
    header: "Status",
    headerClassName: "w-28",
    cell: (q) => <Badge variant={STATUS_VARIANTS[q.status]}>{STATUS_LABELS[q.status]}</Badge>,
  },
  {
    header: "Perguntas",
    headerClassName: "w-28",
    cell: (q) => q.questionCount,
  },
];

const filters: DataTableFilter[] = [
  {
    label: "Status",
    paramKey: "status",
    options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
];

export default async function QuestionariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireGestor();
  const sp = await searchParams;
  const { data, total } = await listQuestionnaires({
    q: parseParam(sp.q),
    status: parseParam(sp.status),
    page: parsePage(sp.page),
  });

  return (
    <PageContainer icon={FileText} title="Questionários">
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={parsePage(sp.page)}
        rowKey={(q) => q.id}
        emptyIcon={Inbox}
        emptyMessage="Nenhum questionário criado ainda."
        searchParamKey="q"
        filterPlaceholder="Buscar questionário…"
        filters={filters}
        action={<NewQuestionnaireDialog />}
      />
    </PageContainer>
  );
}
