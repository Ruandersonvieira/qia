import { Tags } from "lucide-react";
import { requireGestor } from "@/lib/auth/session";
import { listCategories, updateCategory } from "./actions";
import { Badge } from "@/components/ui/badge";
import CategoryEditForm from "./category-edit-form";
import { DataTable, type DataTableColumn, type DataTableFilter } from "../_components/data-table";
import { PageContainer } from "../_components/page-container";
import { NewCategoryDialog } from "./new-category-dialog";
import { parsePage, parseParam } from "../_components/paged-result";

type Category = Awaited<ReturnType<typeof listCategories>>["data"][number];

function buildColumns(clientId: string): DataTableColumn<Category>[] {
  return [
    { header: "Nome", cellClassName: "font-medium", cell: (cat) => cat.name },
    { header: "Descrição", cell: (cat) => cat.description },
    {
      header: "Tipo",
      headerClassName: "w-20",
      cell: (cat) => cat.clientId === null && <Badge variant="outline">Global</Badge>,
    },
    {
      header: "Ações",
      headerClassName: "w-20",
      cell: (cat) => cat.clientId === clientId && <CategoryEditForm category={cat} onUpdate={updateCategory} />,
    },
  ];
}

const filters: DataTableFilter[] = [
  {
    label: "Tipo",
    paramKey: "type",
    options: [
      { value: "global", label: "Global" },
      { value: "own", label: "Específica da empresa" },
    ],
  },
];

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { clientId } = await requireGestor();
  const sp = await searchParams;
  const typeParam = parseParam(sp.type);
  const { data, total } = await listCategories({
    q: parseParam(sp.q),
    type: typeParam === "global" || typeParam === "own" ? typeParam : undefined,
    page: parsePage(sp.page),
  });

  return (
    <PageContainer icon={Tags} title="Categorias">
      <DataTable
        columns={buildColumns(clientId)}
        data={data}
        total={total}
        page={parsePage(sp.page)}
        rowKey={(cat) => cat.id}
        emptyIcon={Tags}
        emptyMessage="Nenhuma categoria ainda."
        searchParamKey="q"
        filterPlaceholder="Buscar categoria…"
        filters={filters}
        action={<NewCategoryDialog />}
      />
    </PageContainer>
  );
}
