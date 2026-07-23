# Schema do banco (as-built)

Postgres + Drizzle ORM. Verificado direto no banco rodando (`pg_dump --schema-only` no container `qia-db-1`, Postgres 16.14) em 2026-07-21 — bate 1:1 com `src/db/schema/*`, sem drift entre migração aplicada e código. Não confundir com `docs/modelagem.md` (plano original, tem tabelas/campos que nunca foram implementados: `cycle_participants`, `plans`, `subscriptions`, modo `recurring`/`continuous`).

Todas as tabelas de negócio usam `uuid` PK (`gen_random_uuid()`), `createdAt`/`updatedAt` (`timestamptz`, default `now()`). Isolamento multi-tenant via `clientId` direto em cada tabela (não só via join).

> Inconsistência real (não é erro de doc): as tabelas do Better Auth (`user`, `session`, `account`, `verification`) usam `timestamp without time zone`, todas as outras usam `timestamptz`. Vem de como o Better Auth gera o schema, não foi decisão do projeto.

## Diagrama

```
auth.user ──┐ (Better Auth: identidade/login)
            │
clients ────┼── users (membership: clientId + authUserId, role/status por client)
    │       │
    ├── categories
    ├── questionnaires ─┬─ questions ── question_options
    │                   └─ cycles ─┬─ responses ── answers
    │                              ├─ analysis_results
    │                              ├─ usage_records
    │                              └─ chat_messages ── insights

master_users (super-admin da plataforma, tabela isolada, própria senha)
```

## Enums (`enums.ts`)

| Enum | Valores |
|---|---|
| `client_status` | active, suspended, canceled |
| `user_role` | owner, admin, manager, respondent |
| `user_status` | active, invited, inactive |
| `master_status` | active, inactive |
| `questionnaire_status` | draft, active, archived |
| `use_case` | clima, nr1, market_research, nps, other |
| `answer_type` | scale, single_choice, multi_choice, nps, free_text, boolean |
| `question_status` | active, archived |
| `cycle_mode` | one_off |
| `cycle_status` | scheduled, open, closed, processing, analyzed |
| `response_status` | in_progress, submitted |
| `analysis_kind` | category_summary, cycle_summary, persona |
| `trend` | up, stable, down |
| `chat_role` | user, assistant |

## Tabelas

### `master_users` (master.ts)
Super-admin da plataforma. Senha própria (`passwordHash`), **não** usa Better Auth.

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| name, email | text | email unique |
| passwordHash | text | |
| status | master_status | default active |

### Better Auth — `user`, `session`, `account`, `verification` (auth.ts)
Tabelas padrão do Better Auth, genéricas (sem `clientId`). `user.email` é unique **global**.

- `session` / `account` → FK `userId → user.id`, `onDelete: cascade`.
- `account.password` guarda hash quando provider é credentials.
- `verification` → tokens de verificação (email etc), indexado por `identifier`.

### `clients` (clients.ts)
Tenant/empresa. Raiz do isolamento multi-tenant.

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| name | text | |
| slug | text unique | |
| status | client_status | default active |
| settings | jsonb `{minAnonymityN: number}` | default `{minAnonymityN: 5}` |

### `users` (clients.ts) — membership por client
**Não** é a tabela de auth. É o vínculo pessoa↔client: role, status, convite. Uma pessoa (1 email) pode ter uma linha por client diferente (unique é composto, não global).

| Coluna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| clientId | uuid FK → clients.id | |
| authUserId | text unique, nullable | FK lógica pro `auth.user.id`; null até convite ser aceito |
| name, email | text | duplicados do auth propositalmente — precisam existir antes do accept (convite mostra/envia pra esse email antes de existir conta) |
| role | user_role | |
| status | user_status | default invited |
| inviteToken | text unique, nullable | |
| inviteExpiresAt | timestamptz, nullable | |

Índices: `uniqueIndex(clientId, email)`, `index(clientId)`.

### `categories` (questionnaires.ts)
`clientId` nullable = categoria global/template.

