"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataTableFilter } from "./data-table";

export type DataTableRow = {
  key: string;
  cells: { content: React.ReactNode; className?: string }[];
};

type DataTableClientProps = {
  headers: { label: string; className?: string }[];
  rows: DataTableRow[];
  total: number;
  page: number;
  pageSize: number;
  action?: React.ReactNode;
  searchParamKey?: string;
  filterPlaceholder: string;
  filters?: DataTableFilter[];
  emptyIcon: React.ReactNode;
  emptyMessage: React.ReactNode;
};

const DEBOUNCE_MS = 300;

export function DataTableClient({
  headers,
  rows,
  total,
  page,
  pageSize,
  action,
  searchParamKey,
  filterPlaceholder,
  filters = [],
  emptyIcon,
  emptyMessage,
}: DataTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => (searchParamKey ? searchParams.get(searchParamKey) ?? "" : ""));

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // qualquer mudança de busca/filtro volta pra página 1
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // debounce: só escreve na URL (e dispara refetch no server) 300ms depois de
  // parar de digitar — sem isso cada tecla recarregaria a página inteira.
  useEffect(() => {
    if (!searchParamKey) return;
    const current = searchParams.get(searchParamKey) ?? "";
    if (query === current) return;
    const timeout = setTimeout(() => updateParams({ [searchParamKey]: query }), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) params.set("page", String(newPage));
    else params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3">
      {(searchParamKey || filters.length > 0 || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {searchParamKey && (
              <div className="relative w-full max-w-xs">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={filterPlaceholder}
                  className="pl-8"
                />
              </div>
            )}
            {filters.map((f) => (
              <select
                key={f.paramKey}
                value={searchParams.get(f.paramKey) ?? ""}
                onChange={(e) => updateParams({ [f.paramKey]: e.target.value })}
                className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              >
                <option value="">{f.label}: todos</option>
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ))}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h.label} className={h.className}>
                {h.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={headers.length} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  {total === 0 && !searchParams.toString() ? (
                    <>
                      {emptyIcon}
                      {emptyMessage}
                    </>
                  ) : (
                    <>
                      <Search className="size-6" />
                      Nenhum resultado para os filtros selecionados.
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.key}>
                {row.cells.map((cell, i) => (
                  <TableCell key={i} className={cell.className}>
                    {cell.content}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{from}–{to} de {total}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
