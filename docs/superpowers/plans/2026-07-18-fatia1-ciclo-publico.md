# Fatia 1 — Ciclo Público: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ciclo público end-to-end: gestor cria questionário, abre ciclo via link público, pessoas respondem sem login, fechamento roda análise por categoria na Claude API e gera relatório.

**Architecture:** Next.js 15 fullstack (App Router, server actions) num único projeto. Postgres com Drizzle ORM, isolamento multi-tenant por `client_id` filtrado na aplicação. Better Auth para gestores; sessão JWT própria para masters em `/admin`. Pipeline de análise inline (sem fila), com agregação/mascaramento em lib pura testada por Vitest.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS 4, shadcn/ui, Drizzle ORM + drizzle-kit, Postgres 16 (Docker), Better Auth, `@anthropic-ai/sdk`, jose, bcryptjs, nanoid, qrcode.react, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-18-fatia1-ciclo-publico-design.md`
- Modelagem de referência: `docs/modelagem.md` — tabela `tenants` renomeada para `clients`, FK `client_id`
- Package manager: **pnpm**
- UI em **pt-BR**
- Toda query de negócio na área do gestor filtra por `client_id` da sessão — sem exceção
- Pipeline de análise nunca recebe `user_id`, email, `session_fingerprint` ou `value_text` bruto de pergunta sensível; free_text só via `masked_text`
- Pergunta `is_sensitive` só entra na análise se o ciclo tiver ≥ N respondentes (N = `clients.settings.minAnonymityN`, default 5)
- Modelo Claude: `claude-sonnet-5`
- Env vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `MASTER_SESSION_SECRET`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL`
- Testes: unit para lib pura; integração contra Postgres local (`qia_test`); UI verificada manualmente conforme steps
- Commits frequentes, Conventional Commits, co-author `Claude Fable 5 <noreply@anthropic.com>`

---

## Estrutura de arquivos (visão geral)

```
qia/
  docker-compose.yml
  drizzle.config.ts
  vitest.config.ts
  .env.example
  scripts/
    seed-master.ts
    seed-categories.ts
  src/
    db/
      client.ts
      schema/{index,enums,auth,master,clients,questionnaires,cycles,analysis}.ts
      migrations/
    lib/
      auth/{auth,master-session,session}.ts
      public/{submit-response}.ts
      analysis/{aggregate,mask,prompts,claude,pipeline}.ts
    app/
      admin/           # área master
      app/             # área do gestor
      convite/[token]/ # aceite de convite
      r/[token]/       # página pública
      api/auth/[...all]/route.ts
    components/ui/     # shadcn
  tests/
    unit/
    integration/
    setup.ts
```

---

### Task 1: Scaffold do projeto

**Files:**
- Create: projeto Next.js na raiz `qia/` (o diretório já tem `docs/` e `.git/`)
- Create: `docker-compose.yml`, `drizzle.config.ts`, `vitest.config.ts`, `.env.example`, `.env.local`, `tests/setup.ts`

**Interfaces:**
- Produces: projeto rodando (`pnpm dev`), Postgres up, Vitest configurado, alias `@/` → `src/`

- [ ] **Step 1: Criar app Next.js**

```bash
cd /Users/ruandersonvieira/Workspace/startups/qia
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Se reclamar de diretório não vazio por causa de `docs/`, criar em pasta temporária e mover o conteúdo (menos `.git`) pra raiz.

- [ ] **Step 2: Instalar dependências**

```bash
pnpm add drizzle-orm pg better-auth @anthropic-ai/sdk jose bcryptjs nanoid qrcode.react
pnpm add -D drizzle-kit vitest @types/pg @types/bcryptjs tsx dotenv
```

- [ ] **Step 3: shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button card input label textarea select table badge separator
```

- [ ] **Step 4: docker-compose.yml**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: qia
      POSTGRES_PASSWORD: qia
      POSTGRES_DB: qia
    ports:
      - "5432:5432"
    volumes:
      - qia_pgdata:/var/lib/postgresql/data
volumes:
  qia_pgdata:
```

```bash
docker compose up -d
docker compose exec db createdb -U qia qia_test
```

- [ ] **Step 5: Configs**

`.env.example` (copiar pra `.env.local` preenchendo segredos):

```env
DATABASE_URL=postgres://qia:qia@localhost:5432/qia
BETTER_AUTH_SECRET=troque-por-um-segredo
MASTER_SESSION_SECRET=troque-por-outro-segredo
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
    fileParallelism: false,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`tests/setup.ts`:

```ts
process.env.DATABASE_URL = "postgres://qia:qia@localhost:5432/qia_test";
```

Adicionar scripts no `package.json`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"test": "vitest run",
"seed:master": "tsx scripts/seed-master.ts",
"seed:categories": "tsx scripts/seed-categories.ts"
```

- [ ] **Step 6: Verificar**

Run: `pnpm dev` → http://localhost:3000 responde. `pnpm test` → "no test files found" (ok).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js + Drizzle + Vitest + Postgres docker"
```

---

### Task 2: Schema Drizzle + migrations

**Files:**
- Create: `src/db/schema/enums.ts`, `src/db/schema/master.ts`, `src/db/schema/clients.ts`, `src/db/schema/questionnaires.ts`, `src/db/schema/cycles.ts`, `src/db/schema/analysis.ts`, `src/db/schema/index.ts`, `src/db/client.ts`

**Interfaces:**
- Produces: `db` (drizzle client), todas as tabelas de negócio exportadas de `@/db/schema`

- [ ] **Step 1: Enums** — `src/db/schema/enums.ts`

```ts
import { pgEnum } from "drizzle-orm/pg-core";

export const clientStatus = pgEnum("client_status", ["active", "suspended", "canceled"]);
export const userRole = pgEnum("user_role", ["owner", "admin", "manager", "respondent"]);
export const userStatus = pgEnum("user_status", ["active", "invited", "inactive"]);
export const masterStatus = pgEnum("master_status", ["active", "inactive"]);
export const questionnaireStatus = pgEnum("questionnaire_status", ["draft", "active", "archived"]);
export const useCase = pgEnum("use_case", ["clima", "nr1", "market_research", "nps", "other"]);
export const answerType = pgEnum("answer_type", ["scale", "single_choice", "multi_choice", "nps", "free_text", "boolean"]);
export const questionStatus = pgEnum("question_status", ["active", "archived"]);
export const cycleMode = pgEnum("cycle_mode", ["one_off"]);
export const cycleStatus = pgEnum("cycle_status", ["scheduled", "open", "closed", "processing", "analyzed"]);
export const responseStatus = pgEnum("response_status", ["in_progress", "submitted"]);
export const analysisKind = pgEnum("analysis_kind", ["category_summary", "cycle_summary", "persona"]);
export const trendEnum = pgEnum("trend", ["up", "stable", "down"]);
```

- [ ] **Step 2: master + clients** — `src/db/schema/master.ts`:

```ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { masterStatus } from "./enums";

export const masterUsers = pgTable("master_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  status: masterStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

`src/db/schema/clients.ts`:

```ts
import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { clientStatus, userRole, userStatus } from "./enums";

export type ClientSettings = { minAnonymityN: number };

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: clientStatus("status").notNull().default("active"),
  settings: jsonb("settings").$type<ClientSettings>().notNull().default({ minAnonymityN: 5 }),
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
```

- [ ] **Step 3: questionnaires** — `src/db/schema/questionnaires.ts`:

```ts
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
```

- [ ] **Step 4: cycles** — `src/db/schema/cycles.ts`:

```ts
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
```

- [ ] **Step 5: analysis** — `src/db/schema/analysis.ts`:

```ts
import { pgTable, uuid, text, timestamp, integer, numeric, jsonb, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { analysisKind, trendEnum } from "./enums";
import { clients } from "./clients";
import { cycles } from "./cycles";
import { categories } from "./questionnaires";

export type Recommendation = { title: string; description: string };

export const analysisResults = pgTable(
  "analysis_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    cycleId: uuid("cycle_id").notNull().references(() => cycles.id),
    categoryId: uuid("category_id").references(() => categories.id), // null = cycle_summary
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
```

- [ ] **Step 6: index + client** — `src/db/schema/index.ts`:

```ts
export * from "./enums";
export * from "./master";
export * from "./clients";
export * from "./questionnaires";
export * from "./cycles";
export * from "./analysis";
export * from "./auth"; // criado na Task 3 — deixar o export comentado até lá
```

`src/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

- [ ] **Step 7: Gerar e rodar migration**

```bash
pnpm db:generate && pnpm db:migrate
DATABASE_URL=postgres://qia:qia@localhost:5432/qia_test pnpm db:migrate
docker compose exec db psql -U qia -d qia -c "\dt"
```

Expected: tabelas `clients, users, master_users, categories, questionnaires, questions, question_options, cycles, responses, answers, analysis_results, usage_records`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: schema Drizzle da fatia 1 + migrations"
```

---

### Task 3: Better Auth (gestores)

**Files:**
- Create: `src/lib/auth/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/db/schema/auth.ts` (gerado), `src/lib/auth/session.ts`

**Interfaces:**
- Consumes: `db`, `users` (Task 2)
- Produces: `auth` (instância Better Auth), `requireGestor(): Promise<{ clientId: string; user: BizUser }>` — redireciona pra `/app/login` sem sessão

- [ ] **Step 1: Config** — `src/lib/auth/auth.ts`:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        // só cria auth user se existir convite pendente com este email
        before: async (user) => {
          const invited = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });
          if (!invited || invited.status !== "invited") {
            throw new Error("Cadastro permitido apenas por convite");
          }
          return { data: user };
        },
      },
    },
  },
});
```

- [ ] **Step 2: Gerar tabelas do Better Auth**

```bash
pnpm dlx @better-auth/cli generate --config src/lib/auth/auth.ts --output src/db/schema/auth.ts
```

Descomentar `export * from "./auth"` em `src/db/schema/index.ts`. Rodar `pnpm db:generate && pnpm db:migrate` (e no `qia_test`).

- [ ] **Step 3: Route handler** — `src/app/api/auth/[...all]/route.ts`:

```ts
import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 4: Session helper** — `src/lib/auth/session.ts`:

```ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export async function requireGestor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/app/login");
  const user = await db.query.users.findFirst({
    where: eq(users.authUserId, session.user.id),
  });
  if (!user || user.status !== "active" || (user.role !== "owner" && user.role !== "admin")) {
    redirect("/app/login");
  }
  return { clientId: user.clientId, user };
}
```

- [ ] **Step 5: Verificar build + commit**

Run: `pnpm build` → sem erro de tipo.

```bash
git add -A && git commit -m "feat: Better Auth com signup restrito a convidados"
```

---

### Task 4: Sessão master (lib, TDD)

**Files:**
- Create: `src/lib/auth/master-session.ts`, `scripts/seed-master.ts`
- Test: `tests/unit/master-session.test.ts`

**Interfaces:**
- Produces: `createMasterToken(masterUserId: string): Promise<string>`, `verifyMasterToken(token: string): Promise<string | null>`, `MASTER_COOKIE = "qia_master"`

- [ ] **Step 1: Teste que falha** — `tests/unit/master-session.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createMasterToken, verifyMasterToken } from "@/lib/auth/master-session";

