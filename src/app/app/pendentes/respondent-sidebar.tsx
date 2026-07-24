import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

export function RespondentSidebar({ userName }: { userName: string }) {
  return (
    <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-5">
        <Link href="/app/pendentes" className="font-heading text-lg font-bold tracking-tight">
          qia<span className="text-sidebar-primary">.</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        <span className="flex items-center gap-2.5 rounded-md bg-sidebar-primary px-3 py-2 text-sm font-medium text-sidebar-primary-foreground">
          <ClipboardList className="size-4 shrink-0" />
          Questionários
        </span>
      </nav>
      <div className="space-y-2 border-t border-sidebar-border p-4">
        <p className="truncate text-sm text-sidebar-foreground/60" title={userName}>{userName}</p>
        <SignOutButton />
      </div>
    </aside>
  );
}
