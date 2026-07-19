import { pgTable, uuid, text, timestamp, integer, boolean, numeric, uniqueIndex, index } from "drizzle-orm/pg-core";
import { cycleMode, cycleStatus, responseStatus } from "./enums";
import { clients } from "./clients";
import { questionnaires, questions } from "./questionnaires";
import { users } from "./clients";

export const cycles = pgTable(
  "cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    questionnaireId: uuid("questionnaire_id").notNull().references(() => questionnaires.id),
    isPublic: boolean("is_public").notNull().default(true),
    publicToken: text("public_token").unique(),
    mode: cycleMode("mode").notNull().default("one_off"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    maxResponses: integer("max_responses"),
    questionCount: integer("question_count").notNull(), // snapshot no disparo, imutável
    status: cycleStatus("status").notNull().default("open"),
    analysisError: text("analysis_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("cycles_client_ix").on(t.clientId, t.questionnaireId)]
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
    userId: uuid("user_id").references(() => users.id), // null em ciclo público
    anonKey: text("anon_key").notNull(),
    sessionFingerprint: text("session_fingerprint"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    status: responseStatus("status").notNull().default("submitted"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("responses_cycle_fingerprint_ux").on(t.cycleId, t.sessionFingerprint),
    index("responses_client_cycle_ix").on(t.clientId, t.cycleId),
  ]
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id").notNull().references(() => responses.id),
    questionId: uuid("question_id").notNull().references(() => questions.id),
    valueNumeric: numeric("value_numeric"),
    valueText: text("value_text"),
    valueOptions: uuid("value_options").array(),
    maskedText: text("masked_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("answers_response_question_ux").on(t.responseId, t.questionId)]
);
