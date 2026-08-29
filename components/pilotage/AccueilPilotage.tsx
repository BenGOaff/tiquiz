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
import Link from "next/link";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { GraphiqueEncaisse } from "@/components/pilotage/GraphiqueEncaisse";
import { derniersContacts, dernieresVentes, parDateDesc } from "@/lib/pilotage/recents";
import { libellePeriode, type SerieEmpilee } from "@/lib/pilotage/serieEmpilee";
import { CARTE } from "@/components/pilotage/carte";
import type { Person, PeopleTotals } from "@/lib/admin/people";
import type { Sale } from "@/lib/checkout/sales";
import type { Ticket } from "@/lib/support/tickets";
import { NOM_PRODUIT } from "@/lib/admin/saleProduct";
import { readSaleProduct } from "@/lib/admin/saleProduct";

type Donnees = {
  people: Person[];
  totals: PeopleTotals;
  ventesOrphelines: Sale[];
  serieEmpilee: SerieEmpilee;
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
  const [d, setD] = useState<Donnees | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch("/api/admin/pilotage", { cache: "no-store" });
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
  }, []);

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

  const contacts = d ? derniersContacts(d.people, 6) : [];
  const ventes = d ? dernieresVentes(d.people, 6) : [];
  const ticketsRecents = tickets ? parDateDesc(tickets, (t) => t.createdAt).slice(0, 6) : [];
  const ouverts = (tickets ?? []).filter((t) => t.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Accueil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Qu&apos;est-ce qui demande mon attention aujourd&apos;hui ?
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
            <Chiffre
              titre={`Encaissé ${libellePeriode(d.serieEmpilee) || "sur la période lue"}`}
              valeur={euros(d.serieEmpilee.fiable ? d.serieEmpilee.totalCents : 0)}
              note={d.totals.rembourseCents > 0 ? `${euros(d.totals.rembourseCents)} remboursés` : undefined}
            />
            <Chiffre titre="Abonnés" valeur={String(d.totals.abonnes)} note={`${d.totals.avie} à vie`} />
            <Chiffre titre="Comptes" valeur={String(d.totals.comptes)} note={`${d.totals.atelier} élèves`} />
            <Chiffre
              titre="Tickets ouverts"
              valeur={tickets === null ? "-" : String(ouverts)}
              note={tickets === null ? "file illisible" : undefined}
            />
          </div>

          {/* 2. CE QUI DEMANDE UNE ACTION, tout de suite après. */}
          <Alertes
            ventesOrphelines={d.ventesOrphelines}
            atelier={d.atelier}
            sansMontant={d.totals.ventesSansMontant}
          />

          {/* 3. LE graphique. */}
          <GraphiqueEncaisse serie={d.serieEmpilee} />

          {/* 4. Ce qui vient de se passer. */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Liste titre="Derniers contacts" vide="Personne de nouveau.">
              {contacts.map((p) => (
                <Ligne
                  key={p.email}
                  principal={p.name ?? p.email}
                  secondaire={p.name ? p.email : p.plan}
                  aDroite={quand(p.createdAt)}
                />
              ))}
            </Liste>

            <Liste titre="Dernières ventes" vide="Aucune vente lue.">
              {ventes.map(({ vente, email, nom }) => (
                <Ligne
                  key={`${vente.ref}-${vente.paidAt}`}
                  principal={`${euros(vente.amountCents)} ${NOM_PRODUIT[readSaleProduct(vente)]}`}
                  secondaire={nom ?? email}
                  aDroite={vente.refundedAt ? "remboursée" : quand(vente.paidAt)}
                  alerte={Boolean(vente.refundedAt)}
                />
              ))}
            </Liste>

            <Liste
              titre="Derniers tickets"
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

function Chiffre({ titre, valeur, note }: { titre: string; valeur: string; note?: string }) {
  return (
    <div className={`${CARTE} p-4`}>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valeur}</p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
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
  atelier,
  sansMontant,
}: {
  ventesOrphelines: Sale[];
  atelier: { reachable: boolean; reason: string | null };
  sansMontant: number;
}) {
  const lignes: { cle: string; texte: string; lien?: { libelle: string; href: string } }[] = [];

  if (ventesOrphelines.length > 0) {
    // QUAND ET COMBIEN, pas seulement QUI. Une vente orpheline d'il y a
    // trois mois et une d'hier n'appellent pas la même réaction, et
    // sans sa date elle se lit comme une urgence permanente : c'est
    // comme ça qu'une alerte finit par ne plus être lue.
    for (const v of ventesOrphelines.slice(0, 3)) {
      lignes.push({
        cle: `orpheline-${v.ref}`,
        texte:
          `${v.email} a payé ${euros(v.amountCents)} le ${quandLong(v.paidAt)}`
          + " et n'apparaît dans aucun compte.",
        lien: { libelle: "Ouvrir Mes ventes", href: "/admin/ventes" },
      });
    }
    if (ventesOrphelines.length > 3) {
      lignes.push({
        cle: "orphelines-reste",
        texte: `${ventesOrphelines.length - 3} autre${ventesOrphelines.length - 3 > 1 ? "s" : ""} vente${ventesOrphelines.length - 3 > 1 ? "s" : ""} dans le même cas.`,
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
  if (sansMontant > 0) {
    lignes.push({
      cle: "sans-montant",
      texte:
        `${sansMontant} vente${sansMontant > 1 ? "s" : ""} dont on ne connaît pas le montant. `
        + "Elles ne sont dans aucun total.",
    });
  }

  if (lignes.length === 0) return null;

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
          </li>
        ))}
      </ul>
    </section>
  );
}

function Liste({
  titre,
  vide,
  children,
}: {
  titre: string;
  vide: string;
  children: React.ReactNode[];
}) {
  return (
    <section className={`${CARTE} p-4`}>
      <h2 className="text-sm font-medium">{titre}</h2>
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
