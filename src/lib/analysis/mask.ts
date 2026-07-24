const CAP = "[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúçü]+";
const CONN = "(?:da|de|do|das|dos|e)";
const NAME_RE = new RegExp(`\\b${CAP}(?:\\s+(?:${CONN}\\s+)?${CAP})+\\b`, "g");

/** Heurística pt-BR: sequências de 2+ palavras capitalizadas (com conectivos) viram [NOME]. */
export function maskNames(text: string): string {
  return text.replace(NAME_RE, "[NOME]");
}