beforeAll(() => {
  process.env.MASTER_SESSION_SECRET = "test-secret";
});

describe("master session", () => {
  it("assina e verifica token com id do master", async () => {
    const token = await createMasterToken("abc-123");
    expect(await verifyMasterToken(token)).toBe("abc-123");
  });

  it("rejeita token inválido", async () => {
    expect(await verifyMasterToken("lixo")).toBeNull();
  });

  it("rejeita token assinado com outro segredo", async () => {
    const token = await createMasterToken("abc-123");
    process.env.MASTER_SESSION_SECRET = "outro";
    expect(await verifyMasterToken(token)).toBeNull();
    process.env.MASTER_SESSION_SECRET = "test-secret";
  });
});
```

- [ ] **Step 2: Rodar** — `pnpm vitest run tests/unit/master-session.test.ts` → FAIL (módulo não existe)

- [ ] **Step 3: Implementar** — `src/lib/auth/master-session.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";

export const MASTER_COOKIE = "qia_master";

const secret = () => new TextEncoder().encode(process.env.MASTER_SESSION_SECRET!);

export async function createMasterToken(masterUserId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(masterUserId)
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyMasterToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Rodar** — PASS

- [ ] **Step 5: Seed do master** — `scripts/seed-master.ts`:

```ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { masterUsers } from "../src/db/schema";

async function main() {
  const email = process.env.MASTER_EMAIL;
  const password = process.env.MASTER_PASSWORD;
  if (!email || !password) throw new Error("Defina MASTER_EMAIL e MASTER_PASSWORD");
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.query.masterUsers.findFirst({ where: eq(masterUsers.email, email) });
  if (existing) {
    await db.update(masterUsers).set({ passwordHash }).where(eq(masterUsers.id, existing.id));
    console.log("Master atualizado:", email);
  } else {
    await db.insert(masterUsers).values({ name: "Master", email, passwordHash });
    console.log("Master criado:", email);
  }
  process.exit(0);
}
main();
```

Run: `MASTER_EMAIL=admin@qia.local MASTER_PASSWORD=admin123 pnpm seed:master` → "Master criado".

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: sessão master (JWT) + seed do master user"
```

---

### Task 5: Área /admin — login master e criação de client/owner

**Files:**
- Create: `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/actions.ts`, `src/lib/auth/require-master.ts`

**Interfaces:**
- Consumes: `masterUsers`, `clients`, `users`, `createMasterToken`, `verifyMasterToken`, `MASTER_COOKIE`
- Produces: fluxo master completo; `createClientWithOwner` gera `users.inviteToken` (nanoid 32, expira em 7 dias) e retorna link `/convite/[token]`

- [ ] **Step 1: Guard** — `src/lib/auth/require-master.ts`:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { MASTER_COOKIE, verifyMasterToken } from "./master-session";
import { db } from "@/db/client";
import { masterUsers } from "@/db/schema";

export async function requireMaster() {
  const token = (await cookies()).get(MASTER_COOKIE)?.value;
  const masterId = token ? await verifyMasterToken(token) : null;
  if (!masterId) redirect("/admin/login");
  const master = await db.query.masterUsers.findFirst({ where: eq(masterUsers.id, masterId) });
  if (!master || master.status !== "active") redirect("/admin/login");
  return master;
}
```

- [ ] **Step 2: Login action** — `src/app/admin/login/actions.ts`:

```ts
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { masterUsers } from "@/db/schema";
import { createMasterToken, MASTER_COOKIE } from "@/lib/auth/master-session";

export async function masterLogin(_prev: { error?: string }, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const master = await db.query.masterUsers.findFirst({ where: eq(masterUsers.email, email) });
  if (!master || master.status !== "active" || !(await bcrypt.compare(password, master.passwordHash))) {
    return { error: "Credenciais inválidas" };
  }
  (await cookies()).set(MASTER_COOKIE, await createMasterToken(master.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}
```

- [ ] **Step 3: Login page** — `src/app/admin/login/page.tsx`:

```tsx
"use client";
import { useActionState } from "react";
import { masterLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(masterLogin, {});
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Admin — Login master</CardTitle></CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Criar client + owner** — `src/app/admin/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { clients, users } from "@/db/schema";
import { requireMaster } from "@/lib/auth/require-master";

export async function createClientWithOwner(_prev: { error?: string; inviteUrl?: string }, formData: FormData) {
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
```

- [ ] **Step 5: Dashboard admin** — `src/app/admin/layout.tsx` chama `requireMaster()` (exceto em `/admin/login` — login fica fora do guard por ser rota irmã; layout raiz de `/admin` não pode envolver o login, então o guard vai no `page.tsx` de `/admin` e futuros filhos):

`src/app/admin/page.tsx`:

```tsx
import { requireMaster } from "@/lib/auth/require-master";
import { db } from "@/db/client";
import { CreateClientForm } from "./create-client-form";

export default async function AdminPage() {
  await requireMaster();
  const allClients = await db.query.clients.findMany({ orderBy: (c, { desc }) => [desc(c.createdAt)] });
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Admin — Clients</h1>
      <CreateClientForm />
      <ul className="space-y-2">
        {allClients.map((c) => (
          <li key={c.id} className="rounded border p-3">
            <span className="font-medium">{c.name}</span> <span className="text-sm text-muted-foreground">({c.slug}) — {c.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`src/app/admin/create-client-form.tsx` (client component): form com campos name, slug, ownerName, ownerEmail usando `useActionState(createClientWithOwner, {})`; quando `state.inviteUrl` existir, exibir em `<code>` com botão "Copiar" (`navigator.clipboard.writeText`). Mesmo padrão visual do login (Card + Input + Label + Button).

- [ ] **Step 6: Verificação manual**

`pnpm dev` → `/admin/login` com admin@qia.local/admin123 → criar client "Acme" slug "acme" + owner → link `/convite/...` aparece. Banco: `psql -c "select name, slug from clients; select email, status, role from users;"` → client + owner invited.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: área /admin com login master e criação de client + convite de owner"
```

---

### Task 6: Aceite de convite + login do gestor

**Files:**
- Create: `src/app/convite/[token]/page.tsx`, `src/app/convite/[token]/actions.ts`, `src/app/app/login/page.tsx`, `src/app/app/layout.tsx`, `src/app/app/page.tsx`, `src/lib/auth/auth-client.ts`

**Interfaces:**
- Consumes: `auth` (Task 3), `users`, `requireGestor`
- Produces: owner ativo consegue logar em `/app/login` e cair em `/app`

- [ ] **Step 1: Auth client** — `src/lib/auth/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
```

- [ ] **Step 2: Action de aceite** — `src/app/convite/[token]/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth/auth";

export async function acceptInvite(_prev: { error?: string }, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Senha precisa de ao menos 8 caracteres" };

  const invited = await db.query.users.findFirst({ where: eq(users.inviteToken, token) });
  if (!invited || invited.status !== "invited" || !invited.inviteExpiresAt || invited.inviteExpiresAt < new Date()) {
    return { error: "Convite inválido ou expirado" };
  }

  const signup = await auth.api.signUpEmail({
    body: { email: invited.email, password, name: invited.name },
  });

  await db
    .update(users)
    .set({ authUserId: signup.user.id, status: "active", inviteToken: null, inviteExpiresAt: null })
    .where(eq(users.id, invited.id));

  redirect("/app/login?convite=ok");
}
```

- [ ] **Step 3: Página de convite** — `src/app/convite/[token]/page.tsx`: server component que busca o convite pelo token; se inválido/expirado renderiza "Convite inválido ou expirado"; senão renderiza client component com form (senha + confirmar senha, hidden input `token`) chamando `acceptInvite` via `useActionState`. Card centralizado, título "Bem-vindo, {name} — defina sua senha".

- [ ] **Step 4: Login do gestor** — `src/app/app/login/page.tsx` (client component):

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) setError("Credenciais inválidas");
    else router.push("/app");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Entrar</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={pending} className="w-full">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Layout do gestor** — `src/app/app/layout.tsx`: como `/app/login` é filho, o guard não pode ficar no layout. Layout renderiza só `{children}`. Guard via `requireGestor()` chamado em cada page autenticada (padrão do projeto). `src/app/app/page.tsx`:

```tsx
import { requireGestor } from "@/lib/auth/session";
import Link from "next/link";

export default async function AppHome() {
  const { user } = await requireGestor();
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Olá, {user.name}</h1>
      <nav className="flex gap-4">
        <Link className="underline" href="/app/questionarios">Questionários</Link>
        <Link className="underline" href="/app/categorias">Categorias</Link>
      </nav>
    </div>
  );
}
```

- [ ] **Step 6: Verificação manual**

Abrir link de convite da Task 5 → definir senha → login em `/app/login` → cai em `/app` com "Olá, {owner}". Testar signup direto via `POST /api/auth/sign-up/email` com email não convidado → erro.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: aceite de convite e login do gestor"
```

---

### Task 7: CRUD de categorias + seed de globais

**Files:**
- Create: `src/app/app/categorias/page.tsx`, `src/app/app/categorias/actions.ts`, `scripts/seed-categories.ts`

**Interfaces:**
- Consumes: `requireGestor`, `categories`
- Produces: `listCategories(clientId)` retorna globais (clientId null) + do client; gestor cria/edita categorias próprias

- [ ] **Step 1: Seed** — `scripts/seed-categories.ts`:

```ts
import "dotenv/config";
import { isNull, and, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { categories } from "../src/db/schema";

const GLOBALS = [
  { name: "Clima", description: "Percepção geral do ambiente de trabalho" },
  { name: "Riscos Psicossociais", description: "Fatores de risco à saúde mental no trabalho (NR-1)" },
  { name: "Satisfação", description: "Satisfação com processos, liderança e condições" },
  { name: "NPS", description: "Lealdade e recomendação" },
  { name: "Demografia", description: "Recortes demográficos (sujeitos à regra de anonimato)" },
];

async function main() {
  for (const g of GLOBALS) {
    const exists = await db.query.categories.findFirst({
      where: and(isNull(categories.clientId), eq(categories.name, g.name)),
    });
    if (!exists) await db.insert(categories).values(g);
  }
  console.log("Categorias globais ok");
  process.exit(0);
}
main();
```

Run: `pnpm seed:categories`.

- [ ] **Step 2: Actions** — `src/app/app/categorias/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";

export async function listCategories(clientId: string) {
  return db.query.categories.findMany({
    where: or(isNull(categories.clientId), eq(categories.clientId, clientId)),
    orderBy: (c, { asc }) => [asc(c.name)],
  });
}

export async function createCategory(formData: FormData) {
  const { clientId } = await requireGestor();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;
  await db.insert(categories).values({ clientId, name, description });
  revalidatePath("/app/categorias");
}

export async function updateCategory(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;
  await db
    .update(categories)
    .set({ name, description, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.clientId, clientId))); // globais não são editáveis
  revalidatePath("/app/categorias");
}
```

- [ ] **Step 3: Página** — `src/app/app/categorias/page.tsx`: server component; `requireGestor()`; lista em tabela (nome, descrição, badge "Global" quando `clientId === null`); form inline de criação (name + description) com `action={createCategory}`; edição só para categorias do client (form por linha ou dialog simples).

- [ ] **Step 4: Verificação manual** — criar categoria "Reconhecimento", ver globais com badge, editar a própria, confirmar que global não tem botão editar.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: CRUD de categorias + seed de categorias globais"
```

---

### Task 8: CRUD de questionários

**Files:**
- Create: `src/app/app/questionarios/page.tsx`, `src/app/app/questionarios/actions.ts`, `src/app/app/questionarios/novo/page.tsx`, `src/app/app/questionarios/[id]/page.tsx`

**Interfaces:**
- Consumes: `requireGestor`, `questionnaires`
- Produces: `getQuestionnaire(id, clientId)` — usado nas Tasks 9 e 10; página de detalhe `/app/questionarios/[id]` que a Task 9 estende com perguntas

- [ ] **Step 1: Actions** — `src/app/app/questionarios/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { questionnaires } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";

const USE_CASES = ["clima", "nr1", "market_research", "nps", "other"] as const;

export async function getQuestionnaire(id: string, clientId: string) {
  return db.query.questionnaires.findFirst({
    where: and(eq(questionnaires.id, id), eq(questionnaires.clientId, clientId)),
  });
}

export async function createQuestionnaire(formData: FormData) {
  const { clientId } = await requireGestor();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const useCaseRaw = String(formData.get("useCase") ?? "");
  if (!title) return;
  const [q] = await db
    .insert(questionnaires)
    .values({
      clientId,
      title,
      description,
      useCase: (USE_CASES as readonly string[]).includes(useCaseRaw) ? (useCaseRaw as (typeof USE_CASES)[number]) : null,
    })
    .returning();
  redirect(`/app/questionarios/${q.id}`);
}

export async function updateQuestionnaireStatus(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["draft", "active", "archived"].includes(status)) return;
  await db
    .update(questionnaires)
    .set({ status: status as "draft" | "active" | "archived", updatedAt: new Date() })
    .where(and(eq(questionnaires.id, id), eq(questionnaires.clientId, clientId)));
  revalidatePath(`/app/questionarios/${id}`);
  revalidatePath("/app/questionarios");
}
```

- [ ] **Step 2: Páginas**

- `/app/questionarios`: lista (título, use_case, status badge, contagem de perguntas via `db.$count`) + link "Novo questionário".
- `/app/questionarios/novo`: form title/description/useCase (Select com labels pt-BR: Clima, NR-1, Pesquisa de mercado, NPS, Outro) → `createQuestionnaire`.
- `/app/questionarios/[id]`: título, descrição, status com botões "Ativar"/"Arquivar" (`updateQuestionnaireStatus`), seção "Perguntas" (placeholder preenchido na Task 9), seção "Ciclos" (placeholder da Task 10). `notFound()` se `getQuestionnaire` retornar undefined.

- [ ] **Step 3: Verificação manual** — criar "Pesquisa de Clima", ativar, ver na lista.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: CRUD de questionários"
```

---

### Task 9: CRUD de perguntas + opções

**Files:**
- Create: `src/app/app/questionarios/[id]/perguntas/actions.ts`, `src/app/app/questionarios/[id]/question-list.tsx`, `src/app/app/questionarios/[id]/question-form.tsx`
- Modify: `src/app/app/questionarios/[id]/page.tsx`

**Interfaces:**
- Consumes: `requireGestor`, `questions`, `questionOptions`, `listCategories`
- Produces: perguntas completas com `analysisGoal`, `howToWork`, `answerType`, `config`, opções; regra "pergunta com resposta só arquiva"

- [ ] **Step 1: Actions** — `src/app/app/questionarios/[id]/perguntas/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { answers, questionOptions, questions } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";

const ANSWER_TYPES = ["scale", "single_choice", "multi_choice", "nps", "free_text", "boolean"] as const;
type AnswerType = (typeof ANSWER_TYPES)[number];

export async function createQuestion(formData: FormData) {
  const { clientId } = await requireGestor();
  const questionnaireId = String(formData.get("questionnaireId"));
  const answerTypeRaw = String(formData.get("answerType"));
  if (!(ANSWER_TYPES as readonly string[]).includes(answerTypeRaw)) return;
  const answerType = answerTypeRaw as AnswerType;

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(position), 0)` })
    .from(questions)
    .where(and(eq(questions.questionnaireId, questionnaireId), eq(questions.clientId, clientId)));

  const config =
    answerType === "scale"
      ? {
          min: Number(formData.get("scaleMin") ?? 1),
          max: Number(formData.get("scaleMax") ?? 5),
          minLabel: String(formData.get("scaleMinLabel") ?? ""),
          maxLabel: String(formData.get("scaleMaxLabel") ?? ""),
        }
      : {};

  const [q] = await db
    .insert(questions)
    .values({
      clientId,
      questionnaireId,
      categoryId: String(formData.get("categoryId")),
      position: max + 1,
      text: String(formData.get("text") ?? "").trim(),
      analysisGoal: String(formData.get("analysisGoal") ?? "").trim(),
      howToWork: String(formData.get("howToWork") ?? "").trim(),
      answerType,
      isRequired: formData.get("isRequired") === "on",
      isSensitive: formData.get("isSensitive") === "on",
      config,
    })
    .returning();

  if (answerType === "single_choice" || answerType === "multi_choice") {
    const labels = String(formData.get("options") ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (labels.length) {
      await db.insert(questionOptions).values(
        labels.map((label, i) => ({
          questionId: q.id,
          position: i + 1,
          label,
          value: label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_"),
        }))
      );
    }
  }
  revalidatePath(`/app/questionarios/${questionnaireId}`);
}

export async function archiveQuestion(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const questionnaireId = String(formData.get("questionnaireId"));
  await db
    .update(questions)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(questions.id, id), eq(questions.clientId, clientId)));
  revalidatePath(`/app/questionarios/${questionnaireId}`);
}

export async function deleteQuestion(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const questionnaireId = String(formData.get("questionnaireId"));
  const hasAnswers = await db.query.answers.findFirst({ where: eq(answers.questionId, id) });
  if (hasAnswers) return; // com resposta: só arquivar
  await db.transaction(async (tx) => {
    await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));
    await tx.delete(questions).where(and(eq(questions.id, id), eq(questions.clientId, clientId)));
  });
  revalidatePath(`/app/questionarios/${questionnaireId}`);
}

