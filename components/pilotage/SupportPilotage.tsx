"use client";

// components/pilotage/SupportPilotage.tsx
//
// QUI ATTEND UNE RÉPONSE, ET DEPUIS COMBIEN DE TEMPS (Béné, 29 août).
//
// -- AUCUN CALCUL ICI --------------------------------------------------
//
// L'ordre de la file, le retard, les compteurs et la recherche viennent
// de `lib/support/tickets.ts` et `lib/pilotage/support.ts`, testés. Ce
// fichier affiche et envoie. Une règle enfermée dans un composant n'est
// pas testable, donc pas testée (règle du 1er août).
//
// -- LE PLUS LONG À ATTENDRE EST EN HAUT, EN TOUTES LETTRES ------------
//
// Un compteur de tickets ne dit pas s'il y a urgence : 12 demandes
// répondues dans l'heure et 1 qui attend depuis quatre jours donnent le
// même 13. Le bandeau nomme donc la PIRE attente, qui porte sur une
// personne réelle.
//
// -- ON RÉPOND ICI, ON NE RENVOIE PAS AILLEURS -------------------------
//
// La console pilote, elle n'édite pas : répondre à une demande de
// support n'est pas éditer un contenu, c'est le travail même de cet
// écran. Ce qui reste dans les app, c'est le contenu des clientes.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import {
  ETATS_FILTRE,
  FILTRE_VIDE,
  LIBELLE_ETAT,
  attenteLisible,
  facettes,
  filtrerFile,
  pireAttenteHeures,
  type EtatFiltre,
  type FiltreSupport,
} from "@/lib/pilotage/support";
import {
  DELAI_ALERTE_HEURES,
  estEnRetard,
  heuresDAttente,
  type Ticket,
  type TicketStatus,
} from "@/lib/support/tickets";
import { NOM_PRODUIT, PRODUITS_SUPPORT, nomProduit, type ProduitSupport } from "@/lib/support/produit";

// LE SERVEUR REND UNE RAISON, L'ÉCRAN REND LA PHRASE (règle du 3 août).
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

const TON_ETAT: Record<TicketStatus, string> = {
  open: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
  replied: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};

const NOM_ETAT: Record<TicketStatus, string> = {
  open: "En attente",
  replied: "Répondu",
  closed: "Clos",
};

function quand(iso: string): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(t));
}

interface Reponse {
  ok?: boolean;
  tickets?: Ticket[];
  tronque?: boolean;
  reason?: string;
}

