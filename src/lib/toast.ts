import { useEffect } from "react";
import { Toast } from "@base-ui/react/toast";

export const toastManager = Toast.createToastManager();

export function notifySuccess(title: string) {
  toastManager.add({ title, type: "success" });
}

export function notifyError(title: string) {
  toastManager.add({ title, type: "error" });
}

export type ActionResult = { ok: boolean; error?: string };

/** Dispara toast de sucesso/erro sempre que o resultado de uma server action mudar. */
export function useActionToast(state: ActionResult, successMessage?: string) {
  useEffect(() => {
    if (state.ok) {
      if (successMessage) notifySuccess(successMessage);
    } else if (state.error) {
      notifyError(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
