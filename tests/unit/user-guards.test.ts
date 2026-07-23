import { describe, expect, it } from "vitest";
import { ASSIGNABLE_ROLES, canManageUser, isAssignableRole, type UserRef } from "@/lib/users/guards";

const actor: UserRef = { id: "a1", clientId: "c1", role: "admin", status: "active" };
const target: UserRef = { id: "u1", clientId: "c1", role: "manager", status: "active" };

describe("isAssignableRole", () => {
  it("aceita admin, manager e respondent", () => {
    for (const role of ASSIGNABLE_ROLES) expect(isAssignableRole(role)).toBe(true);
  });

  it("recusa owner e valores desconhecidos", () => {
    expect(isAssignableRole("owner")).toBe(false);
    expect(isAssignableRole("root")).toBe(false);
  });
});

describe("canManageUser", () => {
  it("permite admin ativo gerenciar manager do mesmo tenant", () => {
    expect(canManageUser(actor, target, "update").ok).toBe(true);
  });

  it("permite owner ativo gerenciar admin do mesmo tenant", () => {
    const owner: UserRef = { ...actor, id: "o1", role: "owner" };
    expect(canManageUser(owner, { ...target, role: "admin" }, "update").ok).toBe(true);
  });

  it("recusa ator manager ou respondent", () => {
    expect(canManageUser({ ...actor, role: "manager" }, target, "update").ok).toBe(false);
    expect(canManageUser({ ...actor, role: "respondent" }, target, "update").ok).toBe(false);
  });

  it("recusa ator inativo ou convidado", () => {
    expect(canManageUser({ ...actor, status: "inactive" }, target, "update").ok).toBe(false);
    expect(canManageUser({ ...actor, status: "invited" }, target, "update").ok).toBe(false);
  });

  it("recusa alvo de outro tenant", () => {
    expect(canManageUser(actor, { ...target, clientId: "c2" }, "update").ok).toBe(false);
  });

  it("recusa alvo owner em qualquer operação", () => {
    const ownerTarget: UserRef = { ...target, role: "owner" };
    for (const op of ["update", "deactivate", "reactivate", "resendInvite"] as const) {
      expect(canManageUser(actor, ownerTarget, op).ok).toBe(false);
    }
  });

  it("recusa auto-gestão", () => {
    expect(canManageUser(actor, { ...target, id: actor.id }, "update").ok).toBe(false);
    expect(canManageUser(actor, { ...target, id: actor.id }, "deactivate").ok).toBe(false);
  });

  it("deactivate exige alvo active", () => {
    expect(canManageUser(actor, target, "deactivate").ok).toBe(true);
    expect(canManageUser(actor, { ...target, status: "invited" }, "deactivate").ok).toBe(false);
    expect(canManageUser(actor, { ...target, status: "inactive" }, "deactivate").ok).toBe(false);
  });

  it("reactivate exige alvo inactive", () => {
    expect(canManageUser(actor, { ...target, status: "inactive" }, "reactivate").ok).toBe(true);
    expect(canManageUser(actor, target, "reactivate").ok).toBe(false);
  });

  it("resendInvite exige alvo invited", () => {
    expect(canManageUser(actor, { ...target, status: "invited" }, "resendInvite").ok).toBe(true);
    expect(canManageUser(actor, target, "resendInvite").ok).toBe(false);
  });
});
