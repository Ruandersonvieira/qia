"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, FileText, Home, LogOut, RefreshCw, Settings, Sparkles, Tags, Users } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Início", icon: Home, exact: true },
  { href: "/app/questionarios", label: "Questionários", icon: FileText },
  { href: "/app/categorias", label: "Categorias", icon: Tags },
  { href: "/app/ciclos", label: "Ciclos", icon: RefreshCw },
  { href: "/app/assistente", label: "Assistente IA", icon: Sparkles },
  { href: "/app/billing", label: "Billing", icon: CreditCard, adminOnly: true },
  { href: "/app/usuarios", label: "Usuários", icon: Users, adminOnly: true },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
];

export function AppSidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = userRole === "owner" || userRole === "admin";
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);

  async function onSignOut() {
    await authClient.signOut();
    router.push("/app/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-5">
        <Link href="/app" className="font-heading text-lg font-bold tracking-tight">
          qia<span className="text-sidebar-primary">.</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {visibleItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-sidebar-border p-4">
        <p className="truncate text-sm text-sidebar-foreground/60" title={userName}>{userName}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={onSignOut}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
