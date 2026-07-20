import { requireGestor } from "@/lib/auth/session";
import Link from "next/link";

export default async function AppHome() {
  const { user } = await requireGestor();
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Olá, {user.name}</h1>
      <nav className="flex gap-4">
        <Link className="underline" href="/app/questionarios">Questionários</Link>
        <Link className="underline" href="/app/categorias">Categorias</Link>
      </nav>
    </div>
  );
}
