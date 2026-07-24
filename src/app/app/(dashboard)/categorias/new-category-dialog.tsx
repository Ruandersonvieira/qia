"use client";
import { Plus } from "lucide-react";
import { createCategory } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/ui/form-dialog";

export function NewCategoryDialog() {
  return (
    <FormDialog
      trigger={
        <Button className="gap-1.5">
          <Plus className="size-4" />
          Nova categoria
        </Button>
      }
      title="Nova categoria"
      action={createCategory}
      successMessage="Categoria criada."
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" type="text" name="name" placeholder="Ex.: Clima" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" type="text" name="description" placeholder="Descrição opcional" />
      </div>
    </FormDialog>
  );
}
