import "dotenv/config";
import { isNull, and, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { categories } from "../src/db/schema";

const GLOBALS = [
  { name: "Clima", description: "Percepção geral do ambiente de trabalho" },
  { name: "Riscos Psicossociais", description: "Fatores de risco à saúde mental no trabalho (NR-1)" },
  { name: "Satisfação", description: "Satisfação com processos, liderança e condições" },
  { name: "NPS", description: "Lealdade e recomendação" },
  { name: "Demografia", description: "Recortes demográficos (sujeitos à regra de anonimato)" },
];

async function main() {
  for (const g of GLOBALS) {
    const exists = await db.query.categories.findFirst({
      where: and(isNull(categories.clientId), eq(categories.name, g.name)),
    });
    if (!exists) await db.insert(categories).values(g);
  }
  console.log("Categorias globais ok");
  process.exit(0);
}
main();
