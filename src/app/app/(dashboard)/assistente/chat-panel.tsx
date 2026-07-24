"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, Bot, MessageCircle, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendAssistantMessage } from "./actions";

type Message = { role: "user" | "assistant"; content: string };

function Avatar({ role }: { role: Message["role"] }) {
  const isUser = role === "user";
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
      )}
    >
      {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
    </span>
  );
}

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
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="size-7 text-muted-foreground" />
            <p className="max-w-xs text-sm text-muted-foreground">
              Pergunte sobre os resultados deste ciclo — ex.: “qual categoria precisa de mais atenção?”
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex items-end gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <Avatar role={m.role} />
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
        {pending && (
          <div className="flex items-end gap-2">
            <Avatar role="assistant" />
            <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}
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
        <Button type="submit" disabled={pending || !input.trim()} className="gap-1.5 self-end">
          <Send className="size-4" />
          Enviar
        </Button>
      </form>
    </div>
  );
}
