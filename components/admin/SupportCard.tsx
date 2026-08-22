"use client";

// components/admin/SupportCard.tsx
//
// LA FILE DU SUPPORT : QUI ATTEND, DEPUIS QUAND, ET QUOI RÉPONDRE.
//
// -- AUCUN CALCUL ICI --------------------------------------------------
//
// L'ordre de la file, le retard et le résumé viennent de
// `lib/support/tickets.ts`, testés. Ce fichier affiche et envoie.
//
// -- CE QUI ATTEND LE PLUS LONGTEMPS PASSE DEVANT ----------------------
//
// Trier du plus récent au plus ancien enterrerait justement ceux qu'on a
// déjà fait attendre. C'est le tri qui décide si une cliente est
// oubliée, pas la bonne volonté du matin.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DELAI_ALERTE_HEURES,
  estEnRetard,
  heuresDAttente,
  type ResumeFile,
  type Ticket,
  type TicketStatus,
} from "@/lib/support/tickets";

const ETATS: Record<TicketStatus, { label: string; classe: string }> = {
  open: { label: "En attente", classe: "bg-amber-100 text-amber-900" },
  replied: { label: "Répondu", classe: "bg-emerald-100 text-emerald-800" },
  closed: { label: "Clos", classe: "bg-muted text-muted-foreground" },
};

const RAISONS: Record<string, string> = {
  forbidden: "Ton compte n'est pas reconnu comme administrateur.",
  table_absente:
    "La table des demandes n'existe pas encore. Applique la migration 20260822_support_tickets.sql sur Supabase.",
  introuvable: "Cette demande n'existe plus.",
  email_failed:
    "L'email n'est pas parti, donc rien n'a été enregistré : elle n'a pas reçu ta réponse. Réessaie.",
  envoye_mais_non_enregistre:
    "Ta réponse est PARTIE mais n'a pas pu être enregistrée. Ne réponds pas deux fois : elle l'a reçue.",
  write_failed: "Le changement n'a pas pu être enregistré.",
};

interface Reponse {
  ok?: boolean;
  tickets?: Ticket[];
  resume?: ResumeFile;
  tronque?: boolean;
  reason?: string;
}

