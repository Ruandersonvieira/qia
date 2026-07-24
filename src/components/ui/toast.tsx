"use client";

import { Toast } from "@base-ui/react/toast";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toastManager } from "@/lib/toast";

function ToastViewport({ className, ...props }: Toast.Viewport.Props) {
  return (
    <Toast.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed inset-x-4 bottom-4 z-100 mx-auto flex w-full max-w-sm flex-col gap-2 outline-none sm:inset-x-auto sm:right-4",
        className
      )}
      {...props}
    />
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      data-slot="toast"
      className={cn(
        "relative flex items-start gap-3 rounded-lg border bg-popover p-4 pr-8 text-sm text-popover-foreground shadow-lg transition-all",
        "data-[type=error]:border-red-300 data-[type=success]:border-emerald-300",
        "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0"
      )}
    >
      <Toast.Content data-slot="toast-content" className="flex-1 space-y-0.5">
        <Toast.Title data-slot="toast-title" className="font-medium" />
        <Toast.Description data-slot="toast-description" className="text-muted-foreground" />
      </Toast.Content>
      <Toast.Close
        data-slot="toast-close"
        className="absolute top-3 right-3 rounded-sm opacity-70 transition-opacity outline-none hover:opacity-100"
      >
        <XIcon className="size-3.5" />
      </Toast.Close>
    </Toast.Root>
  ));
}

export function Toaster({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager}>
      {children}
      <Toast.Portal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