### `questionnaires` (questionnaires.ts)
`clientId` NOT NULL. `useCase` nullable (enum). `status` default draft.

### `questions` (questionnaires.ts)
Carrega `analysisGoal` e `howToWork` — texto que alimenta o prompt do assistente. `config` jsonb tipado `{min?, max?, minLabel?, maxLabel?}`. `isSensitive` marca campo demográfico sensível.

### `question_options` (questionnaires.ts)
Opções pra `single_choice`/`multi_choice`. `value` é estável (usado na análise), `label` é editável.

### `cycles` (cycles.ts)
Execução de um questionário. `questionCount` é **snapshot imutável** no disparo (base de billing). `mode` só tem `one_off` implementado (recurring/continuous do plano original não existe). `publicToken` unique nullable pra ciclo público. `analysisError` guarda falha do pipeline.

### `responses` (cycles.ts)
`userId` nullable — null em ciclo público. `anonKey` é o identificador que vai pra análise (nunca o `userId`). `sessionFingerprint` dedup de resposta duplicada em ciclo público.

Índices: `uniqueIndex(cycleId, sessionFingerprint)`, `index(clientId, cycleId)`.

> Nota: não existe `cycle_participants` (do plano original) — hoje não há lista fechada de convocados por ciclo, só `responses`.

### `answers` (cycles.ts)
`valueNumeric`/`valueText`/`valueOptions` (array de uuid) conforme `answer_type` da pergunta. `maskedText` é a versão anonimizada usada pelo assistente. Unique `(responseId, questionId)`.

### `analysis_results` (analysis.ts)
Saída do assistente. `categoryId` nullable = resumo geral do ciclo (`kind = cycle_summary` ou `persona`). `recommendations` jsonb tipado `Recommendation[]` (`{title, description}`). `rawMetrics` jsonb livre (distribuições pros gráficos).

### `usage_records` (analysis.ts)
Billing por ciclo/mês. Unique `(cycleId, period)`.

### `chat_messages` (chat.ts)
Histórico do chat por ciclo. Índice `(cycleId, createdAt)`.

### `insights` (chat.ts)
Anotação extraída do chat. `sourceMessageId` nullable → FK `chat_messages.id`. `createdBy` NOT NULL → FK `users.id` (o gestor).

> Diverge do plano original: não tem `source` enum (chat/manual) nem `include_in_report`.

## O que existe no plano (`modelagem.md`) mas não foi implementado

- `cycle_participants` (lista fechada de convocados por ciclo)
- `plans` / `subscriptions` (billing de plataforma)
- `cycles.mode`: `recurring`, `continuous`, `recurrence_rule`, `window_interval`
- `insights.source`, `insights.include_in_report`

## Constraints/índices principais

- Toda tabela de negócio: índice começando com `clientId` (isolamento multi-tenant)
- `users`: unique `(clientId, email)`
- `responses`: unique `(cycleId, sessionFingerprint)`
- `answers`: unique `(responseId, questionId)`
- `usage_records`: unique `(cycleId, period)`
- `cycles.publicToken`, `clients.slug`, `master_users.email`, `auth.user.email`, `auth.session.token`: unique
- FKs sem `onDelete` cascade, exceto Better Auth (`session`/`account` → `user`, cascade)

## Estado atual (dev, 2026-07-21)

Contagem exata de linhas — banco local de desenvolvimento com seed/dados de teste, não produção:

| Tabela | Linhas | | Tabela | Linhas |
|---|---|---|---|---|
| clients | 3 | | responses | 11 |
| users | 4 | | answers | 55 |
| user (auth) | 3 | | categories | 9 |
| session | 12 | | analysis_results | 8 |
| questionnaires | 4 | | chat_messages | 14 |
| questions | 15 | | usage_records | 4 |
| cycles | 7 | | account, verification, master_users, question_options, insights | 0 |

`master_users` vazia — nenhum super-admin cadastrado ainda. `question_options` vazia — sem pergunta `single_choice`/`multi_choice` criada ainda.
