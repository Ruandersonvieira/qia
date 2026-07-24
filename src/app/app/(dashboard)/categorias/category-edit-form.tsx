"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/ui/form-dialog";
import type { ActionResult } from "@/lib/toast";

interface Category {
  id: string;
  name: string;
  description: string;
}

interface CategoryEditFormProps {
  category: Category;
  onUpdate: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export default function CategoryEditForm({ category, onUpdate }: CategoryEditFormProps) {
  return (
    <FormDialog
      trigger={
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-3.5" />
          Editar
        </Button>
      }
      title="Editar categoria"
      action={onUpdate}
      successMessage="Categoria atualizada."
    >
      <input type="hidden" name="id" value={category.id} />
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={category.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" defaultValue={category.description} />
      </div>
    </FormDialog>
  );
}
