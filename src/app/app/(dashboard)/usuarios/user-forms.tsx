"use client";
import { useActionState, useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import {
  deactivateUser,
  inviteUser,
  reactivateUser,
  resendInvite,
  updateUser,
} from "./actions";
import { ASSIGNABLE_ROLES } from "@/lib/users/guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { FormError } from "@/components/ui/form-error";
import { InviteLinkBox } from "@/components/ui/invite-link-box";
import { useActionToast } from "@/lib/toast";
import { ROLE_LABELS } from "./status";

function RoleSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? "manager"}
      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
    >
      {ASSIGNABLE_ROLES.map((role) => (
        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
      ))}
    </select>
  );
}

export function InviteUserForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(inviteUser, { ok: false });

  useActionToast(state, state.inviteUrl ? "Convite criado." : undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-1.5">
            <UserPlus className="size-4" />
            Convidar usuário
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
        </DialogHeader>
        {state.inviteUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Convite criado. Copie o link e envie pra pessoa.
            </p>
            <InviteLinkBox url={state.inviteUrl} />
            <Button type="button" className="w-full" onClick={() => setOpen(false)}>
              Concluir
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nome</Label>
              <Input id="invite-name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Papel</Label>
              <RoleSelect name="role" />
            </div>
            <FormError message={state.error} />
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline">Cancelar</Button>} />
              <Button type="submit" disabled={pending}>
                Convidar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type RowUser = { id: string; name: string; role: string; status: string };

export function UserRowActions({ user }: { user: RowUser }) {
  const [deactState, deactAction, deactivating] = useActionState(deactivateUser, { ok: false });
  const [reactState, reactAction, reactivating] = useActionState(reactivateUser, { ok: false });
  const [resendState, resendAction, resending] = useActionState(resendInvite, { ok: false });

  useActionToast(deactState, "Usuário desativado.");
  useActionToast(reactState, "Usuário reativado.");
  useActionToast(resendState, resendState.inviteUrl ? "Convite reenviado." : undefined);

  const error = deactState.error ?? reactState.error ?? resendState.error;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <FormDialog
          trigger={
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Pencil className="size-3.5" />
              Editar
            </Button>
          }
          title="Editar usuário"
          action={updateUser}
          successMessage="Usuário atualizado."
        >
          <input type="hidden" name="id" value={user.id} />
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input id="edit-name" name="name" defaultValue={user.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Papel</Label>
            <RoleSelect name="role" defaultValue={user.role} />
          </div>
        </FormDialog>
        {user.status === "active" && (
          <form action={deactAction}>
            <input type="hidden" name="id" value={user.id} />
            <Button type="submit" size="sm" variant="outline" disabled={deactivating}>
              Desativar
            </Button>
          </form>
        )}
        {user.status === "inactive" && (
          <form action={reactAction}>
            <input type="hidden" name="id" value={user.id} />
            <Button type="submit" size="sm" variant="outline" disabled={reactivating}>
              Reativar
            </Button>
          </form>
        )}
        {user.status === "invited" && (
          <form action={resendAction}>
            <input type="hidden" name="id" value={user.id} />
            <Button type="submit" size="sm" variant="outline" disabled={resending}>
              Reenviar convite
            </Button>
          </form>
        )}
      </div>
      <FormError message={error} />
      {resendState.inviteUrl && <InviteLinkBox url={resendState.inviteUrl} />}
    </div>
  );
}
