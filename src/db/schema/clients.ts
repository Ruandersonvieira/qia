import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { billingCycleEnum, clientStatus, subscriptionStatusEnum, userRole, userStatus } from "./enums";
import { plans } from "./billing";

export type ClientSettings = { minAnonymityN: number };

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: clientStatus("status").notNull().default("active"),
  settings: jsonb("settings").$type<ClientSettings>().notNull().default({ minAnonymityN: 5 }),
  planId: uuid("plan_id").references(() => plans.id),
  billingCycle: billingCycleEnum("billing_cycle"),
  asaasCustomerId: text("asaas_customer_id"),
  asaasSubscriptionId: text("asaas_subscription_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    authUserId: text("auth_user_id").unique(), // id do user Better Auth; null até aceitar convite
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("invited"),
    inviteToken: text("invite_token").unique(),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_client_email_ux").on(t.clientId, t.email), index("users_client_ix").on(t.clientId)]
);
