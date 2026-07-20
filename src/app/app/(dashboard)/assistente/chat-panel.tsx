"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendAssistantMessage } from "./actions";

type Message = { role: "user" | "assistant"; content: string };

export function ChatPanel({ cycleId, initialMessages }: { cycleId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || pending) return;
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setError(null);
    startTransition(async () => {
      const result = await sendAssistantMessage(cycleId, content);
      if (result.ok) setMessages((m) => [...m, { role: "assistant", content: result.reply }]);
      else setError(result.error);
    });
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-lg border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pergunte sobre os resultados deste ciclo — ex.: “qual categoria precisa de mais atenção?”
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending && <p className="text-sm text-muted-foreground animate-pulse">Assistente escrevendo…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Escreva sua pergunta…"
          rows={2}
          className="resize-none"
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
