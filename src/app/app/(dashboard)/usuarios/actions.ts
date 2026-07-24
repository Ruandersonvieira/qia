"use server";
import { revalidatePath } from "next/cache";
import { and, count, eq, ilike, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireGestor } from "@/lib/auth/session";
import { canManageUser, isAssignableRole, type UserOperation } from "@/lib/users/guards";
import type { ActionResult } from "@/lib/toast";
import { PAGE_SIZE, type PagedResult } from "../_components/paged-result";

const GENERIC_DENIED = "Operação não permitida";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function inviteUrlFor(token: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/convite/${token}`;
}

export async function listUsers(params: { q?: string; role?: string; status?: string; page?: number } = {}) {
  const { clientId } = await requireGestor();
  const page = params.page && params.page >= 1 ? params.page : 1;
  const where = and(
    eq(users.clientId, clientId),
    params.role ? eq(users.role, params.role as (typeof users.role.enumValues)[number]) : undefined,
    params.status ? eq(users.status, params.status as (typeof users.status.enumValues)[number]) : undefined,
    params.q ? or(ilike(users.name, `%${params.q}%`), ilike(users.email, `%${params.q}%`)) : undefined
  );

  const [data, [{ value: total }]] = await Promise.all([
    db.query.users.findMany({
      where,
      orderBy: (u, { asc }) => [asc(u.name)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ value: count() }).from(users).where(where),
  ]);

  return { data, total } satisfies PagedResult<(typeof data)[number]>;
}

async function loadTarget(clientId: string, id: string) {
  return db.query.users.findFirst({ where: and(eq(users.id, id), eq(users.clientId, clientId)) });
}

export async function inviteUser(
  _prev: ActionResult & { inviteUrl?: string },
  formData: FormData,
): Promise<ActionResult & { inviteUrl?: string }> {
  const { clientId } = await requireGestor();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Preencha nome e email válidos" };
  if (!isAssignableRole(role)) return { ok: false, error: GENERIC_DENIED };

  const inviteToken = nanoid(32);
  try {
    await db.insert(users).values({
      clientId,
      name,
      email,
      role,
      status: "invited",
      inviteToken,
      inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });
  } catch {
    return { ok: false, error: "Já existe usuário com este email" };
  }
  revalidatePath("/app/usuarios");
  return { ok: true, inviteUrl: inviteUrlFor(inviteToken) };
}

async function guardedTarget(id: string, op: UserOperation) {
  const { clientId, user: actor } = await requireGestor();
  const target = await loadTarget(clientId, id);
  if (!target || !canManageUser(actor, target, op).ok) return null;
  return target;
}

export async function updateUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  if (!name) return { ok: false, error: "Nome é obrigatório" };
  if (!isAssignableRole(role)) return { ok: false, error: GENERIC_DENIED };

  const target = await guardedTarget(id, "update");
  if (!target) return { ok: false, error: GENERIC_DENIED };

  await db.update(users).set({ name, role, updatedAt: new Date() }).where(eq(users.id, target.id));
  revalidatePath("/app/usuarios");
  return { ok: true };
}

export async function deactivateUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const target = await guardedTarget(String(formData.get("id") ?? ""), "deactivate");
  if (!target) return { ok: false, error: GENERIC_DENIED };

  await db.update(users).set({ status: "inactive", updatedAt: new Date() }).where(eq(users.id, target.id));
  revalidatePath("/app/usuarios");
  return { ok: true };
}

export async function reactivateUser(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const target = await guardedTarget(String(formData.get("id") ?? ""), "reactivate");
  if (!target) return { ok: false, error: GENERIC_DENIED };

  await db.update(users).set({ status: "active", updatedAt: new Date() }).where(eq(users.id, target.id));
  revalidatePath("/app/usuarios");
  return { ok: true };
}

export async function resendInvite(
  _prev: ActionResult & { inviteUrl?: string },
  formData: FormData,
): Promise<ActionResult & { inviteUrl?: string }> {
  const target = await guardedTarget(String(formData.get("id") ?? ""), "resendInvite");
  if (!target) return { ok: false, error: GENERIC_DENIED };

  const inviteToken = nanoid(32);
  await db
    .update(users)
    .set({ inviteToken, inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS), updatedAt: new Date() })
    .where(eq(users.id, target.id));
  revalidatePath("/app/usuarios");
  return { ok: true, inviteUrl: inviteUrlFor(inviteToken) };
}
