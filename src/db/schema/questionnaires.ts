import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { questionnaireStatus, useCase, answerType, questionStatus } from "./enums";
import { clients } from "./clients";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id), // null = global
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("categories_client_ix").on(t.clientId)]
);

export const questionnaires = pgTable(
  "questionnaires",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    useCase: useCase("use_case"),
    status: questionnaireStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("questionnaires_client_ix").on(t.clientId)]
);

export type QuestionConfig = { min?: number; max?: number; minLabel?: string; maxLabel?: string };

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    questionnaireId: uuid("questionnaire_id").notNull().references(() => questionnaires.id),
    categoryId: uuid("category_id").notNull().references(() => categories.id),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    analysisGoal: text("analysis_goal").notNull(),
    howToWork: text("how_to_work").notNull(),
    answerType: answerType("answer_type").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    config: jsonb("config").$type<QuestionConfig>().notNull().default({}),
    status: questionStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("questions_questionnaire_ix").on(t.clientId, t.questionnaireId)]
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id").notNull().references(() => questions.id),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("question_options_question_ix").on(t.questionId)]
);