export async function moveQuestion(formData: FormData) {
  const { clientId } = await requireGestor();
  const id = String(formData.get("id"));
  const questionnaireId = String(formData.get("questionnaireId"));
  const direction = String(formData.get("direction")); // "up" | "down"
  const all = await db.query.questions.findMany({
    where: and(eq(questions.questionnaireId, questionnaireId), eq(questions.clientId, clientId), eq(questions.status, "active")),
    orderBy: (q, { asc }) => [asc(q.position)],
  });
  const idx = all.findIndex((q) => q.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= all.length) return;
  await db.transaction(async (tx) => {
    await tx.update(questions).set({ position: all[swapWith].position }).where(eq(questions.id, all[idx].id));
    await tx.update(questions).set({ position: all[idx].position }).where(eq(questions.id, all[swapWith].id));
  });
  revalidatePath(`/app/questionarios/${questionnaireId}`);
}
```

- [ ] **Step 2: UI** — `question-form.tsx` (client component): campos text (Textarea), categoria (Select vindo de `listCategories`), answerType (Select pt-BR: Escala, Escolha única, Múltipla escolha, NPS 0-10, Texto livre, Sim/Não), analysisGoal (Textarea, label "Objetivo de análise"), howToWork (Textarea, label "Como trabalhar"), isRequired/isSensitive (checkbox), campos de escala (min/max/labels) visíveis só quando answerType=scale, textarea "Opções (uma por linha)" só quando choice. `question-list.tsx`: lista ordenada por position com categoria, tipo, badges (Obrigatória/Sensível), botões ↑ ↓ (moveQuestion), Arquivar, Excluir (deleteQuestion — desabilitado com tooltip "tem respostas" quando aplicável). Integrar ambos na seção "Perguntas" de `[id]/page.tsx`.

- [ ] **Step 3: Verificação manual** — no questionário "Pesquisa de Clima" criar: 1 scale ("Como você avalia o ambiente?", categoria Clima), 1 nps, 1 single_choice com 3 opções, 1 free_text ("O que podemos melhorar?"), 1 free_text sensível (categoria Demografia). Reordenar, arquivar, excluir uma sem resposta.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: CRUD de perguntas com opções, reordenação e arquivamento"
```

