"use client";
import { useActionState, useState } from "react";
import { createClientWithOwner } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateClientForm() {
  const [state, formAction, pending] = useActionState(createClientWithOwner, {});
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!state.inviteUrl) return;
    await navigator.clipboard.writeText(state.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="w-full">
      <CardHeader><CardTitle>Novo client</CardTitle></CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" placeholder="a-z0-9-" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerName">Nome do owner</Label>
            <Input id="ownerName" name="ownerName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Email do owner</Label>
            <Input id="ownerEmail" name="ownerEmail" type="email" required />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">Criar client</Button>
        </form>
        {state.inviteUrl && (
          <div className="mt-4 space-y-2 rounded border p-3">
            <p className="text-sm text-muted-foreground">Link de convite:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto text-sm">{state.inviteUrl}</code>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
