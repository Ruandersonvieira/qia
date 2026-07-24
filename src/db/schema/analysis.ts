import { pgTable, uuid, text, timestamp, integer, numeric, jsonb, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { analysisKind, trendEnum } from "./enums";
import { clients } from "./clients";
import { cycles } from "./cycles";
import { categories, questions } from "./questionnaires";

export type Recommendation = { title: string; description: string };

export const analysisResults = pgTable(
  "analysis_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
    categoryId: uuid("category_id").references(() => categories.id), // null = cycle_summary
    questionId: uuid("question_id").references(() => questions.id), // preenchido só quando kind = question_summary
    kind: analysisKind("kind").notNull(),
    summary: text("summary").notNull(),
    score: numeric("score"),
    trend: trendEnum("trend"),
    recommendations: jsonb("recommendations").$type<Recommendation[]>().notNull().default([]),
    rawMetrics: jsonb("raw_metrics").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("analysis_results_client_cycle_ix").on(t.clientId, t.cycleId)]
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
    period: date("period").notNull(), // primeiro dia do mês de competência
    questionCount: integer("question_count").notNull(),
    responseCount: integer("response_count").notNull(),
    billableUnits: numeric("billable_units").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("usage_records_cycle_period_ux").on(t.cycleId, t.period)]
);
