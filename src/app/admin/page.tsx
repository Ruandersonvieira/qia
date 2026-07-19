import { requireMaster } from "@/lib/auth/require-master";
import { db } from "@/db/client";
import { CreateClientForm } from "./create-client-form";

export default async function AdminPage() {
  await requireMaster();
  const allClients = await db.query.clients.findMany({ orderBy: (c, { desc }) => [desc(c.createdAt)] });
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Admin — Clients</h1>
      <CreateClientForm />
      <ul className="space-y-2">
        {allClients.map((c) => (
          <li key={c.id} className="rounded border p-3">
            <span className="font-medium">{c.name}</span> <span className="text-sm text-muted-foreground">({c.slug}) — {c.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
