"use server";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { clients, users } from "@/db/schema";
import { requireMaster } from "@/lib/auth/require-master";

export async function createClientWithOwner(
  _prev: { error?: string; inviteUrl?: string },
  formData: FormData
): Promise<{ error?: string; inviteUrl?: string }> {
  await requireMaster();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  if (!name || !/^[a-z0-9-]{2,}$/.test(slug) || !ownerName || !ownerEmail) {
    return { error: "Preencha nome, slug (a-z0-9-), nome e email do owner" };
  }
  const inviteToken = nanoid(32);
  try {
    await db.transaction(async (tx) => {
      const [client] = await tx.insert(clients).values({ name, slug }).returning();
      await tx.insert(users).values({
        clientId: client.id,
        name: ownerName,
        email: ownerEmail,
        role: "owner",
        status: "invited",
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    });
  } catch {
    return { error: "Slug já existe ou dados inválidos" };
  }
  revalidatePath("/admin");
  return { inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/convite/${inviteToken}` };
}