---

### Task 10: Ciclos públicos — criação e detalhe

**Files:**
- Create: `src/app/app/ciclos/actions.ts`, `src/app/app/ciclos/[id]/page.tsx`, `src/app/app/ciclos/[id]/share-link.tsx`
- Modify: `src/app/app/questionarios/[id]/page.tsx` (seção Ciclos)

**Interfaces:**
- Consumes: `requireGestor`, `cycles`, `questions`
- Produces: `openPublicCycle` — grava `questionCount` snapshot + `publicToken` (nanoid 16); página `/app/ciclos/[id]` com link público, QR, contagem de respostas; botão "Fechar e analisar" plugado na Task 14

- [ ] **Step 1: Action** — `src/app/app/ciclos/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { and, eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { cycles, questions } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";

export async function openPublicCycle(formData: FormData) {
  const { clientId } = await requireGestor();
  const questionnaireId = String(formData.get("questionnaireId"));
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const maxResponsesRaw = String(formData.get("maxResponses") ?? "");

  const [{ value: questionCount }] = await db
    .select({ value: count() })
    .from(questions)
    .where(and(eq(questions.questionnaireId, questionnaireId), eq(questions.clientId, clientId), eq(questions.status, "active")));
  if (questionCount === 0) throw new Error("Questionário sem perguntas ativas");

  const [cycle] = await db
    .insert(cycles)
    .values({
      clientId,
      questionnaireId,
      isPublic: true,
      publicToken: nanoid(16),
      questionCount,
      endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
      maxResponses: maxResponsesRaw ? Number(maxResponsesRaw) : null,
      status: "open",
    })
    .returning();

  redirect(`/app/ciclos/${cycle.id}`);
}
```

- [ ] **Step 2: Detalhe do ciclo** — `/app/ciclos/[id]/page.tsx`: `requireGestor()`; busca ciclo com `and(eq(cycles.id, id), eq(cycles.clientId, clientId))` (`notFound()` se ausente); mostra questionário, status (Badge), question_count, contagem de respostas submitted (`select count(*) from responses where cycle_id = ...`), `analysisError` em alerta vermelho quando presente. `share-link.tsx` (client): url `${NEXT_PUBLIC_APP_URL}/r/${publicToken}`, botão copiar, `<QRCodeSVG value={url} size={160} />` de `qrcode.react`. Seção Ciclos em `/app/questionarios/[id]`: form (endsAt datetime-local opcional, maxResponses number opcional) com `openPublicCycle` + lista de ciclos existentes com link pro detalhe. Botão "Abrir ciclo" desabilitado se questionário não estiver `active`.

- [ ] **Step 3: Verificação manual** — abrir ciclo no questionário ativo → detalhe mostra link/QR, snapshot question_count correto (perguntas ativas), 0 respostas.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: abertura de ciclo público com snapshot e link/QR"
```

---

### Task 11: Página pública de resposta

**Files:**
- Create: `src/lib/public/submit-response.ts`, `src/app/r/[token]/page.tsx`, `src/app/r/[token]/actions.ts`, `src/app/r/[token]/response-form.tsx`
- Test: `tests/integration/submit-response.test.ts`

**Interfaces:**
- Consumes: `cycles`, `questions`, `questionOptions`, `responses`, `answers`
- Produces: `submitResponse(input: SubmitInput): Promise<{ ok: true } | { ok: false; reason: "closed" | "duplicate" | "invalid" }>`

```ts
export type SubmitInput = {
  publicToken: string;
  fingerprint: string;
  answers: Array<{ questionId: string; valueNumeric?: number; valueText?: string; valueOptions?: string[] }>;
};
```

- [ ] **Step 1: Teste de integração (falha)** — `tests/integration/submit-response.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db/client";
import { clients, questionnaires, questions, categories, cycles, responses } from "@/db/schema";
import { submitResponse } from "@/lib/public/submit-response";
import { nanoid } from "nanoid";

let token: string;
let questionId: string;

beforeAll(async () => {
  const [client] = await db.insert(clients).values({ name: "T", slug: `t-${nanoid(6)}` }).returning();
  const [cat] = await db.insert(categories).values({ clientId: client.id, name: "Clima" }).returning();
  const [qn] = await db.insert(questionnaires).values({ clientId: client.id, title: "Q", status: "active" }).returning();
  const [q] = await db.insert(questions).values({
    clientId: client.id, questionnaireId: qn.id, categoryId: cat.id, position: 1,
    text: "Nota?", analysisGoal: "g", howToWork: "h", answerType: "scale", config: { min: 1, max: 5 },
  }).returning();
  questionId = q.id;
  token = nanoid(16);
  await db.insert(cycles).values({
    clientId: client.id, questionnaireId: qn.id, isPublic: true, publicToken: token, questionCount: 1, status: "open",
  });
});

describe("submitResponse", () => {
  it("grava response + answers", async () => {
    const result = await submitResponse({
      publicToken: token,
      fingerprint: "fp-1",
      answers: [{ questionId, valueNumeric: 4 }],
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejeita fingerprint duplicado", async () => {
    const result = await submitResponse({
      publicToken: token,
      fingerprint: "fp-1",
      answers: [{ questionId, valueNumeric: 5 }],
    });
    expect(result).toEqual({ ok: false, reason: "duplicate" });
  });

  it("rejeita token inexistente", async () => {
    const result = await submitResponse({ publicToken: "nope", fingerprint: "fp-2", answers: [] });
    expect(result).toEqual({ ok: false, reason: "closed" });
  });

  it("fecha ciclo ao atingir maxResponses", async () => {
    // ciclo com maxResponses = 1
    const t2 = nanoid(16);
    const cycle = await db.query.cycles.findFirst({ where: (c, { eq }) => eq(c.publicToken, token) });
    await db.insert(cycles).values({
      clientId: cycle!.clientId, questionnaireId: cycle!.questionnaireId,
      isPublic: true, publicToken: t2, questionCount: 1, maxResponses: 1, status: "open",
    });
    expect(await submitResponse({ publicToken: t2, fingerprint: "a", answers: [{ questionId, valueNumeric: 3 }] })).toEqual({ ok: true });
    expect(await submitResponse({ publicToken: t2, fingerprint: "b", answers: [{ questionId, valueNumeric: 3 }] })).toEqual({ ok: false, reason: "closed" });
  });
});
```

- [ ] **Step 2: Rodar** — `pnpm vitest run tests/integration/submit-response.test.ts` → FAIL

- [ ] **Step 3: Implementar** — `src/lib/public/submit-response.ts`:

```ts
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { answers, cycles, responses } from "@/db/schema";

export type SubmitInput = {
  publicToken: string;
  fingerprint: string;
  answers: Array<{ questionId: string; valueNumeric?: number; valueText?: string; valueOptions?: string[] }>;
};

export type SubmitResult = { ok: true } | { ok: false; reason: "closed" | "duplicate" | "invalid" };

export async function getOpenCycleByToken(publicToken: string) {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.publicToken, publicToken) });
  if (!cycle || cycle.status !== "open") return null;

  const expired = cycle.endsAt && cycle.endsAt < new Date();
  const [{ value: responseCount }] = await db
    .select({ value: count() })
    .from(responses)
    .where(and(eq(responses.cycleId, cycle.id), eq(responses.status, "submitted")));
  const full = cycle.maxResponses != null && responseCount >= cycle.maxResponses;

  if (expired || full) {
    await db.update(cycles).set({ status: "closed", updatedAt: new Date() }).where(eq(cycles.id, cycle.id));
    return null;
  }
  return cycle;
}