export function SupportPilotage() {
  const [data, setData] = useState<Reponse | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ton: "ok" | "ko"; texte: string } | null>(null);
  const [filtre, setFiltre] = useState<FiltreSupport>(FILTRE_VIDE);
  // L'HORLOGE EST LUE APRÈS LE MONTAGE : un `new Date()` pendant le
  // rendu casse l'hydratation, le serveur et le navigateur n'étant
  // jamais à la même seconde.
  const [maintenant, setMaintenant] = useState<Date | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/support/tickets", { cache: "no-store" });
      setData((await res.json()) as Reponse);
    } catch {
      setData({ ok: false, reason: "write_failed" });
    } finally {
      setChargement(false);
      setMaintenant(new Date());
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const tickets = useMemo(() => data?.tickets ?? [], [data]);
  const horloge = maintenant ?? new Date(0);
  const vues = useMemo(
    () => (maintenant ? filtrerFile(tickets, filtre, maintenant) : []),
    [tickets, filtre, maintenant],
  );
  const f = useMemo(
    () => (maintenant ? facettes(tickets, filtre, maintenant) : null),
    [tickets, filtre, maintenant],
  );
  const pire = useMemo(
    () => (maintenant ? pireAttenteHeures(tickets, maintenant) : null),
    [tickets, maintenant],
  );

  async function envoyer(t: Ticket) {
    const reponse = (brouillons[t.id] ?? "").trim();
    if (!reponse) return;
    setEnCours(t.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, reponse }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) {
        setMessage({ ton: "ok", texte: `Réponse envoyée à ${t.email}.` });
        setBrouillons((b) => ({ ...b, [t.id]: "" }));
        await charger();
      } else {
        // UN ok:false PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN.
        setMessage({
          ton: "ko",
          texte: RAISONS[j.reason ?? ""] ?? "La réponse n'a pas pu partir.",
        });
      }
    } catch {
      setMessage({ ton: "ko", texte: "La connexion a échoué. Rien n'a été envoyé." });
    } finally {
      setEnCours(null);
    }
  }

  async function changerStatut(t: Ticket, status: TicketStatus) {
    setEnCours(t.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, status }),
      });
      const j = (await res.json()) as { ok?: boolean; reason?: string };
      if (j.ok) await charger();
      else {
        setMessage({
          ton: "ko",
          texte: RAISONS[j.reason ?? ""] ?? "Le changement n'a pas pu se faire.",
        });
      }
    } catch {
      setMessage({ ton: "ko", texte: "La connexion a échoué." });
    } finally {
      setEnCours(null);
    }
  }

  if (chargement && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toutes les demandes des trois app, celle qui attend depuis le plus longtemps en
            premier. Cet écran ne suit pas le filtre de période.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void charger()}
          disabled={chargement}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
        >
          {chargement ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Rafraîchir
        </button>
      </div>

      {!data?.ok && (
        // "Ce n'est pas parce que personne ne t'écrit" : une file vide
        // et une file illisible ne se ressemblent pas.
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            La file du support n&apos;a pas pu être lue. Ce n&apos;est pas parce que personne ne
            t&apos;écrit.
          </p>
          <p className="mt-1 text-sm text-destructive/90">
            {RAISONS[data?.reason ?? ""] ?? "Le serveur a refusé sans dire pourquoi."}
          </p>
        </section>
      )}

      {message && (
        <p
          className={`rounded-xl border p-3 text-sm ${
            message.ton === "ok"
              ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/40 bg-destructive/5 text-destructive"
          }`}
        >
          {message.texte}
        </p>
      )}

      {/* LA PIRE ATTENTE, EN HAUT. Un compteur de demandes ne dit pas
          s'il y a urgence ; le nombre de jours d'attente, si. */}
      {data?.ok && f && (
        <section className={`${CARTE} p-4`}>
          {pire === null ? (
            <p className="text-sm">
              <span className="font-medium">Personne n&apos;attend de réponse.</span>{" "}
              <span className="text-muted-foreground">
                {f.parEtat.tous} demande{f.parEtat.tous > 1 ? "s" : ""} au total.
              </span>
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              {pire >= DELAI_ALERTE_HEURES && (
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className="font-medium">
                {f.parEtat["a-traiter"]} demande{f.parEtat["a-traiter"] > 1 ? "s" : ""} sans
                réponse.
              </span>
              <span className="text-muted-foreground">
                La plus ancienne attend depuis {attenteLisible(pire)}.
              </span>
            </p>
          )}
        </section>
      )}

      {data?.ok && f && (
        <>
          {/* LES ONGLETS PORTENT LEUR NOMBRE, calculé avec les autres
              filtres actifs : un onglet qui annonce 12 en affiche 12. */}
          <div className="flex flex-wrap gap-2">
            {ETATS_FILTRE.map((e) => (
              <Puce
                key={e}
                actif={filtre.etat === e}
                onClick={() => setFiltre({ ...filtre, etat: e })}
                libelle={LIBELLE_ETAT[e]}
                nombre={f.parEtat[e]}
                alerte={e === "en-retard" && f.parEtat[e] > 0}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filtre.recherche}
                onChange={(e) => setFiltre({ ...filtre, recherche: e.target.value })}
                placeholder="Une adresse, un mot de la demande"
                aria-label="Chercher une demande"
                className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={filtre.produit ?? ""}
              onChange={(e) =>
                setFiltre({
                  ...filtre,
                  produit: (e.target.value || null) as ProduitSupport | null,
                })
              }
              aria-label="Filtrer par produit"
              className="rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <option value="">Tous les produits ({f.tousProduits})</option>
              {PRODUITS_SUPPORT.map((p) => (
                <option key={p} value={p}>
                  {NOM_PRODUIT[p]} ({f.parProduit[p]})
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {vues.length} affichée{vues.length > 1 ? "s" : ""}
            </span>
          </div>

          {vues.length === 0 ? (
            // LE VIDE PARLE : sans un mot, il se lit "c'est cassé".
            <section className={`${CARTE} p-6`}>
              <p className="text-sm font-medium">
                {filtre.etat === "a-traiter" && !filtre.recherche && !filtre.produit
                  ? "Personne n'attend de réponse."
                  : "Aucune demande ne correspond."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {filtre.etat === "a-traiter" && !filtre.recherche && !filtre.produit
                  ? "La file est à jour. Les demandes déjà traitées sont dans les autres onglets."
                  : "Essaie un autre mot, ou retire un filtre."}
              </p>
            </section>
          ) : (
            <ul className="space-y-3">
              {vues.map((t) => {
                const retard = estEnRetard(t, horloge);
                return (
                  <li
                    key={t.id}
                    className={`${CARTE} p-4 ${retard ? "border-destructive/50" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${TON_ETAT[t.status]}`}>
                        {NOM_ETAT[t.status]}
                      </span>
                      {/* DE QUEL PRODUIT ON PARLE : la file est commune
                          aux trois app, et "je n'ai pas reçu mes accès"
                          ne dit pas laquelle. */}
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {nomProduit(t.product)}
                      </span>
                      {retard && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          attend depuis {attenteLisible(heuresDAttente(t, horloge))}
                        </span>
                      )}
                      {/* D'UNE DEMANDE À LA FICHE : ses accès, ses
                          paiements, son affilié, en un clic. */}
                      <Link
                        href={`/pilotage/clients/${encodeURIComponent(t.email)}`}
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {t.name ? `${t.name} (${t.email})` : t.email}
                      </Link>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {quand(t.createdAt)}
                      </span>
                    </div>

                    {t.subject && <p className="mt-2 text-sm font-semibold">{t.subject}</p>}
                    <p className="mt-1 whitespace-pre-wrap text-sm">{t.message}</p>
                    {t.page && (
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        Depuis : {t.page}
                      </p>
                    )}

                    {t.adminReply && (
                      <div className="mt-3 rounded-lg bg-emerald-500/5 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ta réponse du {quand(t.repliedAt ?? "")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm">{t.adminReply}</p>
                      </div>
                    )}

                    <div className="mt-3 space-y-2">
                      <textarea
                        rows={3}
                        value={brouillons[t.id] ?? ""}
                        onChange={(e) =>
                          setBrouillons((b) => ({ ...b, [t.id]: e.target.value }))
                        }
                        placeholder={t.adminReply ? "Ajouter une réponse" : "Ta réponse"}
                        aria-label={`Répondre à ${t.email}`}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void envoyer(t)}
                          disabled={enCours === t.id || !(brouillons[t.id] ?? "").trim()}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                        >
                          {enCours === t.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Envoyer la réponse
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void changerStatut(t, t.status === "closed" ? "open" : "closed")
                          }
                          disabled={enCours === t.id}
                          className="rounded-lg border px-3 py-2 text-sm hover:bg-accent disabled:opacity-60"
                        >
                          {t.status === "closed" ? "Rouvrir" : "Clore sans répondre"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {data.tronque && (
            // UN TABLEAU COUPÉ EN SILENCE FAIT CROIRE QU'ON A TOUT VU.
            <p className="text-xs text-muted-foreground">
              La file s&apos;arrête aux 200 demandes les plus récentes.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Puce({
  actif,
  onClick,
  libelle,
  nombre,
  alerte,
}: {
  actif: boolean;
  onClick: () => void;
  libelle: string;
  nombre: number;
  alerte?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={[
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        actif
          ? "border-primary bg-primary/10 text-primary"
          : alerte
            ? "border-destructive/50 text-destructive hover:bg-destructive/5"
            : "hover:bg-accent",
      ].join(" ")}
    >
      {libelle} <span className="tabular-nums opacity-70">{nombre}</span>
    </button>
  );
}
