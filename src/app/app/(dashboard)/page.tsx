import { requireGestor } from "@/lib/auth/session";
import Link from "next/link";

export default async function AppHome() {
  const { user } = await requireGestor();
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Olá, {user.name}</h1>
      <p className="text-muted-foreground">
        Use o menu ao lado para gerenciar <Link className="underline" href="/app/questionarios">questionários</Link> e{" "}
        <Link className="underline" href="/app/categorias">categorias</Link>.
      </p>
    </div>
  );
}