export async function submitResponse(input: SubmitInput): Promise<SubmitResult> {
  const cycle = await getOpenCycleByToken(input.publicToken);
  if (!cycle) return { ok: false, reason: "closed" };
  if (!input.fingerprint) return { ok: false, reason: "invalid" };

  try {
    await db.transaction(async (tx) => {
      const [response] = await tx
        .insert(responses)
        .values({
          clientId: cycle.clientId,
          cycleId: cycle.id,
          anonKey: crypto.randomUUID(),
          sessionFingerprint: input.fingerprint,
          submittedAt: new Date(),
          status: "submitted",
        })
        .returning();
      if (input.answers.length) {
        await tx.insert(answers).values(
          input.answers.map((a) => ({
            responseId: response.id,
            questionId: a.questionId,
            valueNumeric: a.valueNumeric != null ? String(a.valueNumeric) : null,
            valueText: a.valueText ?? null,
            valueOptions: a.valueOptions ?? null,
          }))
        );
      }
    });
  } catch (e: unknown) {
    const pgCode = (e as { cause?: { code?: string }; code?: string });
    if (pgCode.code === "23505" || pgCode.cause?.code === "23505") return { ok: false, reason: "duplicate" };
    throw e;
  }
  return { ok: true };
}
```

- [ ] **Step 4: Rodar** — PASS (rodar duas vezes; segunda rodada cria novo client/slug, sem colisão)

- [ ] **Step 5: Página pública** — `src/app/r/[token]/page.tsx` (server):

- Cookie `qia_fp`: se ausente, gerar `crypto.randomUUID()` e setar via `cookies()` em action de entrada — mais simples: setar no client component com `document.cookie` no mount.
- `getOpenCycleByToken(token)` → se null, renderizar "Esta pesquisa está encerrada."
- Se cookie já respondeu (existe response com fingerprint no ciclo), mostrar "Você já respondeu. Obrigado!"
- Buscar perguntas ativas ordenadas por position + opções; passar pro `response-form.tsx`.

`response-form.tsx` (client): renderiza cada pergunta pelo tipo — scale: radios min..max com labels; nps: botões 0-10; single_choice: radios; multi_choice: checkboxes; boolean: Sim/Não; free_text: Textarea. Required nativo do browser pra `isRequired`. Submit → action `submitPublicResponse` em `actions.ts`:

```ts
"use server";
import { cookies } from "next/headers";
import { submitResponse, type SubmitInput } from "@/lib/public/submit-response";

