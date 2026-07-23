import { Users } from "lucide-react";
import { requireGestor } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { InviteUserForm, UserRowActions } from "./user-forms";
import { listUsers } from "./actions";
import { DataTable, type DataTableColumn, type DataTableFilter } from "../_components/data-table";
import { PageContainer } from "../_components/page-container";
import { ROLE_LABELS, STATUS_LABELS } from "./status";
import { parsePage, parseParam } from "../_components/paged-result";

type User = Awaited<ReturnType<typeof listUsers>>["data"][number];

function buildColumns(meId: string): DataTableColumn<User>[] {
  return [
    {
      header: "Nome",
      cellClassName: "font-medium",
      cell: (u) => (
        <>
          {u.name}
          {u.id === meId && <span className="ml-1 text-muted-foreground">(você)</span>}
        </>
      ),
    },
    { header: "Email", cell: (u) => u.email },
    { header: "Papel", cell: (u) => ROLE_LABELS[u.role] ?? u.role },
    {
      header: "Status",
      cell: (u) => {
        const status = STATUS_LABELS[u.status] ?? { label: u.status, variant: "outline" as const };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      header: "Ações",
      cell: (u) => u.role !== "owner" && u.id !== meId && <UserRowActions user={u} />,
    },
  ];
}

const filters: DataTableFilter[] = [
  {
    label: "Papel",
    paramKey: "role",
    options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    label: "Status",
    paramKey: "status",
    options: Object.entries(STATUS_LABELS).map(([value, s]) => ({ value, label: s.label })),
  },
];

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user: me } = await requireGestor();
  const sp = await searchParams;
  const { data, total } = await listUsers({
    q: parseParam(sp.q),
    role: parseParam(sp.role),
    status: parseParam(sp.status),
    page: parsePage(sp.page),
  });

  return (
    <PageContainer size="lg" icon={Users} title="Usuários">
      <DataTable
        columns={buildColumns(me.id)}
        data={data}
        total={total}
        page={parsePage(sp.page)}
        rowKey={(u) => u.id}
        emptyIcon={Users}
        emptyMessage="Nenhum usuário ainda."
        searchParamKey="q"
        filterPlaceholder="Buscar usuário…"
        filters={filters}
        action={<InviteUserForm />}
      />
    </PageContainer>
  );
}
