# Modelagem de Dados – SaaS de Questionários

Banco: Postgres. Multi-tenant por `tenant_id` em todas as tabelas de negócio. Todas as tabelas têm `id UUID PK`, `created_at`, `updated_at`. FKs sempre com índice.

## Diagrama (visão geral)

```
tenants ─┬─ users ────────────┐
         ├─ categories        │
         ├─ questionnaires ─┬─ questions ── question_options
         │                  └─ cycles ─┬─ cycle_participants (user)
         │                             ├─ responses ── answers
         │                             ├─ analysis_results
         │                             ├─ insights
         │                             └─ usage_records
         └─ plans/subscriptions
```

## Tabelas

### tenants

Empresa/cliente da plataforma. Raiz do isolamento multi-tenant.

| Coluna   | Tipo        | Descrição                                                          |
| -------- | ----------- | ------------------------------------------------------------------ |
| id       | uuid PK     |                                                                    |
| name     | text        | Nome da empresa                                                    |
| slug     | text unique | Identificador na URL (ex: acme.app.com ou app.com/acme)            |
| status   | enum        | active, suspended, canceled                                        |
| settings | jsonb       | Configurações gerais (branding, idioma, N mínimo de anonimato etc) |

### users

Usuário do sistema dentro de um tenant. Serve tanto pra admin/gestor quanto pra respondente cadastrado, diferenciado por role.

| Coluna    | Tipo    | Descrição                         |
| --------- | ------- | --------------------------------- |
| id        | uuid PK |                                   |
| tenant_id | uuid FK |                                   |
| name      | text    |                                   |
| email     | text    | Unique por tenant                 |
| role      | enum    | owner, admin, manager, respondent |
| status    | enum    | active, invited, inactive         |

> Dado demográfico sensível NÃO fica em users. Se o questionário coleta demografia (gênero, etnia etc), isso é resposta (answers) e segue as regras de anonimização.

### categories

Categoria de pergunta. Pode ser global (template do sistema, tenant_id null) ou do tenant.

| Coluna      | Tipo             | Descrição                                        |
| ----------- | ---------------- | ------------------------------------------------ |
| id          | uuid PK          |                                                  |
| tenant_id   | uuid FK nullable | null = categoria global/template                 |
| name        | text             | Ex: Clima, Riscos Psicossociais, NPS, Demografia |
| description | text             | O que essa categoria mede                        |

### questionnaires

Questionário do tenant.

| Coluna      | Tipo          | Descrição                                                                      |
| ----------- | ------------- | ------------------------------------------------------------------------------ |
| id          | uuid PK       |                                                                                |
| tenant_id   | uuid FK       |                                                                                |
| title       | text          |                                                                                |
| description | text          |                                                                                |
| use_case    | enum nullable | clima, nr1, market_research, nps, other (pra templates e relatórios adaptados) |
| status      | enum          | draft, active, archived                                                        |

### questions

Pergunta de um questionário. Carrega os dois campos que alimentam o prompt do assistente.

| Coluna           | Tipo    | Descrição                                                                                                             |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| id               | uuid PK |                                                                                                                       |
| tenant_id        | uuid FK |                                                                                                                       |
| questionnaire_id | uuid FK |                                                                                                                       |
| category_id      | uuid FK |                                                                                                                       |
| position         | int     | Ordem no questionário                                                                                                 |
| text             | text    | Enunciado da pergunta                                                                                                 |
| analysis_goal    | text    | "Objetivo de análise": o que o assistente deve extrair dessa pergunta                                                 |
| how_to_work      | text    | "Como trabalhar": orientação de ação quando o resultado indicar problema                                              |
| answer_type      | enum    | scale, single_choice, multi_choice, nps, free_text, boolean                                                           |
| is_required      | boolean |                                                                                                                       |
| is_sensitive     | boolean | Marca campos demográficos sensíveis (etnia, orientação sexual, religião, PCD). Ativa a regra do N mínimo nos recortes |
| config           | jsonb   | Config do tipo (ex: escala min/max e labels)                                                                          |
| status           | enum    | active, archived (não deletar pergunta com resposta; arquivar)                                                        |