export async function submitPublicResponse(publicToken: string, answersInput: SubmitInput["answers"]) {
  const jar = await cookies();
  let fp = jar.get("qia_fp")?.value;
  if (!fp) {
    fp = crypto.randomUUID();
    jar.set("qia_fp", fp, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return submitResponse({ publicToken, fingerprint: fp, answers: answersInput });
}
```

Resultado: `ok` → tela "Obrigado pela sua resposta!"; `duplicate` → "Você já respondeu"; `closed` → "Pesquisa encerrada". Layout mobile-first (max-w-lg, uma pergunta abaixo da outra).

- [ ] **Step 6: Verificação manual** — abrir link do ciclo em aba anônima, responder, ver "Obrigado". Recarregar e tentar de novo → "Você já respondeu". Contagem no detalhe do ciclo sobe.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: página pública de resposta com dedup e auto-fechamento"
```

---

### Task 12: Lib de análise — mascaramento e agregação (TDD)

**Files:**
- Create: `src/lib/analysis/mask.ts`, `src/lib/analysis/aggregate.ts`
- Test: `tests/unit/mask.test.ts`, `tests/unit/aggregate.test.ts`

**Interfaces:**
- Produces:

```ts
// mask.ts
export function maskNames(text: string): string;

// aggregate.ts
export type AnswerTypeName = "scale" | "single_choice" | "multi_choice" | "nps" | "free_text" | "boolean";
export type QuestionInput = {
  id: string; text: string; answerType: AnswerTypeName; analysisGoal: string; howToWork: string;
  isSensitive: boolean; categoryId: string; categoryName: string;
  options: Array<{ id: string; label: string }>;
  config: { min?: number; max?: number };
};
export type AnswerInput = { questionId: string; anonKey: string; valueNumeric: number | null; maskedText: string | null; valueOptions: string[] | null };
export type QuestionAggregate = {
  questionId: string; text: string; answerType: AnswerTypeName; analysisGoal: string; howToWork: string;
  isSensitive: boolean; responseCount: number;
  metrics:
    | { kind: "numeric"; mean: number; distribution: Record<string, number> }
    | { kind: "nps"; score: number; promoters: number; passives: number; detractors: number }
    | { kind: "options"; counts: Record<string, number> }
    | { kind: "boolean"; yes: number; no: number }
    | { kind: "text"; texts: string[] };
};
export type CategoryAggregate = { categoryId: string; categoryName: string; questions: QuestionAggregate[] };
export function aggregateByCategory(questions: QuestionInput[], answers: AnswerInput[]): CategoryAggregate[];
```

- [ ] **Step 1: Testes de mask (falham)** — `tests/unit/mask.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { maskNames } from "@/lib/analysis/mask";

describe("maskNames", () => {
  it("mascara nome composto", () => {
    expect(maskNames("Falei com Maria Silva ontem")).toBe("Falei com [NOME] ontem");
  });
  it("mascara nome com conectivo", () => {
    expect(maskNames("O time da Ana Paula de Souza é ótimo")).toBe("O time da [NOME] é ótimo");
  });
  it("mascara múltiplos nomes", () => {
    expect(maskNames("João Pedro e Carla Dias brigaram")).toBe("[NOME] brigaram");
  });
  it("não mascara palavra única capitalizada em início de frase", () => {
    expect(maskNames("Gosto do ambiente")).toBe("Gosto do ambiente");
  });
  it("preserva texto sem nomes", () => {
    expect(maskNames("salário baixo e muita pressão")).toBe("salário baixo e muita pressão");
  });
});
```

Nota: "João Pedro e Carla Dias" vira um único `[NOME]` porque o conectivo "e" une as sequências — comportamento aceito (conservador a favor da privacidade).

- [ ] **Step 2: Rodar** → FAIL

- [ ] **Step 3: Implementar** — `src/lib/analysis/mask.ts`:

```ts
const CAP = "[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúçü]+";
const CONN = "(?:da|de|do|das|dos|e)";
const NAME_RE = new RegExp(`\\b${CAP}(?:\\s+(?:${CONN}\\s+)?${CAP})+\\b`, "g");

/** Heurística pt-BR: sequências de 2+ palavras capitalizadas (com conectivos) viram [NOME]. */
export function maskNames(text: string): string {
  return text.replace(NAME_RE, "[NOME]");
}
```

- [ ] **Step 4: Rodar** → PASS

- [ ] **Step 5: Testes de aggregate (falham)** — `tests/unit/aggregate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { aggregateByCategory, type QuestionInput, type AnswerInput } from "@/lib/analysis/aggregate";

const q = (over: Partial<QuestionInput>): QuestionInput => ({
  id: "q1", text: "Pergunta", answerType: "scale", analysisGoal: "g", howToWork: "h",
  isSensitive: false, categoryId: "c1", categoryName: "Clima", options: [], config: { min: 1, max: 5 },
  ...over,
});

describe("aggregateByCategory", () => {
  it("agrega scale com média e distribuição", () => {
    const answers: AnswerInput[] = [
      { questionId: "q1", anonKey: "a", valueNumeric: 4, maskedText: null, valueOptions: null },
      { questionId: "q1", anonKey: "b", valueNumeric: 2, maskedText: null, valueOptions: null },
    ];
    const [cat] = aggregateByCategory([q({})], answers);
    expect(cat.categoryName).toBe("Clima");
    expect(cat.questions[0].responseCount).toBe(2);
    expect(cat.questions[0].metrics).toEqual({ kind: "numeric", mean: 3, distribution: { "2": 1, "4": 1 } });
  });

  it("agrega nps com promotores/detratores", () => {
    const answers: AnswerInput[] = [9, 10, 7, 3].map((v, i) => ({
      questionId: "q1", anonKey: String(i), valueNumeric: v, maskedText: null, valueOptions: null,
    }));
    const [cat] = aggregateByCategory([q({ answerType: "nps" })], answers);
    // promoters 2, passives 1, detractors 1 → score = (2-1)/4*100 = 25
    expect(cat.questions[0].metrics).toEqual({ kind: "nps", score: 25, promoters: 2, passives: 1, detractors: 1 });
  });

  it("agrega choices por label", () => {
    const question = q({ answerType: "single_choice", options: [{ id: "o1", label: "Sim" }, { id: "o2", label: "Não" }] });
    const answers: AnswerInput[] = [
      { questionId: "q1", anonKey: "a", valueNumeric: null, maskedText: null, valueOptions: ["o1"] },
      { questionId: "q1", anonKey: "b", valueNumeric: null, maskedText: null, valueOptions: ["o1"] },
      { questionId: "q1", anonKey: "c", valueNumeric: null, maskedText: null, valueOptions: ["o2"] },
    ];
    const [cat] = aggregateByCategory([question], answers);
    expect(cat.questions[0].metrics).toEqual({ kind: "options", counts: { Sim: 2, "Não": 1 } });
  });

  it("agrega free_text como lista de textos mascarados", () => {
    const answers: AnswerInput[] = [
      { questionId: "q1", anonKey: "a", valueNumeric: null, maskedText: "muita pressão", valueOptions: null },
    ];
    const [cat] = aggregateByCategory([q({ answerType: "free_text" })], answers);
    expect(cat.questions[0].metrics).toEqual({ kind: "text", texts: ["muita pressão"] });
  });

  it("agrega boolean", () => {
    const answers: AnswerInput[] = [
      { questionId: "q1", anonKey: "a", valueNumeric: 1, maskedText: null, valueOptions: null },
      { questionId: "q1", anonKey: "b", valueNumeric: 0, maskedText: null, valueOptions: null },
    ];
    const [cat] = aggregateByCategory([q({ answerType: "boolean" })], answers);
    expect(cat.questions[0].metrics).toEqual({ kind: "boolean", yes: 1, no: 1 });
  });

  it("agrupa perguntas de categorias diferentes separadamente", () => {
    const qs = [q({}), q({ id: "q2", categoryId: "c2", categoryName: "NPS", answerType: "nps" })];
    const result = aggregateByCategory(qs, []);
    expect(result.map((c) => c.categoryName)).toEqual(["Clima", "NPS"]);
  });
});
```

- [ ] **Step 6: Rodar** → FAIL

- [ ] **Step 7: Implementar** — `src/lib/analysis/aggregate.ts`:

```ts
export type AnswerTypeName = "scale" | "single_choice" | "multi_choice" | "nps" | "free_text" | "boolean";

export type QuestionInput = {
  id: string; text: string; answerType: AnswerTypeName; analysisGoal: string; howToWork: string;
  isSensitive: boolean; categoryId: string; categoryName: string;
  options: Array<{ id: string; label: string }>;
  config: { min?: number; max?: number };
};

export type AnswerInput = {
  questionId: string; anonKey: string;
  valueNumeric: number | null; maskedText: string | null; valueOptions: string[] | null;
};

export type QuestionAggregate = {
  questionId: string; text: string; answerType: AnswerTypeName; analysisGoal: string; howToWork: string;
  isSensitive: boolean; responseCount: number;
  metrics:
    | { kind: "numeric"; mean: number; distribution: Record<string, number> }
    | { kind: "nps"; score: number; promoters: number; passives: number; detractors: number }
    | { kind: "options"; counts: Record<string, number> }
    | { kind: "boolean"; yes: number; no: number }
    | { kind: "text"; texts: string[] };
};

export type CategoryAggregate = { categoryId: string; categoryName: string; questions: QuestionAggregate[] };

function aggregateQuestion(question: QuestionInput, qAnswers: AnswerInput[]): QuestionAggregate {
  const base = {
    questionId: question.id, text: question.text, answerType: question.answerType,
    analysisGoal: question.analysisGoal, howToWork: question.howToWork,
    isSensitive: question.isSensitive, responseCount: qAnswers.length,
  };
  switch (question.answerType) {
    case "scale": {
      const values = qAnswers.map((a) => a.valueNumeric).filter((v): v is number => v != null);
      const mean = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      const distribution: Record<string, number> = {};
      for (const v of values) distribution[String(v)] = (distribution[String(v)] ?? 0) + 1;
      return { ...base, metrics: { kind: "numeric", mean: Number(mean.toFixed(2)), distribution } };
    }
    case "nps": {
      const values = qAnswers.map((a) => a.valueNumeric).filter((v): v is number => v != null);
      const promoters = values.filter((v) => v >= 9).length;
      const passives = values.filter((v) => v >= 7 && v <= 8).length;
      const detractors = values.filter((v) => v <= 6).length;
      const score = values.length ? Math.round(((promoters - detractors) / values.length) * 100) : 0;
      return { ...base, metrics: { kind: "nps", score, promoters, passives, detractors } };
    }
    case "single_choice":
    case "multi_choice": {
      const labelById = new Map(question.options.map((o) => [o.id, o.label]));
      const counts: Record<string, number> = {};
      for (const a of qAnswers) {
        for (const optId of a.valueOptions ?? []) {
          const label = labelById.get(optId) ?? optId;
          counts[label] = (counts[label] ?? 0) + 1;
        }
      }
      return { ...base, metrics: { kind: "options", counts } };
    }
    case "boolean": {
      const yes = qAnswers.filter((a) => a.valueNumeric === 1).length;
      const no = qAnswers.filter((a) => a.valueNumeric === 0).length;
      return { ...base, metrics: { kind: "boolean", yes, no } };
    }
    case "free_text": {
      const texts = qAnswers.map((a) => a.maskedText).filter((t): t is string => !!t);
      return { ...base, metrics: { kind: "text", texts } };
    }
  }
}

export function aggregateByCategory(questions: QuestionInput[], answers: AnswerInput[]): CategoryAggregate[] {
  const byQuestion = new Map<string, AnswerInput[]>();
  for (const a of answers) {
    const list = byQuestion.get(a.questionId) ?? [];
    list.push(a);
    byQuestion.set(a.questionId, list);
  }
  const byCategory = new Map<string, CategoryAggregate>();
  for (const question of questions) {
    const cat = byCategory.get(question.categoryId) ?? {
      categoryId: question.categoryId, categoryName: question.categoryName, questions: [],
    };
    cat.questions.push(aggregateQuestion(question, byQuestion.get(question.id) ?? []));
    byCategory.set(question.categoryId, cat);
  }
  return [...byCategory.values()];
}
```

- [ ] **Step 8: Rodar** → PASS. Commit:

```bash
git add -A && git commit -m "feat: agregação por categoria e mascaramento de nomes (TDD)"
```

---

### Task 13: Prompts + cliente Claude (TDD nos prompts)

**Files:**
- Create: `src/lib/analysis/prompts.ts`, `src/lib/analysis/claude.ts`
- Test: `tests/unit/prompts.test.ts`

**Interfaces:**
- Consumes: `CategoryAggregate` (Task 12)
- Produces:

```ts
// prompts.ts
export type CategoryAnalysis = { summary: string; score: number; recommendations: Array<{ title: string; description: string }> };
export type CycleAnalysis = { summary: string; recommendations: Array<{ title: string; description: string }> };
export function buildCategoryPrompt(category: CategoryAggregate): string;
export function buildCyclePrompt(categoryResults: Array<{ categoryName: string; summary: string; score: number }>): string;

// claude.ts
export type CompleteJSON = (prompt: string) => Promise<unknown>;
export const completeJSON: CompleteJSON; // Anthropic SDK, model claude-sonnet-5, extrai JSON da resposta
```

- [ ] **Step 1: Testes (falham)** — `tests/unit/prompts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildCategoryPrompt, buildCyclePrompt } from "@/lib/analysis/prompts";
import type { CategoryAggregate } from "@/lib/analysis/aggregate";

const category: CategoryAggregate = {
  categoryId: "c1",
  categoryName: "Clima",
  questions: [{
    questionId: "q1", text: "Como avalia o ambiente?", answerType: "scale",
    analysisGoal: "Medir percepção do ambiente", howToWork: "Se baixo, rodar 1:1s",
    isSensitive: false, responseCount: 2,
    metrics: { kind: "numeric", mean: 3, distribution: { "2": 1, "4": 1 } },
  }],
};

describe("buildCategoryPrompt", () => {
  const prompt = buildCategoryPrompt(category);
  it("inclui categoria, pergunta, objetivo e como trabalhar", () => {
    expect(prompt).toContain("Clima");
    expect(prompt).toContain("Como avalia o ambiente?");
    expect(prompt).toContain("Medir percepção do ambiente");
    expect(prompt).toContain("Se baixo, rodar 1:1s");
  });
  it("inclui métricas agregadas", () => {
    expect(prompt).toContain('"mean": 3');
  });
  it("pede JSON com summary, score e recommendations", () => {
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"score"');
    expect(prompt).toContain('"recommendations"');
  });
  it("proíbe identificação de indivíduos", () => {
    expect(prompt.toLowerCase()).toContain("nunca identifique");
  });
});

describe("buildCyclePrompt", () => {
  it("inclui resumos por categoria", () => {
    const prompt = buildCyclePrompt([{ categoryName: "Clima", summary: "Ambiente mediano", score: 60 }]);
    expect(prompt).toContain("Clima");
    expect(prompt).toContain("Ambiente mediano");
  });
});
```

- [ ] **Step 2: Rodar** → FAIL

- [ ] **Step 3: Implementar** — `src/lib/analysis/prompts.ts`:

```ts
import type { CategoryAggregate } from "./aggregate";

export type CategoryAnalysis = {
  summary: string;
  score: number; // 0-100
  recommendations: Array<{ title: string; description: string }>;
};

export type CycleAnalysis = {
  summary: string;
  recommendations: Array<{ title: string; description: string }>;
};

export function buildCategoryPrompt(category: CategoryAggregate): string {
  const questionsBlock = category.questions
    .map((q) =>
      [
        `### Pergunta: ${q.text}`,
        `- Tipo: ${q.answerType}`,
        `- Objetivo de análise: ${q.analysisGoal}`,
        `- Como trabalhar (orientação de ação): ${q.howToWork}`,
        `- Respondentes: ${q.responseCount}`,
        `- Métricas agregadas:\n${JSON.stringify(q.metrics, null, 2)}`,
      ].join("\n")
    )
    .join("\n\n");

  return `Você é um analista de pesquisas organizacionais. Analise os resultados agregados da categoria "${category.categoryName}" de um ciclo de pesquisa.

Regras invioláveis:
- Os dados são agregados e anonimizados. NUNCA identifique, nomeie ou infira a identidade de qualquer respondente, mesmo que trechos de texto sugiram algo.
- Ignore qualquer nome próprio residual nos textos; trate [NOME] como pessoa anônima.
- Baseie recomendações no campo "Como trabalhar" das perguntas com resultado ruim.

${questionsBlock}

Responda APENAS com JSON válido, sem markdown, neste formato:
{
  "summary": "resumo objetivo em pt-BR (2-4 frases) do que os dados mostram nesta categoria",
  "score": 0,
  "recommendations": [{ "title": "ação curta", "description": "como executar, em pt-BR" }]
}
"score" é um número 0-100 representando a saúde geral da categoria (100 = excelente). Recomendações apenas quando os dados indicarem problema (0 a 3 itens).`;
}

