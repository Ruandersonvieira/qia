import { Inbox, type LucideIcon } from "lucide-react";
import { DataTableClient } from "./data-table-client";
import { PAGE_SIZE } from "./paged-result";

export type DataTableColumn<T> = {
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  cell: (row: T) => React.ReactNode;
};

export type DataTableFilter = {
  label: string;
  paramKey: string;
  options: { value: string; label: string }[];
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  total: number;
  page: number;
  rowKey: (row: T) => string;
  emptyIcon?: LucideIcon;
  emptyMessage?: React.ReactNode;
  action?: React.ReactNode;
  searchParamKey?: string;
  filterPlaceholder?: string;
  filters?: DataTableFilter[];
};

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  rowKey,
  emptyIcon: EmptyIcon = Inbox,
  emptyMessage = "Nenhum item encontrado.",
  action,
  searchParamKey,
  filterPlaceholder = "Buscar…",
  filters = [],
}: DataTableProps<T>) {
  const rows = data.map((row) => ({
    key: rowKey(row),
    cells: columns.map((col) => ({ content: col.cell(row), className: col.cellClassName })),
  }));
  const headers = columns.map((col) => ({ label: col.header, className: col.headerClassName }));

  return (
    <DataTableClient
      headers={headers}
      rows={rows}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      action={action}
      searchParamKey={searchParamKey}
      filterPlaceholder={filterPlaceholder}
      filters={filters}
      emptyIcon={<EmptyIcon className="size-6" />}
      emptyMessage={emptyMessage}
    />
  );
}