### question_options

Opções de resposta pra single_choice / multi_choice.

| Coluna      | Tipo    | Descrição                                                     |
| ----------- | ------- | ------------------------------------------------------------- |
| id          | uuid PK |                                                               |
| question_id | uuid FK |                                                               |
| position    | int     |                                                               |
| label       | text    |                                                               |
| value       | text    | Valor estável pra análise (label pode ser editado, value não) |

### cycles

Execução de um questionário. Snapshot de billing gravado no disparo.

| Coluna           | Tipo                 | Descrição                                                                                   |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| id               | uuid PK              |                                                                                             |
| tenant_id        | uuid FK              |                                                                                             |
| questionnaire_id | uuid FK              |                                                                                             |
| is_public        | boolean              | true = roda aberto via link público, sem login                                              |
| public_token     | text unique nullable | Token do link/QR code quando is_public                                                      |
| mode             | enum                 | one_off, recurring, continuous (continuous = sempre aberto, consolida por janela; caso NPS) |
| recurrence_rule  | text nullable        | RRULE quando recurring                                                                      |
| window_interval  | enum nullable        | Janela de consolidação quando continuous (ex: monthly)                                      |
| starts_at        | timestamptz          |                                                                                             |
| ends_at          | timestamptz nullable | null em continuous                                                                          |
| max_responses    | int nullable         | Limite de respostas em ciclo público                                                        |
| question_count   | int                  | **Snapshot** da quantidade de perguntas no disparo, base do billing                         |
| status           | enum                 | scheduled, open, closed, processing, analyzed                                               |

### cycle_participants

Quem deve responder um ciclo fechado. Não existe pra ciclo público.

| Coluna      | Tipo                 | Descrição                  |
| ----------- | -------------------- | -------------------------- |
| id          | uuid PK              |                            |
| cycle_id    | uuid FK              |                            |
| user_id     | uuid FK              |                            |
| status      | enum                 | pending, answered, expired |
| notified_at | timestamptz nullable |                            |

### responses

Uma submissão completa de um respondente em um ciclo. É aqui que mora a separação identidade x resposta.

| Coluna              | Tipo             | Descrição                                                                               |
| ------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| id                  | uuid PK          |                                                                                         |
| tenant_id           | uuid FK          |                                                                                         |
| cycle_id            | uuid FK          |                                                                                         |
| user_id             | uuid FK nullable | Preenchido só em ciclo fechado. Null em público                                         |
| anon_key            | text             | Id anônimo estável dentro do ciclo (ex: hash). É o que vai pra análise no lugar do user |
| session_fingerprint | text nullable    | Ciclo público: dedup de resposta duplicada (cookie/fingerprint). Nunca vai pra análise  |
| submitted_at        | timestamptz      |                                                                                         |
| status              | enum             | in_progress, submitted                                                                  |

> Regra: a análise e qualquer export só enxergam `anon_key`. `user_id` existe pra controle de participação (quem já respondeu) e nunca é passado pro assistente nem exibido em relatório.

### answers

Resposta a uma pergunta individual.

| Coluna        | Tipo             | Descrição                                                    |
| ------------- | ---------------- | ------------------------------------------------------------ |
| id            | uuid PK          |                                                              |
| response_id   | uuid FK          |                                                              |
| question_id   | uuid FK          |                                                              |
| value_numeric | numeric nullable | scale, nps                                                   |
| value_text    | text nullable    | free_text (passa por mascaramento de nomes antes da análise) |
| value_options | uuid[] nullable  | Ids de question_options escolhidas                           |
| masked_text   | text nullable    | Versão anonimizada do value_text usada pelo assistente       |

### analysis_results

Saída do assistente por ciclo (e por categoria, ou geral).

