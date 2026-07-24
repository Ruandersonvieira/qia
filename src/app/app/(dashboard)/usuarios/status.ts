export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Administrador",
  manager: "Gestor",
  respondent: "Respondente",
};

export const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  invited: { label: "Convidado", variant: "secondary" },
  inactive: { label: "Inativo", variant: "outline" },
};
