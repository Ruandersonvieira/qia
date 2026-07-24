import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, payments } from "@/db/schema";

type AsaasPayment = {
  id: string;
  customer: string;
  value: number;
  dueDate: string;
  billingType: string;
};

type AsaasWebhookBody = {
  event: string;
  payment?: AsaasPayment;
  subscription?: { id: string; customer: string };
};

// status do payment na nossa tabela reflete o evento recebido — não existe
// "cancelado" separado aqui porque o Asaas manda um novo evento pra isso.
const PAYMENT_STATUS_BY_EVENT: Record<string, "confirmed" | "received" | "overdue" | "refunded"> = {
  PAYMENT_CONFIRMED: "confirmed",
  PAYMENT_RECEIVED: "received",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_REFUNDED: "refunded",
};

const CLIENT_SUBSCRIPTION_STATUS_BY_EVENT: Record<string, "active" | "overdue" | "canceled"> = {
  PAYMENT_CONFIRMED: "active",
  PAYMENT_RECEIVED: "active",
  PAYMENT_OVERDUE: "overdue",
  SUBSCRIPTION_INACTIVATED: "canceled",
  SUBSCRIPTION_DELETED: "canceled",
};

export async function POST(request: Request) {
  const token = request.headers.get("asaas-access-token");
  if (!token || token !== process.env.ASAAS_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as AsaasWebhookBody;
  const customerId = body.payment?.customer ?? body.subscription?.customer;
  if (!customerId) return new Response("ok", { status: 200 });

  const client = await db.query.clients.findFirst({ where: eq(clients.asaasCustomerId, customerId) });
  if (!client) return new Response("ok", { status: 200 }); // evento de customer que não é nosso ou já removido

  if (body.subscription && body.event === "SUBSCRIPTION_CREATED") {
    await db.update(clients).set({ asaasSubscriptionId: body.subscription.id, updatedAt: new Date() }).where(eq(clients.id, client.id));
  }

  const paymentStatus = PAYMENT_STATUS_BY_EVENT[body.event];
  if (paymentStatus && body.payment) {
    await db
      .insert(payments)
      .values({
        clientId: client.id,
        asaasPaymentId: body.payment.id,
        status: paymentStatus,
        value: String(body.payment.value),
        dueDate: body.payment.dueDate,
        billingType: body.payment.billingType,
        paidAt: paymentStatus === "confirmed" || paymentStatus === "received" ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: payments.asaasPaymentId,
        set: {
          status: paymentStatus,
          paidAt: paymentStatus === "confirmed" || paymentStatus === "received" ? new Date() : null,
          updatedAt: new Date(),
        },
      });
  }

  const subscriptionStatus = CLIENT_SUBSCRIPTION_STATUS_BY_EVENT[body.event];
  if (subscriptionStatus) {
    await db.update(clients).set({ subscriptionStatus, updatedAt: new Date() }).where(eq(clients.id, client.id));
  }

  return new Response("ok", { status: 200 });
}
