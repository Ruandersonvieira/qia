"use client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateClientSettings } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";

export function SettingsForm({ name, minAnonymityN }: { name: string; minAnonymityN: number }) {
  const [state, formAction, pending] = useActionState(updateClientSettings, {});

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da empresa</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="minAnonymityN">Anonimato mínimo</Label>
        <Input
          id="minAnonymityN"
          name="minAnonymityN"
          type="number"
          min={1}
          defaultValue={minAnonymityN}
          required
        />
        <p className="text-sm text-muted-foreground">
          Número mínimo de respondentes num ciclo para que trechos de texto livre entrem na análise.
        </p>
      </div>
      <FormError message={state.error} icon />
      <Button type="submit" disabled={pending} className="gap-1.5">
        <Save className="size-4" />
        Salvar
      </Button>
    </form>
  );
}
