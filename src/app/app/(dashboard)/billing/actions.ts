import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, payments, plans, usageRecords } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export async function getBillingOverview() {
  const { clientId } = await requireAdmin();
  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  if (!client) throw new Error("Client não encontrado");

  const plan = client.planId ? await db.query.plans.findFirst({ where: eq(plans.id, client.planId) }) : null;

  const period = new Date().toISOString().slice(0, 8) + "01"; // primeiro dia do mês corrente, mesma regra do pipeline
  const usageRows = await db.query.usageRecords.findMany({
    where: and(eq(usageRecords.clientId, clientId), eq(usageRecords.period, period)),
  });
  const responsesThisMonth = usageRows.reduce((s, r) => s + r.responseCount, 0);

  const paymentHistory = await db.query.payments.findMany({
    where: eq(payments.clientId, clientId),
    orderBy: (p, { desc }) => [desc(p.dueDate)],
    limit: 12,
  });

  return {
    plan,
    billingCycle: client.billingCycle,
    subscriptionStatus: client.subscriptionStatus,
    responsesThisMonth,
    monthlyResponseLimit: plan?.monthlyResponseLimit ?? null,
    paymentHistory,
  };
}
