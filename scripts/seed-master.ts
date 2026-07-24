import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { masterUsers } from "../src/db/schema";

async function main() {
  const email = process.env.MASTER_EMAIL;
  const password = process.env.MASTER_PASSWORD;
  if (!email || !password) throw new Error("Defina MASTER_EMAIL e MASTER_PASSWORD");
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await db.query.masterUsers.findFirst({ where: eq(masterUsers.email, email) });
  if (existing) {
    await db.update(masterUsers).set({ passwordHash }).where(eq(masterUsers.id, existing.id));
    console.log("Master atualizado:", email);
  } else {
    await db.insert(masterUsers).values({ name: "Master", email, passwordHash });
    console.log("Master criado:", email);
  }
  process.exit(0);
}
main();
