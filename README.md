# qia

SaaS multi-tenant de questionários com análise por IA. Cada cliente cadastra questionários com perguntas categorizadas, roda ciclos (fechados ou públicos) e, ao fechar um ciclo, um assistente (Claude) analisa as respostas agregadas por categoria e gera relatório com recomendações.

Contexto completo do produto: [`docs/project.md`](docs/project.md). Modelagem de dados: [`docs/modelagem.md`](docs/modelagem.md). Spec e plano da fatia 1 (implementada): [`docs/superpowers/specs/2026-07-18-fatia1-ciclo-publico-design.md`](docs/superpowers/specs/2026-07-18-fatia1-ciclo-publico-design.md) e [`docs/superpowers/plans/2026-07-18-fatia1-ciclo-publico.md`](docs/superpowers/plans/2026-07-18-fatia1-ciclo-publico.md).

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Postgres** via Drizzle ORM (schema em `src/db/schema`, migrations em `src/db/migrations`)
- **Better Auth** (email/senha) para login do gestor (`/app`); sessão própria em JWT para o admin master (`/admin`)
- **Anthropic Claude API** (`@anthropic-ai/sdk`) para análise das respostas
- **Tailwind CSS 4** + shadcn/ui (Base UI)
- **Vitest** para testes unitários e de integração

## Setup local

### 1. Banco de dados

```bash
docker compose up -d
```

Sobe um Postgres 16 na porta **5434** (`docker-compose.yml`), com usuário/senha/db `qia`/`qia`/`qia`.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

| Variável                | Descrição                                                      |
| ----------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`          | `postgres://qia:qia@localhost:5434/qia`                        |
| `BETTER_AUTH_SECRET`    | Segredo do Better Auth (sessão do gestor)                      |
| `MASTER_SESSION_SECRET` | Segredo do JWT de sessão do admin master                       |
| `ANTHROPIC_API_KEY`     | Chave da API da Anthropic, usada na análise ao fechar um ciclo |
| `NEXT_PUBLIC_APP_URL`   | URL base da aplicação (usada para montar o link de convite)    |

Gere segredos com `openssl rand -hex 32`.

### 3. Instalar dependências e migrar

```bash
pnpm install
pnpm db:migrate
```

### 4. Seeds

```bash
MASTER_EMAIL=admin@qia.local MASTER_PASSWORD=admin123 pnpm seed:master
pnpm seed:categories
```

- `seed:master` cria (ou atualiza a senha de) o admin master que acessa `/admin`. Idempotente.
- `seed:categories` cria as categorias globais padrão (Clima, Riscos Psicossociais, Satisfação, NPS, Demografia). Idempotente.

> Se as variáveis de `.env.local` não forem carregadas automaticamente pelo `dotenv` (ex: ao rodar os scripts fora do fluxo do Next), prefixe o comando com `DATABASE_URL=postgres://qia:qia@localhost:5434/qia`.

### 5. Rodar em dev

```bash
pnpm dev
```

Sobe em `http://localhost:3000` (cai para `3001` se a 3000 estiver ocupada).

## Scripts pnpm

| Script                 | Descrição                                                       |
| ---------------------- | --------------------------------------------------------------- |
| `pnpm dev`             | Servidor de desenvolvimento (Next + Turbopack)                  |
| `pnpm build`           | Build de produção                                               |
| `pnpm start`           | Sobe o build de produção                                        |
| `pnpm lint`            | ESLint                                                          |
| `pnpm test`            | Testes (Vitest) — unitários e de integração                     |
| `pnpm db:generate`     | Gera migration a partir do schema (`src/db/schema`)             |
| `pnpm db:migrate`      | Aplica migrations pendentes no banco                            |
| `pnpm seed:master`     | Cria/atualiza o admin master (`MASTER_EMAIL`/`MASTER_PASSWORD`) |
| `pnpm seed:categories` | Cria as categorias globais padrão                               |

Os testes de integração usam o Postgres do `docker-compose.yml`; garanta que ele esteja de pé antes de rodar `pnpm test`.

## Logins de desenvolvimento

Credenciais locais (banco dev na porta 5434 — nunca usar em produção):

| Usuário            | Senha            | Onde loga      | Origem                                                 |
| ------------------ | ---------------- | -------------- | ------------------------------------------------------ |
| `admin@qia.local`  | `admin123`       | `/admin/login` | Seed padrão (`pnpm seed:master`, ver Setup local)      |
| `smoke@qia.local`  | `Smoke123!`      | `/admin/login` | Admin master criado pelo smoke test E2E (2026-07-19)   |
| `ana+*@smoke.test` | `SenhaForte123!` | `/app/login`   | Gestores dos clients `smoke-*` criados pelo smoke test |

O seed do master é idempotente: rodar `MASTER_EMAIL=... MASTER_PASSWORD=... pnpm seed:master` de novo atualiza a senha.

## Mapa de rotas

| Rota                         | Quem acessa     | Descrição                                                                   |
| ---------------------------- | --------------- | --------------------------------------------------------------------------- |
| `/admin/login`               | Admin master    | Login do master (sessão JWT própria)                                        |
| `/admin`                     | Admin master    | Cria clientes (tenants) e dispara convite de owner                          |
| `/convite/[token]`           | Owner convidado | Aceita o convite e define senha (cria usuário no Better Auth)               |
| `/app/login`                 | Gestor          | Login do gestor (Better Auth)                                               |
| `/app`                       | Gestor          | Início da área logada do cliente                                            |
| `/app/categorias`            | Gestor          | CRUD de categorias próprias do cliente                                      |
| `/app/questionarios`         | Gestor          | Lista/CRUD de questionários                                                 |
| `/app/questionarios/novo`    | Gestor          | Criação de questionário                                                     |
| `/app/questionarios/[id]`    | Gestor          | Detalhe do questionário: perguntas, opções, ativação                        |
| `/app/ciclos/[id]`           | Gestor          | Detalhe do ciclo: link/QR público, fechar e analisar                        |
| `/app/ciclos/[id]/relatorio` | Gestor          | Relatório da análise (resumo geral, por categoria, gráficos, recomendações) |
| `/r/[token]`                 | Público         | Página de resposta do ciclo público (sem login, com dedup por fingerprint)  |

## Fluxo ponta a ponta

1. Admin master (`/admin`) cria um client e um owner → gera link de convite
2. Owner acessa `/convite/[token]`, define senha → vira usuário do Better Auth
3. Owner loga em `/app/login` e cadastra categoria(s), questionário e perguntas (objetivo de análise + como trabalhar)
4. Ativa o questionário e abre um ciclo público (`/app/ciclos/[id]`) → gera link/QR (`/r/[token]`)
5. Respondentes respondem via `/r/[token]` (dedup por fingerprint, fecha por prazo/limite de respostas)
6. Gestor fecha o ciclo e dispara a análise (Claude, por categoria + resumo do ciclo, com mascaramento de nomes e regra de N mínimo pra dados sensíveis)
7. Relatório fica disponível em `/app/ciclos/[id]/relatorio`
