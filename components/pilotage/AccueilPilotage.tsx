"use client";

// components/pilotage/AccueilPilotage.tsx
//
// L'APERÇU GÉNÉRAL, SANS BLABLA (Béné, 29 août 2026).
//
// -- L'ORDRE DE LA PAGE N'EST PAS DÉCORATIF ---------------------------
//
// 1. Les chiffres du moment.
// 2. CE QUI DEMANDE UNE ACTION. Règle 4 du plan : une alerte qu'il faut
//    aller chercher n'est pas une alerte. C'est comme ça qu'une vente
//    encaissée sans compte en face est restée invisible.
// 3. Le graphique, un seul.
// 4. Ce qui vient de se passer : contacts, ventes, tickets.
//
// -- UN SEUL APPEL POUR LES CHIFFRES, ET C'EST VOULU ------------------
//
// `/api/admin/pilotage` rend les personnes, les totaux, les ventes
// orphelines et la série du graphique. Trois appels voudraient dire
// trois états de chargement et un écran capable d'afficher des comptes
// SANS leurs ventes pendant une seconde : sur un tableau de bord
// d'argent, une seconde de chiffre faux est une seconde de trop.
//
// Les tickets viennent d'un deuxième appel, à part : la file de support
// peut être indisponible (table absente) sans que ça prive Béné du
// reste, et l'inverse serait absurde.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { GraphiqueEncaisse } from "@/components/pilotage/GraphiqueEncaisse";
import { parDateDesc } from "@/lib/pilotage/recents";
import type { SerieEmpilee } from "@/lib/pilotage/serieEmpilee";
import { CARTE } from "@/components/pilotage/carte";
import { trierAlertes, GENRE_VENTE_ORPHELINE } from "@/lib/pilotage/alertes";
import type { Person, PeopleTotals } from "@/lib/admin/people";
import type { Sale } from "@/lib/checkout/sales";
import { DELAI_ALERTE_HEURES, estEnRetard, type Ticket } from "@/lib/support/tickets";
import { attenteLisible, pireAttenteHeures } from "@/lib/pilotage/support";
import { nomProduitVendu } from "@/lib/admin/saleProduct";

type Resume = {
  encaisseCents: number;
  rembourseCents: number;
  ventes: number;
  nouveauxComptes: number;
  departs: number;
  serie: SerieEmpilee;
  contacts: Person[];
  dernieresVentes: { vente: Sale; email: string; nom: string | null }[];
  sansMontant: number;
};

type Donnees = {
  people: Person[];
  totals: PeopleTotals;
  ventesOrphelines: Sale[];
  resume: Resume;
  periode: { libelle: string; tronquee: boolean; depuis: string };
  alertesTraitees?: string[];
  atelier: { reachable: boolean; reason: string | null };
};

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function quandLong(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "à une date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(t));
}

function quand(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(t));
}

