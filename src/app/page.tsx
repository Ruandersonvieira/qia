import type { Metadata } from "next";
import Link from "next/link";
import { display } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "QIA — pesquisas de clima com análise de IA",
  description:
    "Monte questionários de clima, riscos psicossociais e NPS, colete respostas anônimas por link ou QR code e receba um relatório com scores e recomendações práticas gerado por IA.",
};

const DEMO_MAILTO =
  "mailto:ruanderson.vieira@gmail.com?subject=Quero%20uma%20demo%20da%20QIA&body=Ol%C3%A1!%20Quero%20ver%20a%20QIA%20funcionando.%0A%0ANome%3A%0AEmpresa%3A%0ATamanho%20da%20equipe%3A";

const categoryScores = [
  { name: "Clima", score: 7.8, width: "78%", delay: "0.5s" },
  { name: "Comunicação", score: 6.1, width: "61%", delay: "0.7s" },
  { name: "Reconhecimento", score: 5.4, width: "54%", delay: "0.9s" },
];

const steps = [
  {
    number: "1",
    title: "Monte o questionário",
    text: "Crie perguntas por categoria — Clima, Riscos Psicossociais, Satisfação, NPS ou as suas próprias — e diga à IA qual o objetivo de análise de cada uma.",
  },
  {
    number: "2",
    title: "Abra um ciclo público",
    text: "Compartilhe por link ou QR code. Ninguém precisa criar conta para responder, respostas duplicadas são bloqueadas e o ciclo fecha por prazo ou por limite de respostas.",
  },
  {
    number: "3",
    title: "Feche e receba o relatório",
    text: "Ao fechar o ciclo, a IA analisa as respostas por categoria e entrega scores, gráficos e recomendações práticas — nomes mascarados antes da análise.",
  },
];

const features = [
  {
    title: "Anonimato de verdade",
    text: "Nomes citados nas respostas são mascarados antes da análise, e texto livre só entra no relatório quando há um número mínimo de respondentes.",
  },
  {
    title: "Relatório que aponta caminho",
    text: "Em vez de uma planilha de médias, você recebe um resumo do ciclo, score por categoria e recomendações do que fazer a seguir.",
  },
  {
    title: "Zero fricção para responder",
    text: "Um link ou QR code, sem cadastro e sem app. Quanto mais fácil responder, mais respostas — e mais confiável a análise.",
  },
  {
    title: "Categorias sob medida",
    text: "Comece com as categorias padrão ou crie as suas. Cada pergunta carrega seu objetivo de análise, e o relatório se organiza do seu jeito.",
  },
];

function DemoButton({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={DEMO_MAILTO}
      className="inline-flex h-12 items-center justify-center rounded-full bg-[#FFC940] px-7 text-base font-semibold text-[#0E2A32] transition-transform hover:-translate-y-0.5 hover:bg-[#FFD25C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E2A32]"
    >
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-[#F3F6F5] text-[#0E2A32]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className={`${display.className} text-2xl font-bold tracking-tight`}>
          qia<span className="text-[#FFC940]">.</span>
        </span>
        <nav className="flex items-center gap-3">
          <Link
            href="/app/login"
            className="inline-flex h-11 items-center rounded-full px-5 text-sm font-medium text-[#0E2A32] transition-colors hover:bg-[#0E2A32]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E2A32]"
          >
            Entrar
          </Link>
          <a
            href={DEMO_MAILTO}
            className="inline-flex h-11 items-center rounded-full bg-[#0E2A32] px-5 text-sm font-medium text-[#F3F6F5] transition-colors hover:bg-[#16404D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E2A32]"
          >
            Solicitar demo
          </a>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="lp-rise">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#46626B]">
              Escuta organizacional com análise de IA
            </p>
            <h1
              className={`${display.className} mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]`}
            >
              Sua equipe responde.
              <br />
              A IA entrega o <span className="lp-marker">plano de ação</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#46626B]">
              Monte questionários de clima, riscos psicossociais e NPS,
              compartilhe um link ou QR code e, ao fechar o ciclo, receba um
              relatório com scores por categoria e recomendações práticas — sem
              planilha, sem semanas de consultoria.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <DemoButton>Solicitar demo</DemoButton>
              <Link
                href="/app/login"
                className="inline-flex h-12 items-center rounded-full border border-[#0E2A32]/20 px-7 text-base font-medium transition-colors hover:border-[#0E2A32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E2A32]"
              >
                Entrar na minha conta
              </Link>
            </div>
            <p className="mt-6 max-w-md text-sm leading-6 text-[#46626B]">
              Anonimato garantido: nomes são mascarados e respostas abertas só
              entram na análise com um número mínimo de respondentes.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
            <div className="lp-rise -rotate-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 [animation-delay:0.15s]">
              <div className="flex items-center justify-between text-xs font-medium text-[#46626B]">
                <span>Ciclo aberto · 47 respostas</span>
                <span className="rounded-full bg-[#F3F6F5] px-2.5 py-1">
                  anônimo
                </span>
              </div>
              <p className="mt-3 text-sm font-medium leading-6">
                “Consigo falar abertamente com minha liderança sobre problemas
                do dia a dia.”
              </p>
              <div className="mt-4 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
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

            <div className="lp-rise mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 [animation-delay:0.35s]">
              <p className="text-xs font-medium uppercase tracking-wide text-[#46626B]">
                Score por categoria
              </p>
              <div className="mt-3 space-y-3">
                {categoryScores.map((c) => (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[#46626B]">{c.score}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#F3F6F5]">
                      <div
                        className="lp-bar h-2 rounded-full bg-[#0E2A32]"
                        style={{ width: c.width, animationDelay: c.delay }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-rise mt-4 rotate-1 rounded-2xl bg-[#0E2A32] p-5 text-[#F3F6F5] shadow-md [animation-delay:0.55s]">
              <p className="text-xs font-medium uppercase tracking-wide text-[#FFC940]">
                Recomendação da análise
              </p>
              <p className="mt-2 text-sm leading-6">
                Reconhecimento é a categoria mais frágil (5.4). Comece com um
                ritual quinzenal de feedback entre líderes e equipe e meça de
                novo no próximo ciclo.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-[#0E2A32]/10 bg-white">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <h2
              className={`${display.className} max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl`}
            >
              Do questionário ao relatório em três passos
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number}>
                  <span
                    className={`${display.className} flex h-10 w-10 items-center justify-center rounded-full bg-[#FFC940] text-lg font-bold`}
                  >
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#46626B]">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2
            className={`${display.className} max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl`}
          >
            Feito para quem precisa ouvir a equipe — e agir
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-black/5"
              >
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#46626B]">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="rounded-3xl bg-[#0E2A32] px-8 py-14 text-center text-[#F3F6F5] sm:px-14">
            <h2
              className={`${display.className} mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl`}
            >
              Veja a QIA funcionando com um ciclo de verdade
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#F3F6F5]/70">
              Mostramos o fluxo completo: questionário, link público, respostas
              e o relatório gerado pela IA.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <DemoButton>Solicitar demo</DemoButton>
              <Link
                href="/app/login"
                className="inline-flex h-12 items-center rounded-full border border-[#F3F6F5]/30 px-7 text-base font-medium text-[#F3F6F5] transition-colors hover:border-[#F3F6F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC940]"
              >
                Já sou cliente
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0E2A32]/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-[#46626B]">
          <span className={`${display.className} text-lg font-bold text-[#0E2A32]`}>
            qia<span className="text-[#FFC940]">.</span>
          </span>
          <span>© 2026 QIA. Escuta organizacional com análise de IA.</span>
        </div>
      </footer>
    </div>
  );
}
