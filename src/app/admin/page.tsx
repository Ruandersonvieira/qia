import Link from "next/link";
import { requireMaster } from "@/lib/auth/require-master";
import { db } from "@/db/client";
import { CreateClientForm } from "./create-client-form";
import { AssignPlanForm } from "./assign-plan-form";

export default async function AdminPage() {
  await requireMaster();
  const [allClients, allPlans] = await Promise.all([
    db.query.clients.findMany({ orderBy: (c, { desc }) => [desc(c.createdAt)] }),
    db.query.plans.findMany({ where: (p, { eq }) => eq(p.active, true) }),
  ]);
  const planNameById = new Map(allPlans.map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin — Clients</h1>
        <Link href="/admin/planos" className="text-sm text-muted-foreground hover:underline">Planos →</Link>
      </div>
      <CreateClientForm />
      <ul className="space-y-2">
        {allClients.map((c) => (
          <li key={c.id} className="rounded border p-3">
            <span className="font-medium">{c.name}</span>{" "}
            <span className="text-sm text-muted-foreground">
              ({c.slug}) — {c.status} · plano: {c.planId ? planNameById.get(c.planId) ?? "?" : "nenhum"} · assinatura: {c.subscriptionStatus}
            </span>
            <AssignPlanForm
              clientId={c.id}
              plans={allPlans}
              currentPlanId={c.planId}
              currentBillingCycle={c.billingCycle}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
