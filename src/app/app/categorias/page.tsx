import { requireGestor } from "@/lib/auth/session";
import { listCategories, createCategory, updateCategory } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CategoryEditForm from "./category-edit-form";

export default async function CategoriasPage() {
  const { clientId } = await requireGestor();
  const cats = await listCategories();

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Categorias</h1>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Criar Categoria</h2>
        <form action={createCategory} className="flex gap-2">
          <Input
            type="text"
            name="name"
            placeholder="Nome"
            required
            className="flex-1"
          />
          <Input
            type="text"
            name="description"
            placeholder="Descrição"
            className="flex-1"
          />
          <Button type="submit">Criar</Button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Categorias</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-20">Tipo</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell>{cat.description}</TableCell>
                <TableCell>
                  {cat.clientId === null && <Badge variant="outline">Global</Badge>}
                </TableCell>
                <TableCell>
                  {cat.clientId === clientId && (
                    <CategoryEditForm category={cat} onUpdate={updateCategory} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