function quand(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

/** Depuis combien de temps elle attend, écrit pour un humain. */
function attente(t: Ticket, maintenant: Date): string {
  const h = heuresDAttente(t, maintenant);
  if (h < 1) return "il y a moins d'une heure";
  if (h < 24) return `il y a ${Math.floor(h)} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} jour${j > 1 ? "s" : ""}`;
}

/**
 * La file, ou celle d'UNE personne.
 *
 * `email` est un PARAMÈTRE : la fiche client affiche exactement le même
 * composant, filtré. Deux implémentations d'une file de tickets
 * finiraient par se contredire.
 */
export default function SupportCard({ email }: { email?: string }) {
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const [maintenant, setMaintenant] = useState<Date | null>(null);

  const url = email
    ? `/api/admin/support/tickets?email=${encodeURIComponent(email)}`
    : "/api/admin/support/tickets";

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      setData((await res.json()) as Reponse);
    } catch {
      setData({ ok: false, reason: "write_failed" });
    } finally {
      setChargement(false);
      // L'HORLOGE EST LUE APRES LE MONTAGE, jamais pendant le rendu :
      // le serveur et le navigateur ne sont pas a la meme seconde, et
      // un `new Date()` dans le rendu casse l'hydratation.
      setMaintenant(new Date());
    }
  }, [url]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function repondre(t: Ticket) {
    const reponse = (brouillons[t.id] ?? "").trim();
    if (!reponse) return;
    setEnCours(t.id);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, reponse }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) {
        toast.success(`Réponse envoyée à ${t.email}.`);
        setBrouillons((b) => ({ ...b, [t.id]: "" }));
        await charger();
      } else {
        toast.error(RAISONS[j.reason ?? ""] ?? "La réponse n'a pas pu partir.");
      }
    } catch {
      toast.error("La connexion a échoué. Rien n'a été envoyé.");
    } finally {
      setEnCours(null);
    }
  }

  async function changerStatut(t: Ticket, status: TicketStatus) {
    setEnCours(t.id);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, status }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) await charger();
      else toast.error(RAISONS[j.reason ?? ""] ?? "Le changement n'a pas pu se faire.");
    } catch {
      toast.error("La connexion a échoué.");
    } finally {
      setEnCours(null);
    }
  }

  if (chargement && !data) {
    return (
      <div className="py-10 text-center">
        <Loader2 className="mx-auto size-5 animate-spin" />
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <Card className="border-rose-300 bg-rose-50">
        <CardContent className="py-3">
          <p className="text-sm font-bold text-rose-900">
            La file du support n&apos;a pas pu être lue. Ce n&apos;est pas parce que personne ne
            t&apos;écrit.
          </p>
          <p className="mt-1 text-xs text-rose-900">
            {RAISONS[data?.reason ?? ""] ?? "Le serveur a refusé sans dire pourquoi."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const tickets = data.tickets ?? [];
  const r = data.resume;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <MessageSquare className="size-4 shrink-0 text-primary" />
        <h2 className="flex-1 text-sm font-semibold">
          {email ? "Ses demandes de support" : "Demandes de support"}
        </h2>
        {r && r.enRetard > 0 && (
          <Badge variant="destructive" className="text-xs">
            {r.enRetard} attend{r.enRetard > 1 ? "ent" : ""} depuis plus de {DELAI_ALERTE_HEURES} h
          </Badge>
        )}
        {r && (
          <span className="text-xs text-muted-foreground">
            {r.ouverts} en attente · {r.repondus} répondues · {r.clos} closes
          </span>
        )}
        <Button variant="outline" size="sm" onClick={() => void charger()} disabled={chargement}>
          {chargement ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Rafraîchir
        </Button>
      </div>

      {tickets.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {email ? "Elle n'a jamais écrit au support." : "Personne n'attend de réponse."}
        </p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => {
            const retard = maintenant ? estEnRetard(t, maintenant) : false;
            return (
              <li
                key={t.id}
                className={`rounded-lg border p-4 ${retard ? "border-rose-300 bg-rose-50" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${ETATS[t.status].classe} border-0`}>
                    {ETATS[t.status].label}
                  </Badge>
                  {retard && <AlertTriangle className="size-4 text-destructive" />}
                  {/* D'UN TICKET A LA FICHE : tout ce qu'on sait d'elle,
                      ses acces et ses paiements, en un clic. C'est ce
                      que Bene demandait en liant le compte au support. */}
                  {!email && (
                    <Link
                      href={`/admin/clients/${encodeURIComponent(t.email)}`}
                      className="text-sm font-semibold text-primary underline"
                    >
                      {t.name ? `${t.name} - ${t.email}` : t.email}
                    </Link>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {quand(t.createdAt)}
                    {maintenant && ` · ${attente(t, maintenant)}`}
                  </span>
                </div>

                {t.subject && <p className="mt-2 font-semibold">{t.subject}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm">{t.message}</p>
                {t.page && (
                  <p className="mt-1 break-all text-xs text-muted-foreground">Depuis : {t.page}</p>
                )}

                {t.adminReply && (
                  <div className="mt-3 rounded-md border-l-2 border-emerald-500 bg-emerald-50/50 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="size-3.5" /> Ta réponse du {quand(t.repliedAt ?? "")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{t.adminReply}</p>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  <textarea
                    rows={3}
                    value={brouillons[t.id] ?? ""}
                    onChange={(e) => setBrouillons((b) => ({ ...b, [t.id]: e.target.value }))}
                    placeholder={t.adminReply ? "Ajouter une réponse" : "Ta réponse"}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void repondre(t)}
                      disabled={enCours === t.id || !(brouillons[t.id] ?? "").trim()}
                    >
                      {enCours === t.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Envoyer la réponse
                    </Button>
                    {t.status !== "closed" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void changerStatut(t, "closed")}
                        disabled={enCours === t.id}
                      >
                        Clore
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void changerStatut(t, "open")}
                        disabled={enCours === t.id}
                      >
                        Rouvrir
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data.tronque && (
        <p className="text-xs text-amber-700">
          La liste s&apos;arrête aux 200 demandes les plus récentes.
        </p>
      )}
    </div>
  );
}
