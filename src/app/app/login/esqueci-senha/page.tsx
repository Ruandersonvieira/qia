"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";
import { display } from "@/lib/fonts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/app/redefinir-senha",
    });
    setPending(false);
    if (error) setError("Não foi possível enviar o email. Tente novamente.");
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F6F5] px-6 py-12">
      <div className="w-full max-w-sm">
        <span className={`${display.className} text-xl font-bold tracking-tight text-[#0E2A32]`}>
          qia<span className="text-[#FFC940]">.</span>
        </span>
        <h1 className={`${display.className} mt-6 text-3xl font-bold tracking-tight text-[#0E2A32]`}>
          Esqueci minha senha
        </h1>

        {sent ? (
          <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Se esse email existir na nossa base, enviamos um link para redefinir a senha.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <FormError message={error ?? undefined} icon />
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-full bg-[#FFC940] text-base font-semibold text-[#0E2A32] transition-transform hover:-translate-y-0.5 hover:bg-[#FFD25C] disabled:translate-y-0 disabled:opacity-60"
            >
              {pending ? "Enviando…" : "Enviar link de redefinição"}
            </Button>
          </form>
        )}

        <Link
          href="/app/login"
          className="mt-6 inline-block text-sm font-medium text-[#46626B] transition-colors hover:text-[#0E2A32]"
        >
          ← Voltar para o login
        </Link>
      </div>
    </div>
  );
}
