# SaaS de Questionários com IA (multi-tenant)

## Visão geral

Plataforma multi-tenant onde cada tenant cadastra questionários próprios, com perguntas categorizadas e rodando em ciclos recorrentes. Um assistente de IA analisa as respostas de forma anonimizada, gera relatórios e conversa com o gestor sobre os resultados.

## Casos de uso alvo

- **Clima organizacional**: medir engajamento, valorização, segurança psicológica ao longo do tempo
- **NR-1 (riscos psicossociais)**: ciclos recorrentes de avaliação pra atender a exigência legal, com histórico e evidência de acompanhamento
- **Pesquisa de mercado**: questionários públicos abertos pra público externo
- **NPS de atendimento**: pesquisa pós-atendimento, pontual ou recorrente
- Qualquer pesquisa recorrente ou pontual com análise por categoria

## Conceito central

1. Você cadastra um **questionário**
2. Cada **pergunta** tem:
   - Categoria (ex: clima, saúde mental, riscos psicossociais, satisfação, NPS)
   - Objetivo de análise (o que o assistente deve extrair dela)
   - Como trabalhar (orientação de ação pra quando o resultado indicar problema)
   - Tipo de resposta (escala, múltipla escolha, texto livre, NPS 0-10)
3. O questionário roda em **ciclos** (pontual ou recorrente: semanal, quinzenal, mensal...)
4. Cada ciclo pode ser **fechado** (usuários cadastrados) ou **público** (link aberto)
5. Ao fechar o ciclo, o **assistente de IA** analisa por categoria e gera relatório + recomendações
6. O gestor pode **conversar com o assistente** sobre os resultados e salvar insights

## Modelo de dados

- **Tenant**: empresa/cliente, isolamento de dados por tenant_id
- **User**: usuário respondente cadastrado, vinculado a um tenant
- **Questionnaire**: questionário do tenant
- **Category**: categoria de pergunta (global ou por tenant)
- **Question**: pergunta com categoria, objetivo de análise, como trabalhar e tipo de resposta
- **Cycle**: execução de um questionário
  - `is_public: boolean` → se true, o ciclo roda aberto via link público, sem exigir usuário cadastrado
  - período (início/fim), recorrência, status
  - `question_count`: quantidade de perguntas do ciclo no momento do disparo (snapshot pra billing)
- **Answer**: resposta a uma pergunta dentro de um ciclo
  - ciclo fechado: vinculada a um user (mas anonimizada antes da análise)
  - ciclo público: sem user, só um id anônimo de sessão (com proteção básica contra resposta duplicada: cookie/fingerprint ou email opcional só pra deduplicar, nunca pra análise)
- **AnalysisResult**: saída do assistente por ciclo/categoria (resumo, score, tendência, recomendações)
- **Insight**: anotação salva pelo gestor a partir do chat, vinculada ao ciclo
- **UsageRecord**: registro de consumo por ciclo pra precificação (perguntas x respondentes)

## Ciclos

### Ciclo fechado

- Disparo pros usuários cadastrados do grupo, conforme recorrência
- Fecha por prazo ou quando todos responderam

### Ciclo público (is_public)

- Gera um link/QR code aberto, qualquer pessoa responde sem login
- Ideal pra pesquisa de mercado e NPS de atendimento
- Fecha por prazo ou por limite de respostas
- Pode ficar sempre aberto em modo contínuo (ex: NPS pós-atendimento), com a análise rodando em janelas (ex: consolida a cada mês)

### Processamento ao fechar (ou fechar a janela)

1. Agrupa respostas por categoria
2. Anonimiza (remove qualquer identificador, mascara nomes próprios em texto livre)
3. Chama o assistente com: perguntas + objetivo de análise + como trabalhar + respostas agregadas
4. Salva AnalysisResult e gera o relatório
5. Registra o consumo (UsageRecord) pra billing

## Assistente de IA

- Análise por categoria: resumo, pontos de atenção, tendência vs ciclos anteriores
- Recomendações de ação baseadas no "como trabalhar" das perguntas com resultado ruim ou em queda
- Resumo geral do ciclo cruzando categorias
- Avatar/persona sintética do perfil médio dos respondentes (tipo a "Moví"), como saída criativa opcional
- Modelo: Claude via API, prompt estruturado por categoria

### Modo conversacional

- Chat onde o gestor conversa sobre os resultados: "por que essa categoria caiu?", "o que fazer pra melhorar reconhecimento?", "compara com o ciclo anterior"
- Responde só com dados agregados + os campos de análise das perguntas
- Insights bons podem ser salvos (entidade Insight) e entram no relatório
- Nunca revela nem infere resposta individual, mesmo se perguntado diretamente

### Anonimização (regra transversal)

- O assistente nunca recebe nome, email ou identificador direto
- Ids anônimos por respondente só pra comparação dentro do ciclo
- Resultado sempre agregado por categoria/ciclo
- Mascaramento de nomes próprios em respostas de texto livre antes do prompt
- Campos demográficos sensíveis (orientação sexual, etnia, religião, PCD) só em agregado, sem recortes que exponham alguém (importante em equipes pequenas: se um recorte tiver menos de N respondentes, ex 5, não exibe)

## Relatórios

- Gerado ao fim de cada ciclo (ou janela, no caso de público contínuo)
- Gráficos por categoria + insights do assistente + recomendações de ação
- Comparativo entre ciclos (evolução por categoria)
- Exportação em PDF
- Pra NR-1: relatório serve como evidência de acompanhamento periódico dos riscos psicossociais
- Sempre agregado, nunca individual

## Precificação

Modelo base + consumo:

- **Plano base**: inclui X usuários respondentes, Y questionários ativos e Z perguntas por ciclo
- **Extra por consumo**: a unidade de cobrança é **perguntas por ciclo**
  - No disparo do ciclo, grava o snapshot `question_count`
  - Consumo do ciclo = question_count (ou question_count x respondentes, a definir)
  - O que passar do incluído no plano vira cobrança extra no fim do mês
- Ciclos públicos podem ter uma métrica adicional por volume de respostas (pesquisa de mercado pode ter milhares de respondentes)
- UsageRecord centraliza tudo pra fatura ficar auditável

Aberto a definir: se o extra é só por pergunta/ciclo ou pergunta x respondente, e os valores.

## Stack

- Frontend: React (web) + link público responsivo pra mobile
- Backend: Node.js + TypeScript
- Banco: Postgres com tenant_id
- Agendamento de ciclos: AWS EventBridge + SQS (ou cron simples no MVP)
- IA: Claude API
- Infra: AWS

## MVP

1. Cadastro de tenant e usuários
2. Cadastro de questionário, categoria e pergunta (objetivo de análise + como trabalhar)
3. Ciclo fechado com disparo manual + ciclo público via link (is_public)
4. Coleta de respostas
5. Análise via IA por categoria ao fechar
6. Chat conversacional com salvamento de insights
7. Relatório do ciclo com exportação PDF
8. Contagem de perguntas por ciclo (UsageRecord) já gravando desde o início, mesmo antes de cobrar

## Em aberto

- Nome do produto
- Valores e fórmula exata do extra (pergunta/ciclo vs pergunta x respondente)
- Templates prontos por caso de uso (clima, NR-1, NPS, pesquisa de mercado) pra acelerar onboarding
- Limite mínimo de respondentes (N) pra exibir recortes demográficos
