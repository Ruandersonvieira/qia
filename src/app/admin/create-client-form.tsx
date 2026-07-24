"use client";
import { useActionState } from "react";
import { createClientWithOwner } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { InviteLinkBox } from "@/components/ui/invite-link-box";

export function CreateClientForm() {
  const [state, formAction, pending] = useActionState(createClientWithOwner, {});

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
          <FormError message={state.error} />
          <Button type="submit" disabled={pending} className="w-full">Criar client</Button>
        </form>
        {state.inviteUrl && <InviteLinkBox url={state.inviteUrl} />}
      </CardContent>
    </Card>
  );
}
