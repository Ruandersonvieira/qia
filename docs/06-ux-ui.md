# Diagrama de Telas

## Fluxo Principal

```text
                                     ┌─────────────────────┐
                                     │       Login         │
                                     └──────────┬──────────┘
                                                │
                           Primeiro acesso      │
                           Esqueci senha        │
                                                ▼
                                   ┌─────────────────────┐
                                   │     Dashboard       │
                                   └───────┬─────────────┘
                                           │
      ┌────────────────────────────────────┼──────────────────────────────────────┐
      │                                    │                                      │
      ▼                                    ▼                                      ▼
┌───────────────┐                 ┌────────────────┐                    ┌─────────────────┐
│ Questionários │                 │    Ciclos      │                    │   Relatórios    │
└──────┬────────┘                 └──────┬─────────┘                    └────────┬────────┘
       │                                 │                                       │
       ▼                                 ▼                                       ▼
Criar Questionário               Criar Ciclo                          Visualizar PDF
Editar Questionário              Editar Ciclo                         Exportar
Duplicar                         Encerrar                             Compartilhar
Arquivar                         Participação                         Histórico
                                 IA
                                 Insights
```

---

# Dashboard

```text
Dashboard
│
├── KPIs
│
├── Últimos Ciclos
│
├── Resumo IA
│
├── Questionários Recentes
│
├── Atalhos
│
└── Navegação
        │
        ├── Questionários
        ├── Ciclos
        ├── IA
        ├── Relatórios
        ├── Billing
        ├── Usuários
        └── Configurações
```

---

# Questionários

```text
Questionários
│
├── Lista
│
├── Buscar
│
├── Novo
│
├── Templates
│
└── Selecionar
      │
      ▼
Detalhes do Questionário
      │
      ├── Informações
      ├── Perguntas
      ├── Categorias
      ├── Histórico
      ├── Ciclos
      └── Configurações
```

---

# Perguntas

```text
Questionário
      │
      ▼
Perguntas
│
├── Nova Pergunta
├── Editar
├── Duplicar
├── Excluir
└── Preview
```

---

# Editor da Pergunta

```text
Pergunta

│

├── Texto

├── Categoria

├── Tipo

├── Obrigatória

├── Objetivo da IA

├── Como Trabalhar

├── Configurações

└── Preview
```

---

# Ciclos

```text
Ciclos

│

├── Agendados

├── Em andamento

├── Processando

├── Finalizados

└── Novo Ciclo
        │
        ▼
Criar Ciclo
```

---

# Criar Ciclo

```text
Criar Ciclo

│

├── Escolher Questionário

├── Tipo
│      ├── Público
│      └── Fechado

├── Participantes

├── Datas

├── Recorrência

├── Lembretes

└── Confirmar
```

---

# Execução

```text
Ciclo

│

├── Resumo

├── Participação

├── Respostas (Agregadas)

├── IA

├── Insights

├── Relatório

└── Encerrar
```

---

# Respostas

```text
Respostas

│

├── Distribuição

├── Estatísticas

├── Categorias

├── Texto Livre

└── Exportação
```

⚠ Nunca existe uma tela de respostas individuais.

---

# Pipeline

```text
Responder Pesquisa

↓

Salvar Resposta

↓

Validação

↓

Anonimização

↓

Agrupamento

↓

Análise IA

↓

Resultados

↓

Dashboard

↓

Chat IA

↓

Relatório
```

---

# IA

```text
IA

│

├── Resumo

├── Categorias

├── Comparativos

├── Tendências

├── Chat

└── Insights
```

---

# Chat IA

```text
Chat

│

├── Conversas

├── Perguntas Rápidas

├── Histórico

├── Salvar Insight

└── Plano de Ação
```

---

# Relatórios

```text
Relatórios

│

├── Lista

├── Visualizar

├── PDF

├── Compartilhar

└── Histórico
```

---

# Billing

```text
Billing

│

├── Plano

├── Consumo

├── Cobranças

├── Histórico

└── Upgrade
```

---

# Configurações

```text
Configurações

│

├── Empresa

├── Usuários

├── Permissões

├── Branding

├── IA

├── Anonimização

├── Integrações

└── Auditoria
```

---

# Fluxo do Respondente

## Pesquisa Pública

```text
Link

↓

Consentimento LGPD

↓

Introdução

↓

Pergunta 1

↓

Pergunta 2

↓

...

↓

Revisão

↓

Enviar

↓

Obrigado
```

---

## Pesquisa Fechada

```text
Convite

↓

Abrir Pesquisa

↓

Responder

↓

Enviar

↓

Obrigado
```

---

# Fluxo Completo do Sistema

```text
Dashboard
      │
      ▼
Questionários
      │
      ▼
Criar Questionário
      │
      ▼
Cadastrar Perguntas
      │
      ▼
Publicar
      │
      ▼
Criar Ciclo
      │
      ▼
Receber Respostas
      │
      ▼
Anonimização
      │
      ▼
Análise IA
      │
      ▼
Dashboard Atualizado
      │
      ├──────────────► Chat IA
      │
      ├──────────────► Relatório
      │
      └──────────────► Plano de Ação
```
