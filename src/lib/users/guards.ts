export const ASSIGNABLE_ROLES = ["admin", "manager", "respondent"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export type UserRole = "owner" | "admin" | "manager" | "respondent";
export type UserStatus = "active" | "invited" | "inactive";

export type UserRef = {
  id: string;
  clientId: string;
  role: UserRole;
  status: UserStatus;
};

export type UserOperation = "update" | "deactivate" | "reactivate" | "resendInvite";

export function isAssignableRole(role: string): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

const requiredTargetStatus: Partial<Record<UserOperation, UserStatus>> = {
  deactivate: "active",
  reactivate: "inactive",
  resendInvite: "invited",
};

export function canManageUser(
  actor: UserRef,
  target: UserRef,
  op: UserOperation,
): { ok: boolean; reason?: string } {
  if (actor.status !== "active" || (actor.role !== "owner" && actor.role !== "admin")) {
    return { ok: false, reason: "ator sem permissão" };
  }
  if (actor.clientId !== target.clientId) return { ok: false, reason: "tenant diferente" };
  if (target.role === "owner") return { ok: false, reason: "owner é intocável" };
  if (actor.id === target.id) return { ok: false, reason: "auto-gestão não permitida" };
  const required = requiredTargetStatus[op];
  if (required && target.status !== required) {
    return { ok: false, reason: `operação exige alvo ${required}` };
  }
  return { ok: true };
}