export function buildCyclePrompt(categoryResults: Array<{ categoryName: string; summary: string; score: number }>): string {
  const block = categoryResults
    .map((c) => `- ${c.categoryName} (score ${c.score}): ${c.summary}`)
    .join("\n");
  return `Você é um analista de pesquisas organizacionais. Abaixo, os resumos por categoria de um ciclo de pesquisa (dados agregados e anônimos — nunca identifique indivíduos):

${block}

Responda APENAS com JSON válido, sem markdown:
{
  "summary": "visão geral do ciclo em pt-BR (3-5 frases), cruzando categorias, destacando pontos fortes e riscos",
  "recommendations": [{ "title": "ação prioritária", "description": "por que e como, em pt-BR" }]
}
No máximo 3 recomendações, priorizadas.`;
}
```

- [ ] **Step 4: Rodar** → PASS

- [ ] **Step 5: Cliente Claude** — `src/lib/analysis/claude.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";

export type CompleteJSON = (prompt: string) => Promise<unknown>;

const client = new Anthropic();

export const completeJSON: CompleteJSON = async (prompt) => {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(jsonText);
};
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: prompts de análise por categoria/ciclo e cliente Claude"
```

---

### Task 14: Pipeline de fechamento e análise (integração, Claude mockado)

**Files:**
- Create: `src/lib/analysis/pipeline.ts`
- Test: `tests/integration/pipeline.test.ts`
- Modify: `src/app/app/ciclos/actions.ts` (action `closeAndAnalyze`), `src/app/app/ciclos/[id]/page.tsx` (botão)

**Interfaces:**
- Consumes: `aggregateByCategory`, `maskNames`, `buildCategoryPrompt`, `buildCyclePrompt`, `completeJSON`, schema
- Produces: `runAnalysis(cycleId: string, complete?: CompleteJSON): Promise<void>` — idempotente; grava analysis_results + usage_record; status closed→processing→analyzed; em erro volta pra closed com `analysisError`

- [ ] **Step 1: Teste de integração (falha)** — `tests/integration/pipeline.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { analysisResults, answers, categories, clients, cycles, questionnaires, questions, responses, usageRecords } from "@/db/schema";
import { runAnalysis } from "@/lib/analysis/pipeline";

let cycleId: string;

const fakeComplete = async (prompt: string) => {
  if (prompt.includes("resumos por categoria")) {
    return { summary: "Ciclo ok no geral", recommendations: [{ title: "Agir", description: "..." }] };
  }
  return { summary: "Categoria com atenção", score: 55, recommendations: [{ title: "Rodar 1:1s", description: "..." }] };
};

beforeAll(async () => {
  const [client] = await db.insert(clients).values({ name: "P", slug: `p-${nanoid(6)}` }).returning();
  const [cat] = await db.insert(categories).values({ clientId: client.id, name: "Clima" }).returning();
  const [catSens] = await db.insert(categories).values({ clientId: client.id, name: "Demografia" }).returning();
  const [qn] = await db.insert(questionnaires).values({ clientId: client.id, title: "Q", status: "active" }).returning();
  const [q1] = await db.insert(questions).values({
    clientId: client.id, questionnaireId: qn.id, categoryId: cat.id, position: 1,
    text: "Ambiente?", analysisGoal: "g", howToWork: "h", answerType: "scale", config: { min: 1, max: 5 },
  }).returning();
  const [q2] = await db.insert(questions).values({
    clientId: client.id, questionnaireId: qn.id, categoryId: cat.id, position: 2,
    text: "Comentários?", analysisGoal: "g", howToWork: "h", answerType: "free_text",
  }).returning();
  const [q3] = await db.insert(questions).values({
    clientId: client.id, questionnaireId: qn.id, categoryId: catSens.id, position: 3,
    text: "Etnia?", analysisGoal: "g", howToWork: "h", answerType: "free_text", isSensitive: true,
  }).returning();
  const [cycle] = await db.insert(cycles).values({
    clientId: client.id, questionnaireId: qn.id, isPublic: true, publicToken: nanoid(16),
    questionCount: 3, status: "closed",
  }).returning();
  cycleId = cycle.id;
  // 2 respostas (< minAnonymityN=5 → pergunta sensível fica fora)
  for (const [i, score] of [4, 2].entries()) {
    const [r] = await db.insert(responses).values({
      clientId: client.id, cycleId, anonKey: `anon-${i}`, sessionFingerprint: `fp-${i}`,
      submittedAt: new Date(), status: "submitted",
    }).returning();
    await db.insert(answers).values([
      { responseId: r.id, questionId: q1.id, valueNumeric: String(score) },
      { responseId: r.id, questionId: q2.id, valueText: "Muita pressão da Maria Silva" },
      { responseId: r.id, questionId: q3.id, valueText: "parda" },
    ]);
  }
});

describe("runAnalysis", () => {
  it("gera analysis_results por categoria + resumo do ciclo e usage_record", async () => {
    await runAnalysis(cycleId, fakeComplete);

    const cycle = await db.query.cycles.findFirst({ where: eq(cycles.id, cycleId) });
    expect(cycle!.status).toBe("analyzed");

    const results = await db.query.analysisResults.findMany({ where: eq(analysisResults.cycleId, cycleId) });
    const kinds = results.map((r) => r.kind).sort();
    // 1 category_summary (Clima) + 1 cycle_summary; Demografia excluída pelo N mínimo
    expect(kinds).toEqual(["category_summary", "cycle_summary"]);

    const [usage] = await db.query.usageRecords.findMany({ where: eq(usageRecords.cycleId, cycleId) });
    expect(usage.questionCount).toBe(3);
    expect(usage.responseCount).toBe(2);
    expect(Number(usage.billableUnits)).toBe(6); // 3 perguntas x 2 respostas

    // mascaramento persistido
    const persisted = await db.query.answers.findMany();
    const withMask = persisted.find((a) => a.valueText === "Muita pressão da Maria Silva");
    expect(withMask!.maskedText).toBe("Muita pressão da [NOME]");
  });

  it("é idempotente (reprocessar substitui resultados)", async () => {
    await db.update(cycles).set({ status: "closed" }).where(eq(cycles.id, cycleId));
    await runAnalysis(cycleId, fakeComplete);
    const results = await db.query.analysisResults.findMany({ where: eq(analysisResults.cycleId, cycleId) });
    expect(results).toHaveLength(2);
  });

  it("em erro, volta status pra closed e grava analysisError", async () => {
    await db.update(cycles).set({ status: "closed" }).where(eq(cycles.id, cycleId));
    const boom = async () => { throw new Error("api caiu"); };
    await expect(runAnalysis(cycleId, boom)).rejects.toThrow();
    const cycle = await db.query.cycles.findFirst({ where: eq(cycles.id, cycleId) });
    expect(cycle!.status).toBe("closed");
    expect(cycle!.analysisError).toContain("api caiu");
  });
});
```

- [ ] **Step 2: Rodar** → FAIL

- [ ] **Step 3: Implementar** — `src/lib/analysis/pipeline.ts`:

```ts
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  analysisResults, answers, categories, cycles, questionOptions, questions, responses, usageRecords,
} from "@/db/schema";
import { aggregateByCategory, type AnswerInput, type QuestionInput } from "./aggregate";
import { maskNames } from "./mask";
import { buildCategoryPrompt, buildCyclePrompt, type CategoryAnalysis, type CycleAnalysis } from "./prompts";
import { completeJSON, type CompleteJSON } from "./claude";

