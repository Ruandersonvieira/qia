"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { display } from "@/lib/fonts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RATING = [1, 2, 3, 4, 5];

// Mapeia o motivo mandado por requireGestor/requireAdmin (src/lib/auth/session.ts)
// pra mensagem legível — qualquer requireX novo que negue acesso já cai aqui,
// sem precisar mexer nesta página de novo.
const DENIED_MESSAGES: Record<string, string> = {
  "no-membership": "Essa conta não está vinculada a nenhuma empresa. Fale com quem te convidou.",
  inactive: "Sua conta está inativa. Fale com um administrador da sua empresa.",
  "insufficient-role": "Sua conta não tem permissão para acessar essa área.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied");
  const [error, setError] = useState<string | null>(denied ? DENIED_MESSAGES[denied] ?? null : null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Sessão do Better Auth continua válida mesmo quando o server barra o
    // acesso ao dashboard — sem isso, tentar entrar de novo com a mesma
    // conta pareceria "não fazer nada" outra vez.
    if (denied) authClient.signOut();
  }, [denied]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) setError("Credenciais inválidas");
    else router.push("/app");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between bg-[#0E2A32] px-6 py-8 text-[#F3F6F5] lg:px-14 lg:py-14">
        <div className="flex items-center justify-between">
          <span className={`${display.className} text-xl font-bold tracking-tight`}>
            qia<span className="text-[#FFC940]">.</span>
          </span>
          <Link
            href="/"
            className="text-sm font-medium text-[#F3F6F5]/70 transition-colors hover:text-[#F3F6F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC940]"
          >
            ← Site
          </Link>
        </div>

        <div className="mt-10 lg:mt-0">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#FFC940]">
            Escuta organizacional com IA
          </p>
          <h1
            className={`${display.className} mt-4 max-w-sm text-2xl font-bold leading-[1.15] tracking-tight lg:text-3xl`}
          >
            Sua equipe responde. A IA entrega o plano de ação.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#F3F6F5]/70">
            Acesse seus questionários, ciclos e relatórios de clima.
          </p>
        </div>

        <div className="hidden lg:block">
          <div className="lp-rise -rotate-1 rounded-2xl bg-white p-5 text-[#0E2A32] shadow-lg [animation-delay:0.2s]">
            <div className="flex items-center justify-between text-xs font-medium text-[#46626B]">
              <span>Ciclo aberto · 47 respostas</span>
              <span className="rounded-full bg-[#F3F6F5] px-2.5 py-1">anônimo</span>
            </div>
            <p className="mt-3 text-sm font-medium leading-6">
              “Consigo falar abertamente com minha liderança sobre problemas do
              dia a dia.”
            </p>
            <div className="mt-4 flex gap-2">
              {RATING.map((n) => (
                <span
                  key={n}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
                    n === 4
                      ? "bg-[#FFC940] text-[#0E2A32]"
                      : "bg-[#F3F6F5] text-[#46626B]"
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-4 text-xs text-[#F3F6F5]/50">
            Nomes são mascarados antes da análise. Sempre.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#F3F6F5] px-6 py-12 lg:bg-white">
        <div className="w-full max-w-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#46626B]">
            Acesso da equipe
          </p>
          <h2 className={`${display.className} mt-2 text-3xl font-bold tracking-tight text-[#0E2A32]`}>
            Entrar
          </h2>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="h-11" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="/app/login/esqueci-senha"
                  className="text-sm font-medium text-[#46626B] transition-colors hover:text-[#0E2A32]"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="h-11 pr-9"
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 z-10 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-full bg-[#FFC940] text-base font-semibold text-[#0E2A32] transition-transform hover:-translate-y-0.5 hover:bg-[#FFD25C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E2A32] disabled:translate-y-0 disabled:opacity-60"
            >
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-[#46626B] transition-colors hover:text-[#0E2A32]"
          >
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