export function AccueilPilotage() {
  const params = useSearchParams();
  const query = params?.toString() ?? "";
  const [d, setD] = useState<Donnees | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/pilotage${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const j = await res.json();
      // UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN.
      if (!j?.ok) {
        setErreur("Les chiffres n'ont pas pu être lus. Rien n'est affiché plutôt qu'un total faux.");
        setD(null);
      } else {
        setD(j as Donnees);
      }
    } catch {
      setErreur("Les chiffres n'ont pas pu être lus.");
      setD(null);
    } finally {
      setChargement(false);
    }
    // La file de support à part : son indisponibilité ne doit pas priver
    // du reste de l'écran.
    try {
      const res = await fetch("/api/admin/support/tickets", { cache: "no-store" });
      const j = await res.json();
      setTickets(j?.ok ? ((j.tickets as Ticket[]) ?? []) : null);
    } catch {
      setTickets(null);
    }
  }, [query]);

  const traiter = useCallback(
    async (reference: string, traite: boolean) => {
      const url = "/api/admin/pilotage/traiter";
      try {
        const res = traite
          ? await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ genre: GENRE_VENTE_ORPHELINE, reference }),
            })
          : await fetch(
              `${url}?genre=${GENRE_VENTE_ORPHELINE}&reference=${encodeURIComponent(reference)}`,
              { method: "DELETE" },
            );
        const j = await res.json();
        // UN REFUS PRODUIT TOUJOURS QUELQUE CHOSE À L'ÉCRAN : sans ça,
        // il est indiscernable d'un clic qui n'a pas pris.
        if (!j?.ok) {
          setErreur(
            j?.reason === "table_absente"
              ? "La migration 20260829_alertes_traitees n'est pas encore appliquée sur Supabase."
              : "L'alerte n'a pas pu être marquée.",
          );
          return;
        }
        setErreur(null);
        await charger();
      } catch {
        setErreur("L'alerte n'a pas pu être marquée.");
      }
    },
    [charger],
  );

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement && !d) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // TOUT VIENT DU RÉSUMÉ, donc de la même période. Refiltrer ici
  // rouvrirait la porte à un écran dont le haut et le bas ne parlent pas
  // du même intervalle.
  const contacts = d?.resume.contacts ?? [];
  const ventes = d?.resume.dernieresVentes ?? [];
  const ticketsRecents = tickets ? parDateDesc(tickets, (t) => t.createdAt).slice(0, 6) : [];
  const ouverts = (tickets ?? []).filter((t) => t.status === "open").length;
  // CE QUI DEMANDE UNE ACTION REMONTE SUR L'ACCUEIL. Un nombre de
  // tickets ouverts ne dit pas s'il y a urgence ; une personne qui
  // attend depuis quatre jours, si.
  const horlogeTickets = tickets ? new Date() : null;
  const enRetard =
    tickets && horlogeTickets
      ? tickets.filter((t) => estEnRetard(t, horlogeTickets)).length
      : 0;
  const pireAttente =
    tickets && horlogeTickets ? pireAttenteHeures(tickets, horlogeTickets) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Accueil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {d ? d.periode.libelle : "Qu'est-ce qui demande mon attention aujourd'hui ?"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void charger()}
          disabled={chargement}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin" : ""}`} />
          Rafraîchir
        </button>
      </div>

      {/* ON DIT QUAND LA PÉRIODE DÉPASSE CE QU'ON A. Le journal des
          encaissements n'existe que depuis le 7 août 2026 : un total
          tronqué qui ne le dit pas fait prendre des décisions sur un
          chiffre faux. */}
      {d?.periode.tronquee && (
        <p className="rounded-lg border border-border/60 bg-card px-4 py-2 text-xs text-muted-foreground">
          Les encaissements ne sont enregistrés chez nous que depuis le{" "}
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
            new Date(`${d.periode.depuis}T00:00:00Z`),
          )}
          . Avant cette date, les ventes vivent uniquement dans Systeme.io.
        </p>
      )}

      {erreur && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {d && (
        <>
          {/* 1. LES CHIFFRES DU MOMENT. Quatre, pas douze : une rangée
              qu'on lit d'un coup d'oeil vaut mieux qu'un mur de cartes. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* LE MÊME CHIFFRE QUE LE GRAPHIQUE, pas un deuxième calcul.
                Béné : "encaissé sur la période : quelle période ?" La
                question est juste. Le titre nomme donc les mois
                RÉELLEMENT lus, et la valeur sort de la série qui les
                dessine : deux totaux calculés séparément finissent
                toujours par se contredire, et c'est celui du haut
                qu'on croit. */}
            {/* CHAQUE CHIFFRE MENE LA OU ON PEUT AGIR DESSUS. Un
                chiffre sans suite se regarde ; ceux-ci se travaillent,
                et chercher la bonne section dans le menu a chaque fois
                est exactement ce qui fait qu'on ne le fait pas. */}
            <Chiffre
              titre="Encaissé"
              valeur={euros(d.resume.encaisseCents)}
              note={
                d.resume.rembourseCents > 0
                  ? `${euros(d.resume.rembourseCents)} remboursés`
                  : `${d.resume.ventes} vente${d.resume.ventes > 1 ? "s" : ""}`
              }
              href="/pilotage/ventes"
            />
            <Chiffre
              titre="Nouveaux comptes"
              valeur={String(d.resume.nouveauxComptes)}
              note={d.resume.departs > 0 ? `${d.resume.departs} départ${d.resume.departs > 1 ? "s" : ""}` : undefined}
              href="/pilotage/clients"
            />
            <Chiffre
              titre="Abonnés"
              valeur={String(d.totals.abonnes)}
              note="en ce moment"
              href="/pilotage/business"
            />
            <Chiffre
              titre="Tickets ouverts"
              valeur={tickets === null ? "-" : String(ouverts)}
              note={
                tickets === null
                  ? "file illisible"
                  : pireAttente !== null
                    ? `la plus ancienne : ${attenteLisible(pireAttente)}`
                    : undefined
              }
              href="/pilotage/support"
            />
          </div>

          {/* 2. CE QUI DEMANDE UNE ACTION, tout de suite après. */}
          <Alertes
            ventesOrphelines={d.ventesOrphelines}
            traitees={new Set(d.alertesTraitees ?? [])}
            onTraiter={traiter}
            atelier={d.atelier}
            sansMontant={d.resume.sansMontant}
            ticketsEnRetard={enRetard}
            pireAttenteHeures={pireAttente}
          />

          {/* 3. LE graphique. */}
          <GraphiqueEncaisse serie={d.resume.serie} />

          {/* 4. Ce qui vient de se passer. */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Liste titre="Derniers contacts" href="/pilotage/clients" vide="Personne de nouveau.">
              {contacts.map((p) => (
                <Ligne
                  key={p.email}
                  principal={p.name ?? p.email}
                  secondaire={p.name ? p.email : p.plan}
                  aDroite={quand(p.createdAt)}
                />
              ))}
            </Liste>

            <Liste titre="Dernières ventes" href="/pilotage/ventes" vide="Aucune vente lue.">
              {ventes.map(({ vente, email, nom }) => (
                <Ligne
                  key={`${vente.ref}-${vente.paidAt}`}
                  principal={`${euros(vente.amountCents)} ${nomProduitVendu(vente)}`}
                  secondaire={nom ?? email}
                  aDroite={vente.refundedAt ? "remboursée" : quand(vente.paidAt)}
                  alerte={Boolean(vente.refundedAt)}
                />
              ))}
            </Liste>

            <Liste
              titre="Derniers tickets"
              href="/pilotage/support"
              vide={tickets === null ? "File illisible pour le moment." : "Aucun ticket."}
            >
              {ticketsRecents.map((t) => (
                <Ligne
                  key={t.id}
                  principal={t.subject?.trim() || t.message.slice(0, 60)}
                  secondaire={t.email}
                  aDroite={quand(t.createdAt)}
                  alerte={t.status === "open"}
                />
              ))}
            </Liste>
          </div>
        </>
      )}
    </div>
  );
}

