import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { chatRole } from "./enums";
import { clients, users } from "./clients";
import { cycles } from "./cycles";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
    role: chatRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("chat_messages_cycle_created_ix").on(t.cycleId, t.createdAt)]
);

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
    content: text("content").notNull(),
    sourceMessageId: uuid("source_message_id").references(() => chatMessages.id),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("insights_client_cycle_ix").on(t.clientId, t.cycleId)]
);
