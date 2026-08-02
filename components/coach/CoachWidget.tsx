"use client";

// components/coach/CoachWidget.tsx
//
// Le coach, en bas à droite, sur toutes les pages de l'app (demande Béné,
// 2 août 2026 : "comme pour l'atelier et tipote, en bas à droite, sur
// toutes les pages").
//
// Il ne contient AUCUNE intelligence : il affiche un fil et envoie les
// messages à /api/me/coach, qui les transmet au coach de l'Atelier. Le
// cerveau, la base de connaissances et la conversation vivent là-bas, ce
// qui fait qu'un élève retrouve dans l'Atelier ce qu'il a demandé ici.
//
// Jamais sur les pages publiques : le widget est monté dans le layout
// authentifié, pas dans le viewer de quiz.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageCircle, X, Send, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };
type Upsell = { need: string; url: string };

/** Où se trouve l'utilisateur, pour que le coach ne demande pas. */
function screenLabel(pathname: string): string {
  if (pathname.startsWith("/quiz/new")) return "choix du type de quiz";
  if (pathname.includes("/analytics")) return "statistiques d'un quiz";
  if (pathname.startsWith("/quiz/")) return "éditeur de quiz";
  if (pathname.startsWith("/survey/")) return "éditeur de sondage";
  if (pathname.startsWith("/quizzes")) return "liste de ses projets";
  if (pathname.startsWith("/leads")) return "ses contacts captés";
  if (pathname.startsWith("/stats")) return "statistiques globales";
  if (pathname.startsWith("/settings")) return "réglages";
  return "tableau de bord";
}

export function CoachWidget() {
  const t = useTranslations("coach");
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [upsell, setUpsell] = useState<Upsell | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Historique chargé à la PREMIÈRE ouverture seulement : inutile de
  // solliciter le pont sur chaque page pour un panneau fermé.
  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    void (async () => {
      try {
        const res = await fetch("/api/me/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historyOnly: true }),
        });
        const json = await res.json().catch(() => null);
        if (json?.ok && Array.isArray(json.messages)) setMessages(json.messages as Msg[]);
      } catch {
        // Historique indisponible : on démarre sur un fil vide, ce qui
        // reste utilisable. Pas de message d'erreur pour ça.
      }
    })();
  }, [open, loaded]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, sending]);

  async function send() {
    const message = draft.trim();
    if (!message || sending) return;
    setDraft("");
    setError(null);
    setUpsell(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setSending(true);
    try {
      const res = await fetch("/api/me/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context: screenLabel(pathname) }),
      });
      const json = await res.json().catch(() => null);

      // Quota épuisé : ce n'est pas une erreur, c'est une porte. Le
      // serveur a déjà choisi laquelle selon ce qui bloque la personne.
      if (json?.reason === "quota") {
        setError(t("quotaReached"));
        if (json.upsell) setUpsell(json.upsell as Upsell);
        return;
      }
      if (!json?.ok || typeof json.reply !== "string") {
        setError(t("failed"));
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply as string }]);
      if (json.upsell) setUpsell(json.upsell as Upsell);
    } catch {
      setError(t("failed"));
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="truncate text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t("close")}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {t("welcome")}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                : "mr-auto max-w-[90%] whitespace-pre-line rounded-2xl bg-muted px-3 py-2 text-sm"
            }
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("thinking")}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {upsell && (
          <a
            href={upsell.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {upsell.need === "technique" ? t("upsellPlan") : t("upsellAtelier")}
          </a>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={t("placeholder")}
          className="min-h-[44px] flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Button size="icon" onClick={() => void send()} disabled={sending || !draft.trim()} aria-label={t("send")}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
