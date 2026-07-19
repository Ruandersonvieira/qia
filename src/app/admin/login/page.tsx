"use client";
import { useActionState } from "react";
import { masterLogin } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(masterLogin, {});
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Admin — Login master</CardTitle></CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
