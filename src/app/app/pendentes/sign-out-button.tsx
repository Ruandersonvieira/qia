"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function onSignOut() {
    await authClient.signOut();
    router.push("/app/login");
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full gap-1.5 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      onClick={onSignOut}
    >
      <LogOut className="size-4" />
      Sair
    </Button>
  );
}
