"use client";
import { useActionState } from "react";
import { assignPlanAndCreateCheckout } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { InviteLinkBox } from "@/components/ui/invite-link-box";

type Plan = { id: string; name: string };

export function AssignPlanForm({
  clientId,
  plans,
  currentPlanId,
  currentBillingCycle,
}: {
  clientId: string;
  plans: Plan[];
  currentPlanId: string | null;
  currentBillingCycle: "monthly" | "annual" | null;
}) {
  const [state, formAction, pending] = useActionState(assignPlanAndCreateCheckout, {});

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="space-y-1">
        <Label htmlFor={`plan-${clientId}`} className="text-xs">Plano</Label>
        <select
          id={`plan-${clientId}`}
          name="planId"
          defaultValue={currentPlanId ?? ""}
          required
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="" disabled>Selecione</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`cycle-${clientId}`} className="text-xs">Ciclo</Label>
        <select
          id={`cycle-${clientId}`}
          name="billingCycle"
          defaultValue={currentBillingCycle ?? "monthly"}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="monthly">Mensal</option>
          <option value="annual">Anual</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`cnpj-${clientId}`} className="text-xs">CNPJ/CPF</Label>
        <Input id={`cnpj-${clientId}`} name="cnpj" placeholder="00.000.000/0000-00" className="h-9 w-44" required />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Gerando…" : "Gerar checkout"}
      </Button>
      {state.error && <FormError message={state.error} />}
      {state.checkoutUrl && (
        <div className="w-full">
          <InviteLinkBox url={state.checkoutUrl} />
        </div>
      )}
    </form>
  );
}
