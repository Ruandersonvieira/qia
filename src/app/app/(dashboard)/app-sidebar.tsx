"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Início", exact: true },
  { href: "/app/questionarios", label: "Questionários" },
  { href: "/app/categorias", label: "Categorias" },
  { href: "/app/assistente", label: "Assistente IA" },
];

export function AppSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function onSignOut() {
    await authClient.signOut();
    router.push("/app/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-5">
        <Link href="/app" className="text-lg font-bold">qia</Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-sidebar-border p-4">
        <p className="truncate text-sm text-muted-foreground" title={userName}>{userName}</p>
        <Button variant="outline" size="sm" className="w-full" onClick={onSignOut}>
          Sair
        </Button>
      </div>
    </aside>
  );
}