function Chiffre({
  titre,
  valeur,
  note,
  href,
}: {
  titre: string;
  valeur: string;
  note?: string;
  /** Où va-t-on pour AGIR sur ce chiffre. Un chiffre sans suite se
      regarde ; celui-ci se traite. */
  href?: string;
}) {
  const contenu = (
    <>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valeur}</p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`${CARTE} block p-4 transition-colors hover:bg-accent/50`}>
        {contenu}
      </Link>
    );
  }
  return <div className={`${CARTE} p-4`}>{contenu}</div>;
}

/**
 * CE QUI DEMANDE UNE ACTION.
 *
 * Rien à signaler ne produit RIEN : un encart "tout va bien" affiché en
 * permanence finit par ne plus être lu, et le jour où il devient rouge
 * personne ne le voit.
 */
function Alertes({
  ventesOrphelines,
  traitees,
  onTraiter,
  atelier,
  sansMontant,
  ticketsEnRetard,
  pireAttenteHeures: pireAttente,
}: {
  ventesOrphelines: Sale[];
  traitees: ReadonlySet<string>;
  onTraiter: (reference: string, traite: boolean) => void;
  atelier: { reachable: boolean; reason: string | null };
  sansMontant: number;
  ticketsEnRetard: number;
  pireAttenteHeures: number | null;
}) {
  const lignes: {
    cle: string;
    texte: string;
    lien?: { libelle: string; href: string };
    reference?: string;
  }[] = [];

  // Ce qui a été réglé sort de la liste, sans disparaître : marquer
  // traité éteint l'alerte, ça n'efface pas l'argent.
  const { actives: orphelines, traitees: reglees } = trierAlertes(
    ventesOrphelines,
    (v) => v.ref,
    traitees,
  );

  if (orphelines.length > 0) {
    // QUAND ET COMBIEN, pas seulement QUI. Une vente orpheline d'il y a
    // trois mois et une d'hier n'appellent pas la même réaction, et
    // sans sa date elle se lit comme une urgence permanente : c'est
    // comme ça qu'une alerte finit par ne plus être lue.
    for (const v of orphelines.slice(0, 5)) {
      lignes.push({
        cle: `orpheline-${v.ref}`,
        texte:
          `${v.email} a payé ${euros(v.amountCents)} le ${quandLong(v.paidAt)}`
          + " et n'apparaît dans aucun compte.",
        // La section Ventes de la console, pas l'ancien admin : le
        // jour où on éteindra /admin, ce lien deviendrait un cul-de-sac.
        lien: { libelle: "Ouvrir les ventes", href: "/pilotage/ventes" },
        reference: v.ref,
      });
    }
    if (orphelines.length > 5) {
      lignes.push({
        cle: "orphelines-reste",
        texte: `${orphelines.length - 5} autre${orphelines.length - 5 > 1 ? "s" : ""} vente${orphelines.length - 5 > 1 ? "s" : ""} dans le même cas.`,
      });
    }
  }
  if (!atelier.reachable) {
    lignes.push({
      cle: "atelier",
      // Sans cette ligne, une panne de liaison passerait pour un mois
      // sans ventes, ce qui est pire qu'une absence de chiffre.
      texte:
        "L'Atelier n'a pas répondu : ses élèves et ses ventes manquent aux totaux ci-dessus.",
    });
  }
  if (ticketsEnRetard > 0) {
    // Quelqu'un attend depuis plus d'une journée. C'est la seule alerte
    // de cette liste qui porte sur une personne qui, elle, attend
    // vraiment une réponse de Béné.
    lignes.push({
      cle: "support-retard",
      texte:
        `${ticketsEnRetard} demande${ticketsEnRetard > 1 ? "s" : ""} de support `
        + `sans réponse depuis plus de ${DELAI_ALERTE_HEURES} h`
        + (pireAttente !== null ? ` (la plus ancienne : ${attenteLisible(pireAttente)}).` : "."),
      lien: { libelle: "Ouvrir le support", href: "/pilotage/support" },
    });
  }
  if (sansMontant > 0) {
    lignes.push({
      cle: "sans-montant",
      texte:
        `${sansMontant} vente${sansMontant > 1 ? "s" : ""} dont on ne connaît pas le montant. `
        + "Elles ne sont dans aucun total.",
    });
  }

  // RIEN À SIGNALER NE PRODUIT RIEN. Un encart "tout va bien" affiché
  // en permanence finit par ne plus être lu. Mais ce qui a été traité
  // reste rattrapable, discrètement.
  if (lignes.length === 0) {
    return reglees.length > 0 ? <Reglees ventes={reglees} onTraiter={onTraiter} /> : null;
  }

  return (
    <section className="rounded-xl border border-amber-300/50 bg-amber-50 p-4 dark:bg-amber-950/20">
      <p className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        {lignes.length} chose{lignes.length > 1 ? "s" : ""} à regarder
      </p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {lignes.map((l) => (
          <li key={l.cle} className="flex flex-wrap items-baseline gap-2">
            <span>{l.texte}</span>
            {l.lien && (
              <Link href={l.lien.href} className="underline underline-offset-2">
                {l.lien.libelle}
              </Link>
            )}
            {l.reference && (
              <button
                type="button"
                onClick={() => onTraiter(l.reference!, true)}
                className="rounded-md border border-current/30 px-2 py-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/10"
              >
                Marquer traité
              </button>
            )}
          </li>
        ))}
      </ul>
      {reglees.length > 0 && <Reglees ventes={reglees} onTraiter={onTraiter} discret />}
    </section>
  );
}

