"use client";
import { useActionState } from "react";
import { createPlan } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";

export function CreatePlanForm() {
  const [state, formAction, pending] = useActionState(createPlan, {});

  return (
    <Card className="w-full">
      <CardHeader><CardTitle>Novo plano</CardTitle></CardHeader>
      <CardContent>
        <form action={formAction} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlyResponseLimit">Limite de respostas/mês</Label>
            <Input id="monthlyResponseLimit" name="monthlyResponseLimit" type="number" min={1} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceMonthly">Preço mensal (R$)</Label>
            <Input id="priceMonthly" name="priceMonthly" type="number" min={0} step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceAnnual">Preço anual (R$)</Label>
            <Input id="priceAnnual" name="priceAnnual" type="number" min={0} step="0.01" required />
          </div>
          <div className="col-span-2">
            <FormError message={state.error} />
            <Button type="submit" disabled={pending} className="mt-2 w-full">Criar plano</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
