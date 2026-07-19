# Fatia 1 — Ciclo público end-to-end

Data: 2026-07-18
Base: `docs/project.md` (visão) e `docs/modelagem.md` (modelagem). Este spec define o primeiro incremento implementável.

## Objetivo

Provar o core do produto de ponta a ponta: gestor cria questionário com perguntas categorizadas, abre um ciclo público via link, pessoas respondem sem login, o ciclo é fechado e o assistente de IA gera análise por categoria, exibida em um relatório.

## Escopo

### Dentro

1. Setup do projeto (Next.js fullstack + Postgres)
2. Schema do banco (subconjunto da modelagem)
3. Área master (`/admin`): criação de clients e owners
4. Auth do gestor (email/senha via Better Auth)
5. CRUD de questionário, categorias e perguntas
6. Ciclo público: criação, link público, coleta de respostas
7. Fechamento do ciclo com análise via Claude API
8. Relatório do ciclo por categoria
9. Registro de consumo (`usage_records`) desde já

### Fora (fatias futuras)

- Ciclo fechado (participantes cadastrados, notificação)
- Chat conversacional e insights
- Exportação PDF
- Billing/planos (`plans`, `subscriptions`)
- Recorrência automática de ciclos (agendamento)
- Envio automático de email (convite é link copiável nesta fatia)
- Templates por caso de uso

## Stack

- **App**: Next.js 15 (App Router) + TypeScript, um único projeto (UI + server actions/route handlers)
- **UI**: Tailwind CSS + shadcn/ui, interface em pt-BR
- **Banco**: Postgres (Docker Compose local), Drizzle ORM + drizzle-kit migrations
- **Auth**: Better Auth (tabelas no próprio Postgres)
- **IA**: Claude API (`@anthropic-ai/sdk`)
- **Testes**: Vitest
- **Package manager**: pnpm

## Modelo de dados (desta fatia)

Segue `docs/modelagem.md` com duas mudanças decididas:

1. **Tabela `tenants` vira `clients`** — FKs passam de `tenant_id` para `client_id` em todas as tabelas de negócio.
2. **Nova tabela `master_users`** — administradores da plataforma, fora do escopo de client.

### Tabelas criadas nesta fatia

- `master_users`: id, name, email unique, status. Credencial/sessão gerenciada separada da auth dos gestores.
- `clients`: id, name, slug unique, status, settings jsonb (inclui N mínimo de anonimato, default 5)
- `users`: id, client_id, name, email (unique por client), role (owner/admin/manager/respondent), status
- `categories`: id, client_id nullable (null = global), name, description
- `questionnaires`: id, client_id, title, description, use_case, status
- `questions`: id, client_id, questionnaire_id, category_id, position, text, analysis_goal, how_to_work, answer_type, is_required, is_sensitive, config jsonb, status
- `question_options`: id, question_id, position, label, value
- `cycles`: id, client_id, questionnaire_id, is_public, public_token, mode, starts_at, ends_at, max_responses, question_count (snapshot no disparo), status
- `responses`: id, client_id, cycle_id, user_id nullable, anon_key, session_fingerprint, submitted_at, status
- `answers`: id, response_id, question_id, value_numeric, value_text, value_options, masked_text
- `analysis_results`: id, client_id, cycle_id, category_id nullable, kind, summary, score, trend, recommendations jsonb, raw_metrics jsonb
- `usage_records`: id, client_id, cycle_id, period, question_count, response_count, billable_units

Índices e constraints conforme `docs/modelagem.md` (unique `(cycle_id, session_fingerprint)`, unique `(response_id, question_id)`, `public_token` unique indexado, índices compostos iniciando por `client_id`).

Nesta fatia todos os ciclos são `is_public = true`, `mode = one_off`. Colunas de recorrência (`recurrence_rule`, `window_interval`) ficam de fora do schema até a fatia que as usar.

## Auth e áreas do app

### Área master — `/admin`

- Login do master em `/admin` (tabela `master_users`, sessão separada da sessão de gestor)
- Funções: criar client (name, slug), criar owner do client (name, email) → gera **link de convite** onde o owner define a senha
- Nesta fatia o link de convite é exibido pro master copiar e enviar manualmente (sem SMTP)
- Sem signup público: tenant só nasce pelo master

### Área do gestor — `/app`

- Login email/senha (Better Auth)
- Sessão resolve `client_id`; toda query de negócio filtra por ele (isolamento multi-tenant na aplicação)
- Roles desta fatia: owner/admin (mesmas permissões por ora)

