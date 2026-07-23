"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type ActionResult, useActionToast } from "@/lib/toast";

export type { ActionResult };

export function FormDialog({
  trigger,
  title,
  action,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  successMessage = "Salvo com sucesso.",
  children,
}: {
  trigger: React.ReactElement;
  title: string;
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  cancelLabel?: string;
  successMessage?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, { ok: false });

  useActionToast(state, successMessage);
  useEffect(() => {
    // Fecha o modal quando a action retorna sucesso — sincroniza com o
    // resultado da server action, não é estado derivado de props/state local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {children}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">{cancelLabel}</Button>} />
            <Button type="submit" disabled={pending}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
