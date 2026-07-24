"use server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { clients, plans, users } from "@/db/schema";
import { requireMaster } from "@/lib/auth/require-master";
import { createAsaasCheckout, createAsaasCustomer } from "@/lib/asaas/client";

export async function createClientWithOwner(
  _prev: { error?: string; inviteUrl?: string },
  formData: FormData
): Promise<{ error?: string; inviteUrl?: string }> {
  await requireMaster();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  if (!name || !/^[a-z0-9-]{2,}$/.test(slug) || !ownerName || !ownerEmail) {
    return { error: "Preencha nome, slug (a-z0-9-), nome e email do owner" };
  }
  const inviteToken = nanoid(32);
  try {
    await db.transaction(async (tx) => {
      const [client] = await tx.insert(clients).values({ name, slug }).returning();
      await tx.insert(users).values({
        clientId: client.id,
        name: ownerName,
        email: ownerEmail,
        role: "owner",
        status: "invited",
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    });
  } catch {
    return { error: "Slug já existe ou dados inválidos" };
  }
  revalidatePath("/admin");
  return { inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/convite/${inviteToken}` };
}

// Atribui plano ao client e gera um checkout Asaas (assinatura recorrente,
// cartão hospedado) — o cartão do client nunca passa pelo nosso servidor.
// CNPJ não é persistido: só usado nessa chamada pra cadastrar o customer no Asaas.
export async function assignPlanAndCreateCheckout(
  _prev: { error?: string; checkoutUrl?: string },
  formData: FormData
): Promise<{ error?: string; checkoutUrl?: string }> {
  await requireMaster();
  const clientId = String(formData.get("clientId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const billingCycle = String(formData.get("billingCycle") ?? "") as "monthly" | "annual";
  const cnpj = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  if (!clientId || !planId || (billingCycle !== "monthly" && billingCycle !== "annual") || cnpj.length < 11) {
    return { error: "Selecione plano, ciclo e informe um CNPJ/CPF válido" };
  }

  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  const plan = await db.query.plans.findFirst({ where: eq(plans.id, planId) });
  const owner = await db.query.users.findFirst({
    where: and(eq(users.clientId, clientId), eq(users.role, "owner")),
  });
  if (!client || !plan || !owner) return { error: "Client, plano ou owner não encontrado" };

  try {
    let asaasCustomerId = client.asaasCustomerId;
    if (!asaasCustomerId) {
      const customer = await createAsaasCustomer({ name: client.name, email: owner.email, cpfCnpj: cnpj });
      asaasCustomerId = customer.id;
    }

    const value = billingCycle === "monthly" ? Number(plan.priceMonthly) : Number(plan.priceAnnual);
    const checkout = await createAsaasCheckout({
      customerData: { name: client.name, email: owner.email, cpfCnpj: cnpj },
      value,
      cycle: billingCycle === "monthly" ? "MONTHLY" : "YEARLY",
      externalReference: client.id,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
    });

    await db
      .update(clients)
      .set({ planId, billingCycle, asaasCustomerId, subscriptionStatus: "pending", updatedAt: new Date() })
      .where(eq(clients.id, clientId));

    revalidatePath("/admin");
    return { checkoutUrl: checkout.link };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao criar assinatura no Asaas" };
  }
}