### Página pública — `/r/[token]`

- Sem login. Lookup do ciclo por `public_token`
- Responsiva (mobile-first)

## Fluxos

### 1. Master cria client

`/admin` → novo client (name, slug) → novo owner (name, email) → sistema gera token de convite → master copia link → owner abre, define senha, cai em `/app`.

### 2. Gestor monta questionário

- CRUD de categorias (as globais do sistema aparecem junto das do client)
- Criar questionário (title, description, use_case)
- Adicionar perguntas: text, categoria, answer_type (scale, single_choice, multi_choice, nps, free_text, boolean), analysis_goal, how_to_work, is_required, is_sensitive, config (min/max/labels de escala), opções quando choice
- Reordenar perguntas (position)
- Pergunta com resposta não é deletada nem muda de answer_type: só arquivada

### 3. Ciclo público

- Criar ciclo a partir de um questionário ativo: define ends_at (opcional) e max_responses (opcional)
- No disparo: grava `question_count` (snapshot imutável) e gera `public_token`
- Tela do ciclo mostra link + QR code e contagem de respostas
- Página pública renderiza o questionário; ao submeter grava `response` (anon_key gerado, session_fingerprint de cookie) + `answers`
- Dedup: unique `(cycle_id, session_fingerprint)` — segunda tentativa do mesmo browser mostra "você já respondeu"
- Ciclo fecha manualmente pelo gestor, ou automaticamente ao atingir max_responses/ends_at (checagem no acesso, sem scheduler nesta fatia)

### 4. Fechamento e análise

Server action "fechar e analisar" (inline, sem fila nesta fatia):

1. status → `processing`
2. Agrupa answers por categoria da pergunta
3. Anonimização: free_text passa por mascaramento de nomes próprios → `masked_text` (a análise só lê masked_text, nunca value_text de pergunta sensível; nunca user_id/email/fingerprint)
4. Agregados por pergunta: distribuição de opções, média/desvio de escala e NPS, lista de textos mascarados
5. Por categoria: prompt estruturado com perguntas + analysis_goal + how_to_work + agregados → Claude API → `analysis_results` kind=category_summary (summary, score, recommendations, raw_metrics)
6. Resumo geral: prompt cruzando os resumos de categoria → `analysis_results` kind=cycle_summary
7. Grava `usage_record` (period = mês corrente, question_count do snapshot, response_count, billable_units = question_count × response_count — fórmula provisória)
8. status → `analyzed`
9. Falha em qualquer etapa: status volta pra `closed`, erro registrado e visível, botão "tentar análise novamente" (idempotente: reprocessar substitui analysis_results do ciclo)

Regra de anonimato: recorte de pergunta `is_sensitive` só entra na análise/relatório se o grupo tiver ≥ N respondentes (N em `clients.settings`, default 5).

### 5. Relatório

Página do ciclo analisado:

- Score e tendência por categoria (tendência fica `null`/oculta enquanto não houver ciclo anterior comparável)
- Resumo e recomendações do assistente por categoria
- Distribuições por pergunta (gráficos a partir de raw_metrics)
- Resumo geral do ciclo
- Sempre agregado, nunca resposta individual identificável

## Estrutura do projeto

```
qia/
  docs/
  src/
    app/
      admin/          # área master
      app/            # área do gestor (autenticada)
      r/[token]/      # página pública de resposta
      api/            # route handlers (auth, etc)
    db/
      schema/         # schema Drizzle por domínio
      migrations/
    lib/
      auth/           # Better Auth config + sessão master
      analysis/       # pipeline: agregação, mascaramento, prompts, cliente Claude
    components/
  docker-compose.yml  # Postgres local
```

## Testes

- Unit (Vitest): agregação por categoria, mascaramento de nomes, montagem de prompt, regra do N mínimo, cálculo de billable_units
- Integração: pipeline de fechamento com cliente Claude mockado (fixture de respostas → analysis_results esperados)
- Fluxo público: submissão válida, dedup por fingerprint, ciclo cheio/expirado

## Riscos e decisões em aberto

- **Mascaramento de nomes**: nesta fatia, abordagem simples (regex/heurística + instrução no prompt); NER dedicado fica pra depois se necessário
- **Análise inline**: fechamento roda na request (pode levar dezenas de segundos com muitas categorias). Aceitável na fatia 1; fila entra quando houver volume
- **Fórmula de billing** (`question_count × response_count`) é provisória, marcada na spec do produto como aberta
