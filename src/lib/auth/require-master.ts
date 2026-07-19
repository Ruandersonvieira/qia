import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { MASTER_COOKIE, verifyMasterToken } from "./master-session";
import { db } from "@/db/client";
import { masterUsers } from "@/db/schema";

export async function requireMaster() {
  const token = (await cookies()).get(MASTER_COOKIE)?.value;
  const masterId = token ? await verifyMasterToken(token) : null;
  if (!masterId) redirect("/admin/login");
  const master = await db.query.masterUsers.findFirst({ where: eq(masterUsers.id, masterId) });
  if (!master || master.status !== "active") redirect("/admin/login");
  return master;
}
