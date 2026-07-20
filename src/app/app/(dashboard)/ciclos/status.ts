export const CYCLE_STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  open: "Aberto",
  closed: "Fechado",
  processing: "Analisando...",
  analyzed: "Analisado",
};

export const CYCLE_STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  scheduled: "outline",
  open: "default",
  closed: "secondary",
  processing: "secondary",
  analyzed: "outline",
};

export const TREND_ICON: Record<string, string> = { up: "↑", stable: "↔", down: "↓" };

export function scoreColorClass(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function formatPeriod(startsAt: Date, endsAt: Date | null): string {
  const start = dateFormatter.format(startsAt);
  if (!endsAt) return `desde ${start}`;
  return `${start} a ${dateFormatter.format(endsAt)}`;
}
