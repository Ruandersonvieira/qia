"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { masterLogin } from "./actions";
import { display } from "@/lib/fonts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(masterLogin, {});
  const [showPassword, setShowPassword] = useState(false);

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

        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#FFC940]">
            Admin
          </p>
          <h1
            className={`${display.className} mt-4 max-w-sm text-2xl font-bold leading-[1.15] tracking-tight lg:text-3xl`}
          >
            Acesso restrito à equipe interna.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#F3F6F5]/70">
            Login master para operação e suporte da plataforma QIA.
          </p>
        </div>

        <div className="hidden text-xs text-[#F3F6F5]/40 lg:block">
          Acessos são registrados para auditoria.
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#F3F6F5] px-6 py-12 lg:bg-white">
        <div className="w-full max-w-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#46626B]">
            Login master
          </p>
          <h2 className={`${display.className} mt-2 text-3xl font-bold tracking-tight text-[#0E2A32]`}>
            Entrar
          </h2>

          <form action={formAction} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
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

            {state.error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
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
