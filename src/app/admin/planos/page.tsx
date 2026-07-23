import Link from "next/link";
import { requireMaster } from "@/lib/auth/require-master";
import { db } from "@/db/client";
import { CreatePlanForm } from "./create-plan-form";

export default async function PlanosPage() {
  await requireMaster();
  const allPlans = await db.query.plans.findMany({ orderBy: (p, { desc }) => [desc(p.createdAt)] });

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin — Planos</h1>
        <Link href="/admin" className="text-sm text-muted-foreground hover:underline">← Clients</Link>
      </div>
      <CreatePlanForm />
      <ul className="space-y-2">
        {allPlans.map((p) => (
          <li key={p.id} className="rounded border p-3 text-sm">
            <span className="font-medium">{p.name}</span>{" "}
            <span className="text-muted-foreground">
              — {p.monthlyResponseLimit} respostas/mês · R$ {Number(p.priceMonthly).toFixed(2)}/mês ou R${" "}
              {Number(p.priceAnnual).toFixed(2)}/ano {!p.active && "(inativo)"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
