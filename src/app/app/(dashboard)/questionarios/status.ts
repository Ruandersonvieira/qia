export const USE_CASE_LABELS: Record<string, string> = {
  clima: "Clima",
  nr1: "NR-1",
  market_research: "Pesquisa de mercado",
  nps: "NPS",
  other: "Outro",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

export const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  active: "default",
  archived: "outline",
};
