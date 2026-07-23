import { pgTable, uuid, text, timestamp, integer, numeric, boolean, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { paymentStatusEnum } from "./enums";
import { clients } from "./clients";

// Catálogo gerenciado só pelo admin master (/admin) — client nunca cria/edita plano,
// só é atribuído a um.
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  monthlyResponseLimit: integer("monthly_response_limit").notNull(),
  priceMonthly: numeric("price_monthly").notNull(),
  priceAnnual: numeric("price_annual").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Histórico de cobranças da assinatura, populado pelo webhook do Asaas — nunca
// escrito por ação do usuário, só leitura pro client em /app/billing.
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    asaasPaymentId: text("asaas_payment_id").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    value: numeric("value").notNull(),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    billingType: text("billing_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("payments_asaas_id_ux").on(t.asaasPaymentId), index("payments_client_ix").on(t.clientId)]
);