export async function runAnalysis(cycleId: string, complete: CompleteJSON = completeJSON): Promise<void> {
  const cycle = await db.query.cycles.findFirst({ where: eq(cycles.id, cycleId) });
  if (!cycle) throw new Error("Ciclo não encontrado");
  if (cycle.status !== "closed" && cycle.status !== "open") throw new Error(`Ciclo em status ${cycle.status}`);

  await db.update(cycles).set({ status: "processing", analysisError: null, updatedAt: new Date() }).where(eq(cycles.id, cycleId));

  try {
    const client = await db.query.clients.findFirst({ where: (c, { eq: eqf }) => eqf(c.id, cycle.clientId) });
    const minN = client?.settings.minAnonymityN ?? 5;

    const qRows = await db
      .select({
        q: questions,
        categoryName: categories.name,
      })
      .from(questions)
      .innerJoin(categories, eq(questions.categoryId, categories.id))
      .where(and(eq(questions.questionnaireId, cycle.questionnaireId), eq(questions.status, "active")));

    const optionRows = qRows.length
      ? await db.query.questionOptions.findMany({ where: inArray(questionOptions.questionId, qRows.map((r) => r.q.id)) })
      : [];

    const respRows = await db.query.responses.findMany({
      where: and(eq(responses.cycleId, cycleId), eq(responses.status, "submitted")),
    });
    const responseCount = respRows.length;
    const anonByResponseId = new Map(respRows.map((r) => [r.id, r.anonKey]));

    const answerRows = respRows.length
      ? await db.query.answers.findMany({ where: inArray(answers.responseId, respRows.map((r) => r.id)) })
      : [];

    // mascarar free_text que ainda não tem maskedText e persistir
    const freeTextQuestionIds = new Set(qRows.filter((r) => r.q.answerType === "free_text").map((r) => r.q.id));
    for (const a of answerRows) {
      if (freeTextQuestionIds.has(a.questionId) && a.valueText && !a.maskedText) {
        a.maskedText = maskNames(a.valueText);
        await db.update(answers).set({ maskedText: a.maskedText, updatedAt: new Date() }).where(eq(answers.id, a.id));
      }
    }

    // regra do N mínimo: pergunta sensível fora se responseCount < minN
    const includedQuestions: QuestionInput[] = qRows
      .filter((r) => !r.q.isSensitive || responseCount >= minN)
      .map((r) => ({
        id: r.q.id, text: r.q.text, answerType: r.q.answerType,
        analysisGoal: r.q.analysisGoal, howToWork: r.q.howToWork,
        isSensitive: r.q.isSensitive, categoryId: r.q.categoryId, categoryName: r.categoryName,
        options: optionRows.filter((o) => o.questionId === r.q.id).map((o) => ({ id: o.id, label: o.label })),
        config: r.q.config,
      }));
    const includedIds = new Set(includedQuestions.map((q) => q.id));

    const answerInputs: AnswerInput[] = answerRows
      .filter((a) => includedIds.has(a.questionId))
      .map((a) => ({
        questionId: a.questionId,
        anonKey: anonByResponseId.get(a.responseId) ?? "",
        valueNumeric: a.valueNumeric != null ? Number(a.valueNumeric) : null,
        maskedText: a.maskedText,
        valueOptions: a.valueOptions,
      }));

    const categoriesAgg = aggregateByCategory(includedQuestions, answerInputs).filter((c) => c.questions.length > 0);

    const categoryOutputs: Array<{ categoryId: string; categoryName: string; analysis: CategoryAnalysis; rawMetrics: unknown }> = [];
    for (const cat of categoriesAgg) {
      const analysis = (await complete(buildCategoryPrompt(cat))) as CategoryAnalysis;
      categoryOutputs.push({ categoryId: cat.categoryId, categoryName: cat.categoryName, analysis, rawMetrics: cat.questions });
    }

    const cycleAnalysis = (await complete(
      buildCyclePrompt(categoryOutputs.map((c) => ({ categoryName: c.categoryName, summary: c.analysis.summary, score: c.analysis.score })))
    )) as CycleAnalysis;

    await db.transaction(async (tx) => {
      await tx.delete(analysisResults).where(eq(analysisResults.cycleId, cycleId)); // idempotência
      for (const c of categoryOutputs) {
        await tx.insert(analysisResults).values({
          clientId: cycle.clientId, cycleId, categoryId: c.categoryId, kind: "category_summary",
          summary: c.analysis.summary, score: String(c.analysis.score),
          recommendations: c.analysis.recommendations, rawMetrics: c.rawMetrics,
        });
      }
      await tx.insert(analysisResults).values({
        clientId: cycle.clientId, cycleId, categoryId: null, kind: "cycle_summary",
        summary: cycleAnalysis.summary, recommendations: cycleAnalysis.recommendations, rawMetrics: {},
      });

      const period = new Date().toISOString().slice(0, 8) + "01"; // primeiro dia do mês corrente
      await tx
        .insert(usageRecords)
        .values({
          clientId: cycle.clientId, cycleId, period,
          questionCount: cycle.questionCount, responseCount,
          billableUnits: String(cycle.questionCount * responseCount),
        })
        .onConflictDoUpdate({
          target: [usageRecords.cycleId, usageRecords.period],
          set: { responseCount, billableUnits: String(cycle.questionCount * responseCount), updatedAt: new Date() },
        });

      await tx.update(cycles).set({ status: "analyzed", updatedAt: new Date() }).where(eq(cycles.id, cycleId));
    });
  } catch (e) {
    await db
      .update(cycles)
      .set({ status: "closed", analysisError: e instanceof Error ? e.message : String(e), updatedAt: new Date() })
      .where(eq(cycles.id, cycleId));
    throw e;
  }
}
```

- [ ] **Step 4: Rodar** → PASS

- [ ] **Step 5: Action + botão** — adicionar em `src/app/app/ciclos/actions.ts`:

```ts
export async function closeAndAnalyze(formData: FormData) {
  const { clientId } = await requireGestor();
  const cycleId = String(formData.get("cycleId"));
  const cycle = await db.query.cycles.findFirst({ where: and(eq(cycles.id, cycleId), eq(cycles.clientId, clientId)) });
  if (!cycle || (cycle.status !== "open" && cycle.status !== "closed")) return;
  try {
    await runAnalysis(cycleId);
  } catch {
    // erro fica registrado em cycles.analysisError; página exibe
  }
  revalidatePath(`/app/ciclos/${cycleId}`);
}
```

(imports: `runAnalysis` de `@/lib/analysis/pipeline`, `revalidatePath`.)

No `/app/ciclos/[id]/page.tsx`: botão "Fechar e analisar" (status open) / "Tentar análise novamente" (status closed com `analysisError`); enquanto `processing`, badge "Analisando..."; quando `analyzed`, link "Ver relatório" → `/app/ciclos/[id]/relatorio`.

- [ ] **Step 6: Verificação manual** — com `ANTHROPIC_API_KEY` real: responder ciclo 2-3 vezes (abas anônimas/outro browser), "Fechar e analisar" → status analyzed, `analysis_results` no banco com summaries em pt-BR.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: pipeline de fechamento com análise Claude, N mínimo e usage record"
```

---

### Task 15: Relatório do ciclo

**Files:**
- Create: `src/app/app/ciclos/[id]/relatorio/page.tsx`, `src/app/app/ciclos/[id]/relatorio/metric-chart.tsx`

**Interfaces:**
- Consumes: `analysisResults`, `cycles`, `requireGestor`; `rawMetrics` = `QuestionAggregate[]` da Task 12
- Produces: página de relatório final da fatia

- [ ] **Step 1: Página** — `/app/ciclos/[id]/relatorio/page.tsx`: `requireGestor()`; carregar ciclo (filtrado por clientId, `notFound()` se ausente ou status ≠ analyzed) + analysis_results.

Layout:
1. Header: título do questionário, período, respostas, question_count
2. Card "Resumo geral" (cycle_summary): summary + recomendações numeradas
3. Um card por category_summary: nome da categoria, score grande (0-100, cor: ≥70 verde, 40-69 âmbar, <40 vermelho), trend quando existir (↑ ↔ ↓; oculto se null), summary, recomendações, e gráficos por pergunta via `metric-chart.tsx`

- [ ] **Step 2: Gráficos** — `metric-chart.tsx` (server component, CSS puro — sem lib de chart): recebe um `QuestionAggregate`; por `metrics.kind`:
- `numeric`: barras horizontais da distribution (label = valor, largura % = count/total) + "média X"
- `nps`: três barras (Promotores verde, Neutros âmbar, Detratores vermelho) + score
- `options`: barras horizontais por label
- `boolean`: duas barras Sim/Não
- `text`: lista dos textos mascarados em `<blockquote>` (máx 20, com "+N respostas")

Barra base:

```tsx
function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 shrink-0 truncate">{label}</span>
      <div className="h-4 flex-1 rounded bg-muted">
        <div className="h-4 rounded bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-muted-foreground">{count}</span>
    </div>
  );
}
```

- [ ] **Step 3: Verificação manual** — abrir relatório do ciclo analisado: resumo geral, card por categoria com score/recomendações, gráficos coerentes com respostas, textos livres mascarados ([NOME] no lugar de nomes).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: relatório do ciclo com scores, recomendações e gráficos"
```

---

### Task 16: Passe final — build, testes, README

**Files:**
- Create: `README.md`
- Modify: ajustes que o build apontar

- [ ] **Step 1: Rodar tudo**

```bash
pnpm test        # todos unit + integração PASS
pnpm build       # sem erros
pnpm lint        # sem erros
```

- [ ] **Step 2: Smoke test completo** — fluxo inteiro do zero: seed master + categorias → `/admin` cria client → convite → owner define senha → login → categoria própria → questionário → 5 perguntas → ativar → abrir ciclo → responder 3x → fechar e analisar → relatório.

- [ ] **Step 3: README.md** — setup local (docker compose, .env, migrate, seeds), scripts pnpm, mapa de rotas (`/admin`, `/app`, `/convite/[token]`, `/r/[token]`), link pros docs (`docs/project.md`, spec, plano).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: README com setup e fluxo da fatia 1"
```

---

## Cobertura da spec (self-check)

| Spec | Task |
|---|---|
| Setup projeto | 1 |
| Schema (clients, master_users, etc) | 2 |
| Better Auth gestor | 3 |
| Sessão master + seed | 4 |
| /admin cria client + owner + convite | 5 |
| Aceite convite + login gestor | 6 |
| Categorias (globais + client) | 7 |
| Questionários | 8 |
| Perguntas (analysis_goal, how_to_work, tipos, opções, arquivar) | 9 |
| Ciclo público (snapshot, token, QR) | 10 |
| Página pública + dedup + auto-fechamento | 11 |
| Mascaramento + agregação | 12 |
| Prompts + Claude | 13 |
| Pipeline (N mínimo, usage_record, retry idempotente, erro) | 14 |
| Relatório | 15 |
| Verificação final | 16 |
