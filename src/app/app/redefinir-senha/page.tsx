"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { display } from "@/lib/fonts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

function RedefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error404 = searchParams.get("error") === "INVALID_TOKEN";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) setError(error.message ?? "Não foi possível redefinir a senha.");
    else router.push("/app/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F6F5] px-6 py-12">
      <div className="w-full max-w-sm">
        <span className={`${display.className} text-xl font-bold tracking-tight text-[#0E2A32]`}>
          qia<span className="text-[#FFC940]">.</span>
        </span>
        <h1 className={`${display.className} mt-6 text-3xl font-bold tracking-tight text-[#0E2A32]`}>
          Redefinir senha
        </h1>

        {!token || error404 ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Link inválido ou expirado. Peça um novo link em &quot;Esqueci minha senha&quot;.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className="h-11 pr-9"
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore="true"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showNewPassword}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 z-10 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  className="h-11 pr-9"
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore="true"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showConfirmPassword}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 z-10 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormError message={mismatch ? "As senhas não coincidem" : undefined} />
            </div>
            <FormError message={error ?? undefined} icon />
            <Button
              type="submit"
              disabled={pending || mismatch}
              className="h-11 w-full rounded-full bg-[#FFC940] text-base font-semibold text-[#0E2A32] transition-transform hover:-translate-y-0.5 hover:bg-[#FFD25C] disabled:translate-y-0 disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Salvar nova senha"}
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
