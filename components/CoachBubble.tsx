"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoachMarkdown } from "@/components/CoachMarkdown";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function currentDayNumber(pathname: string): number | undefined {
  const m = pathname.match(/^\/jour\/(-?\d+)/);
  return m ? Number.parseInt(m[1], 10) : undefined;
}

export function CoachBubble() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // Jour du blocage en cours : arme le prochain message pour le loguer en
  // feedback (le bouton "Un blocage ?" ouvre le coach dans ce mode).
  const [blocageDay, setBlocageDay] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    fetch("/api/coach")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages)) {
          setMessages(d.messages.map((m: Msg) => ({ role: m.role, content: m.content })));
        }
      })
      .catch(() => {});
  }, [open, loaded]);

  // Ouverture pilotee (bouton "Un blocage ?") : on ouvre le coach, on arme
  // le mode blocage sur le jour, et on donne le focus a la saisie.
  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { dayNumber?: number; blocage?: boolean }
        | undefined;
      setOpen(true);
      if (detail?.blocage) {
        setBlocageDay(typeof detail.dayNumber === "number" ? detail.dayNumber : null);
      }
      setTimeout(() => inputRef.current?.focus(), 120);
    }
    window.addEventListener("coach:open", onOpen as EventListener);
    return () => window.removeEventListener("coach:open", onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open, sending]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    const isBlocage = blocageDay != null;
    if (isBlocage) setBlocageDay(null); // consomme : un seul message logue
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          dayNumber: isBlocage ? blocageDay : currentDayNumber(pathname),
          blocage: isBlocage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      let reply: string;
      if (res.status === 503) reply = "Le coach n'est pas encore activé. Reviens un peu plus tard.";
      else if (res.status === 429) reply = "Tu as beaucoup échangé avec moi aujourd'hui. On se retrouve demain, ou pose la question dans la communauté.";
      else if (!res.ok || !data.reply) reply = "Désolée, je n'ai pas réussi à répondre. Réessaie dans un instant.";
      else reply = data.reply;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Petite coupure réseau. Réessaie." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer le coach" : "Ouvrir le coach"}
        className="fixed bottom-4 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card-hover transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {/* Panneau */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[32rem] max-h-[calc(100vh-7rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-card-hover">
          <header className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Ton coach</span>
              <span className="text-xs text-muted-foreground">Dispo quand tu bloques</span>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Salut, je suis là si tu bloques sur la mission du jour, ton angle, ta cible... Pose-moi ta question.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-surface-soft text-foreground",
                )}
              >
                {m.role === "assistant" ? <CoachMarkdown content={m.content} /> : m.content}
              </div>
            ))}
            {sending && (
              <div className="mr-auto rounded-2xl bg-surface-soft px-3 py-2 text-sm text-muted-foreground">
                Je réfléchis...
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={blocageDay != null ? "Décris ce qui te bloque..." : "Écris ta question..."}
              className="h-10 flex-1 rounded-full border border-input bg-transparent px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Envoyer"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
