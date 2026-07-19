import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export async function requireGestor() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/app/login");
  const user = await db.query.users.findFirst({
    where: eq(users.authUserId, session.user.id),
  });
  if (!user || user.status !== "active" || (user.role !== "owner" && user.role !== "admin")) {
    redirect("/app/login");
  }
  return { clientId: user.clientId, user };
}
