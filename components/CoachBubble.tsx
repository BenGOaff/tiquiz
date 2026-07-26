"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// Suggestions de depart, adaptees au jour en cours. 3 a 4 max, tapables.
// Elles amorcent l'echange sans effort de saisie. Repli generique hors jour.
const DAY_SUGGESTIONS: Record<number, string[]> = {
  0: ["Aide-moi à décrire ma niche en une phrase", "Comment bien démarrer le parcours ?"],
  1: [
    "Aide-moi à écrire ma transformation",
    "Je bloque sur mes profils de résultats",
    "Trouve les mots exacts de ma cible",
  ],
  2: [
    "Explique-moi la clé API Systeme.io simplement",
    "Aide-moi à écrire mon email de bienvenue",
  ],
  3: [
    "Aide-moi à trouver mon titre de quiz",
    "Un résultat dont on est fier, comment faire ?",
  ],
  4: ["Relis ma page de fin", "Ma capture est-elle bien placée ?"],
  5: [
    "Donne-moi des idées de diffusion gratuite",
    "Aide-moi à écrire mon premier post",
  ],
  6: ["Quelle communauté choisir pour ma cible ?", "Écris mon message d'accueil"],
  7: ["Aide-moi à lire mes chiffres", "Quel est mon point de fuite le plus probable ?"],
};

const GENERIC_SUGGESTIONS = [
  "Aide-moi à écrire mon résultat 1",
  "Je bloque sur ma cible",
  "Relis ma dernière réponse",
];

function suggestionsFor(day: number | undefined): string[] {
  const base = day != null ? DAY_SUGGESTIONS[day] : undefined;
  const list = base ?? GENERIC_SUGGESTIONS;
  // Sur une page jour, on ajoute toujours "Relis ma réponse du jour".
  if (day != null && !list.some((s) => s.toLowerCase().includes("relis"))) {
    return [...list, "Relis ma réponse du jour"].slice(0, 4);
  }
  return list.slice(0, 4);
}

// Delai avant le nudge doux : l'eleve est sur une page jour depuis un moment
// sans avoir sauvegardé de réponse ni ouvert le coach. Non intrusif, 1 fois/jour.
const NUDGE_DELAY_MS = 60_000;

function nudgeStorageKey(day: number): string {
  const today = new Date().toISOString().slice(0, 10);
  return `coach-nudge-j${day}-${today}`;
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
  // Nudge proactif : one-liner discret au-dessus du bouton flottant.
  const [nudge, setNudge] = useState<{ day: number; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Nudge proactif, fiable et discret : sur une page /jour/N, si l'eleve reste
  // sans sauvegarder ni ouvrir le coach pendant NUDGE_DELAY_MS, on propose UNE
  // ligne d'aide (1 fois par jour et par module, jamais de spam). Toute activite
  // (sauvegarde de reponse via l'evenement "coach:activity") rearme le timer.
  useEffect(() => {
    const day = currentDayNumber(pathname);
    setNudge(null);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (day == null || open) return;

    let alreadyShown = false;
    try {
      alreadyShown = window.localStorage.getItem(nudgeStorageKey(day)) === "1";
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;

    function arm() {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => {
        if (day == null) return;
        setNudge({
          day,
          text: `Tu cales sur le Jour ${day} ? Je peux te débloquer en une réponse.`,
        });
      }, NUDGE_DELAY_MS);
    }

    function onActivity() {
      // L'eleve avance (il vient de sauvegarder) : on repousse le nudge.
      setNudge(null);
      arm();
    }

    arm();
    window.addEventListener("coach:activity", onActivity);
    return () => {
      window.removeEventListener("coach:activity", onActivity);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  }, [pathname, open]);

  function dismissNudge() {
    if (nudge) {
      try {
        window.localStorage.setItem(nudgeStorageKey(nudge.day), "1");
      } catch {
        // stockage indisponible : tant pis, on ne renudge pas cette session.
      }
    }
    setNudge(null);
  }

  const submitMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
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
        if (res.status === 503)
          reply = "Le coach n'est pas encore activé. Reviens un peu plus tard.";
        else if (res.status === 429)
          reply =
            "Tu as beaucoup échangé avec moi aujourd'hui. On se retrouve demain, ou pose la question dans la communauté.";
        else if (!res.ok || !data.reply)
          reply = "Désolée, je n'ai pas réussi à répondre. Réessaie dans un instant.";
        else reply = data.reply;
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
      } catch {
        setMessages((m) => [...m, { role: "assistant", content: "Petite coupure réseau. Réessaie." }]);
      } finally {
        setSending(false);
      }
    },
    [sending, blocageDay, pathname],
  );

  function send(e: React.FormEvent) {
    e.preventDefault();
    void submitMessage(input);
  }

  const suggestions = suggestionsFor(currentDayNumber(pathname));

  return (
    <>
      {/* Nudge proactif discret, au-dessus du bouton (jamais quand le coach est ouvert). */}
      {nudge && !open && (
        <div className="fixed bottom-20 right-4 z-40 flex max-w-[16rem] items-start gap-2 rounded-2xl border border-primary/30 bg-background px-3 py-2.5 shadow-card-hover">
          <button
            type="button"
            onClick={() => {
              dismissNudge();
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 120);
            }}
            className="flex-1 text-left text-sm text-foreground"
          >
            <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              Ton coach
            </span>
            {nudge.text}
          </button>
          <button
            type="button"
            onClick={dismissNudge}
            aria-label="Masquer"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => {
          setNudge(null);
          setOpen((o) => !o);
        }}
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
                Salut, je suis là si tu bloques sur la mission du jour, ton angle, ta cible... Pose-moi ta question, ou choisis ci-dessous.
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
            {sending && <TypingIndicator />}
          </div>

          {/* Suggestions tapables quand la conversation est vide (ou presque). */}
          {!sending && messages.length === 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border px-3 pb-1 pt-3">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void submitMessage(s)}
                  className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

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

/** Indicateur d'ecriture anime (trois points), plus vivant qu'un texte fixe. */
function TypingIndicator() {
  return (
    <div className="mr-auto flex items-center gap-2 rounded-2xl bg-surface-soft px-3 py-2.5 text-sm text-muted-foreground">
      <span className="flex items-center gap-1" aria-hidden>
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current" />
      </span>
      <span>Ton coach écrit</span>
    </div>
  );
}