/**
 * Ce qui a été marqué traité.
 *
 * Discret, mais JAMAIS absent : une décision qu'on ne peut plus défaire
 * finit par ne plus être prise, et ici elle porte sur de l'argent
 * rentré sans contrepartie.
 */
function Reglees({
  ventes,
  onTraiter,
  discret,
}: {
  ventes: Sale[];
  onTraiter: (reference: string, traite: boolean) => void;
  discret?: boolean;
}) {
  return (
    <details className={discret ? "mt-3" : `${CARTE} p-4`}>
      <summary className="cursor-pointer text-xs text-muted-foreground">
        {ventes.length} vente{ventes.length > 1 ? "s" : ""} marquée
        {ventes.length > 1 ? "s" : ""} traitée{ventes.length > 1 ? "s" : ""}
      </summary>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        {ventes.map((v) => (
          <li key={v.ref} className="flex flex-wrap items-baseline gap-2">
            <span>
              {v.email} · {euros(v.amountCents)} · {quandLong(v.paidAt)}
            </span>
            <button
              type="button"
              onClick={() => onTraiter(v.ref, false)}
              className="underline underline-offset-2"
            >
              remettre en alerte
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Liste({
  titre,
  vide,
  href,
  children,
}: {
  titre: string;
  vide: string;
  /** La section qui montre TOUT. Un aperçu sans sortie est un cul-de-sac. */
  href?: string;
  children: React.ReactNode[];
}) {
  return (
    <section className={`${CARTE} p-4`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">{titre}</h2>
        {href && (
          <Link href={href} className="text-xs text-primary underline-offset-2 hover:underline">
            Tout voir
          </Link>
        )}
      </div>
      {/* LE VIDE PARLE. Une liste vide sans un mot se lit "c'est cassé". */}
      {children.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{vide}</p>
      ) : (
        <ul className="mt-2 divide-y">{children}</ul>
      )}
    </section>
  );
}

function Ligne({
  principal,
  secondaire,
  aDroite,
  alerte,
}: {
  principal: string;
  secondaire?: string | null;
  aDroite: string;
  alerte?: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm">{principal}</span>
        {secondaire && (
          <span className="block truncate text-xs text-muted-foreground">{secondaire}</span>
        )}
      </span>
      <span
        className={`shrink-0 text-xs ${alerte ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}
      >
        {aDroite}
      </span>
    </li>
  );
}
