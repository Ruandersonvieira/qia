import { pgEnum } from "drizzle-orm/pg-core";

export const clientStatus = pgEnum("client_status", ["active", "suspended", "canceled"]);
export const userRole = pgEnum("user_role", ["owner", "admin", "manager", "respondent"]);
export const userStatus = pgEnum("user_status", ["active", "invited", "inactive"]);
export const masterStatus = pgEnum("master_status", ["active", "inactive"]);
export const questionnaireStatus = pgEnum("questionnaire_status", ["draft", "active", "archived"]);
export const caseUseEnum = pgEnum("use_case", ["clima", "nr1", "market_research", "nps", "other"]);
export const answerType = pgEnum("answer_type", ["scale", "single_choice", "multi_choice", "nps", "free_text", "boolean"]);
export const questionStatus = pgEnum("question_status", ["active", "archived"]);
export const cycleMode = pgEnum("cycle_mode", ["one_off"]);
export const cycleStatus = pgEnum("cycle_status", ["scheduled", "open", "closed", "processing", "analyzed"]);
export const responseStatus = pgEnum("response_status", ["in_progress", "submitted"]);
export const analysisKind = pgEnum("analysis_kind", ["category_summary", "cycle_summary", "persona"]);
export const trendEnum = pgEnum("trend", ["up", "stable", "down"]);