| Coluna          | Tipo             | Descrição                                                        |
| --------------- | ---------------- | ---------------------------------------------------------------- |
| id              | uuid PK          |                                                                  |
| tenant_id       | uuid FK          |                                                                  |
| cycle_id        | uuid FK          |                                                                  |
| category_id     | uuid FK nullable | null = resumo geral do ciclo / persona                           |
| kind            | enum             | category_summary, cycle_summary, persona                         |
| summary         | text             | Resumo textual                                                   |
| score           | numeric nullable | Score agregado da categoria no ciclo                             |
| trend           | enum nullable    | up, stable, down (vs ciclo anterior)                             |
| recommendations | jsonb            | Ações sugeridas, derivadas do how_to_work das perguntas em queda |
| raw_metrics     | jsonb            | Distribuições agregadas usadas nos gráficos                      |

### insights

Anotação salva pelo gestor a partir do chat conversacional.

| Coluna            | Tipo          | Descrição         |
| ----------------- | ------------- | ----------------- |
| id                | uuid PK       |                   |
| tenant_id         | uuid FK       |                   |
| cycle_id          | uuid FK       |                   |
| created_by        | uuid FK users | Gestor que salvou |
| content           | text          | Texto do insight  |
| source            | enum          | chat, manual      |
| include_in_report | boolean       |                   |

### chat_messages

Histórico do chat conversacional sobre um ciclo (contexto por conversa, já que a API é stateless).

| Coluna    | Tipo    | Descrição          |
| --------- | ------- | ------------------ |
| id        | uuid PK |                    |
| tenant_id | uuid FK |                    |
| cycle_id  | uuid FK |                    |
| user_id   | uuid FK | Gestor conversando |
| role      | enum    | user, assistant    |
| content   | text    |                    |

### usage_records

Consumo por ciclo pra billing. Gravado no fechamento (ou da janela, em continuous).

| Coluna         | Tipo    | Descrição                                                                                        |
| -------------- | ------- | ------------------------------------------------------------------------------------------------ |
| id             | uuid PK |                                                                                                  |
| tenant_id      | uuid FK |                                                                                                  |
| cycle_id       | uuid FK |                                                                                                  |
| period         | date    | Mês de competência da fatura                                                                     |
| question_count | int     | Do snapshot do ciclo                                                                             |
| response_count | int     | Respostas submetidas                                                                             |
| billable_units | numeric | Unidade final de cobrança (fórmula a definir: question_count ou question_count x response_count) |

### plans / subscriptions

Plano do tenant e limites incluídos.

**plans**
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| name | text | |
| included_users | int | Respondentes inclusos |
| included_questionnaires | int | Questionários ativos inclusos |
| included_units | int | Unidades de consumo inclusas por mês |
| extra_unit_price | numeric | Preço da unidade excedente |

**subscriptions**
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| plan_id | uuid FK | |
| status | enum | active, past_due, canceled |
| current_period_start/end | timestamptz | |

## Índices e constraints principais

- Todas as tabelas de negócio: índice composto começando por `tenant_id` (ex: `(tenant_id, cycle_id)`)
- `responses`: unique `(cycle_id, user_id)` quando user_id não nulo (uma resposta por pessoa por ciclo); unique `(cycle_id, session_fingerprint)` em público
- `answers`: unique `(response_id, question_id)`
- `cycles.public_token`: unique, indexado (lookup do link público)
- `usage_records`: unique `(cycle_id, period)`

## Regras de integridade que ficam na aplicação

- Pergunta com resposta não pode ser deletada nem ter answer_type alterado; só arquivada (status archived). Edição de texto após início de ciclo cria alerta ou nova versão
- `question_count` do ciclo é imutável após o disparo
- Recortes com perguntas `is_sensitive` só são exibidos/analisados se o grupo tiver >= N respondentes (N em tenants.settings, default 5)
- O pipeline de análise só lê `anon_key`, `masked_text` e agregados; nunca user_id, email ou value_text bruto de pergunta sensível
