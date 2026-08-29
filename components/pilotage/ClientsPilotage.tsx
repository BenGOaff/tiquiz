"use client";

// components/pilotage/ClientsPilotage.tsx
//
// TOUTES LES PERSONNES DE TOUTES LES APP (Béné, 29 août 2026).
//
// "Je dois voir toutes les personnes qui sont sur mes app, ou qui l'ont
// été", "avec chacune une fiche complète pour gérer leurs accès".
//
// -- LA LISTE RESTE UNE LISTE ------------------------------------------
//
// Tout ce qu'on FAIT sur une personne se passe sur SA fiche (règle du
// 22 août). Un tiroir dans une liste sert à jeter un oeil, pas à
// travailler, et deux endroits qui agissent sur les mêmes gens
// finissent par se contredire.
//
// -- LES FILTRES PORTENT LEUR NOMBRE -----------------------------------
//
// Voir "Abonnés 42" à côté de "Partis 8" dit la forme de la base avant
// même de cliquer. Avec 200 000 comptes, c'est la seule façon de
// commencer.
//
// -- LA PÉRIODE NE FILTRE PAS CET ÉCRAN, ET C'EST VOULU ----------------
//
// Une liste de clients tronquée aux 30 derniers jours cacherait
// exactement ceux qu'on vient chercher : les anciens. Le sélecteur de
// période gouverne les CHIFFRES, pas l'annuaire. L'écran le dit, sinon
// on croit qu'il ne marche pas.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, Search } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import {
  filtrerClients,
  compterParProduit,
  compterParStatut,
  CRITERES_PAR_DEFAUT,
  ORDRE_STATUTS,
  NOM_STATUT,
  type CritereClients,
  type TriClients,
} from "@/lib/pilotage/clients";
import {
  APPARTENANCES_ORDRE,
  appartenances,
  NOM_APPARTENANCE,
  type Appartenance,
} from "@/lib/pilotage/appartenance";
import type { Person, PersonStatus } from "@/lib/admin/people";

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function quand(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "jamais";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "2-digit" })
    .format(new Date(t));
}

const TRIS: { id: TriClients; libelle: string }[] = [
  { id: "recents", libelle: "Derniers arrivés" },
  { id: "activite", libelle: "Dernière connexion" },
  { id: "paye", libelle: "Ont le plus payé" },
  { id: "alpha", libelle: "Alphabétique" },
];

/**
 * LA COULEUR D'UN PRODUIT EST CELLE DU GRAPHIQUE.
 *
 * `--pil-tiquiz` et `--pil-atelier` sont les teintes validées de
 * l'encaissé : réutiliser les mêmes fait qu'une pastille bleue dans la
 * liste et une barre bleue dans le graphique parlent du même produit.
 * Deux palettes pour les mêmes entités, c'est deux choses à apprendre.
 */
const TON_PRODUIT: Record<Appartenance, { fond: string; texte: string }> = {
  tiquiz: { fond: "color-mix(in oklab, var(--pil-tiquiz) 16%, transparent)", texte: "var(--pil-tiquiz)" },
  atelier: { fond: "color-mix(in oklab, var(--pil-atelier) 16%, transparent)", texte: "var(--pil-atelier)" },
  tipote: { fond: "color-mix(in oklab, var(--pil-autre) 16%, transparent)", texte: "var(--pil-autre)" },
  // Le gratuit n'a PAS de couleur de marque : c'est un prospect, pas un
  // client. Lui donner la teinte de Tiquiz ferait lire une clientèle
  // payante deux fois plus grande qu'elle n'est.
  "tiquiz-gratuit": { fond: "transparent", texte: "inherit" },
};

const TON_STATUT: Record<PersonStatus, string> = {
  abonne: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  avie: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  partant: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
  parti: "bg-muted text-muted-foreground",
  essai: "bg-muted text-muted-foreground",
  atelier: "bg-primary/15 text-primary",
};

const AU_SINGULIER: Record<PersonStatus, string> = {
  abonne: "Abonné",
  avie: "À vie",
  partant: "Part bientôt",
  parti: "Parti",
  essai: "Gratuit",
  atelier: "Atelier",
};

export function ClientsPilotage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // `null` = on n'a PAS PU regarder. Ce n'est pas un objet vide : vide
  // voudrait dire "personne n'a de compte Tipote", ce qu'on ne peut pas
  // affirmer quand la liaison n'a pas repondu.
  const [tipote, setTipote] = useState<Record<string, string> | null>(null);
  const [c, setC] = useState<CritereClients>(CRITERES_PAR_DEFAUT);
  const [combien, setCombien] = useState(50);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pilotage", { cache: "no-store" });
      const j = await res.json();
      if (!j?.ok) {
        setErreur("La liste n'a pas pu être lue.");
        return;
      }
      // LES COMPTES TIPOTE VIVENT DANS L'AUTRE BASE. On les colle ici,
      // une fois : sans ça, chaque ligne referait la recherche et la
      // pastille dependrait de l'ordre d'affichage.
      const t = j.tipote as
        | { lisible: true; comptes: Record<string, string> }
        | { lisible: false; raison: string }
        | undefined;
      setTipote(t?.lisible ? t.comptes : null);
      setPeople((j.people as Person[]) ?? []);
      setErreur(null);
    } catch {
      setErreur("La liste n'a pas pu être lue.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  // CHAQUE PERSONNE PORTE SON APPARTENANCE TIPOTE, une fois pour
  // toutes. `null` quand la liaison est muette : les fonctions pures
  // savent alors qu'on n'a pas su, au lieu de conclure "pas cliente".
  const gens = useMemo(
    () =>
      (people ?? []).map((p) => ({
        ...p,
        tipote: tipote ? Boolean(tipote[p.email.toLowerCase()]) : null,
      })),
    [people, tipote],
  );

  const compte = useMemo(() => compterParStatut(gens), [gens]);
  const compteProduit = useMemo(() => compterParProduit(gens), [gens]);
  const vues = useMemo(() => filtrerClients(gens, c), [gens, c]);

  if (!people && !erreur) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Clients et élèves</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toutes les personnes de toutes les app, présentes et passées. Cet annuaire ne suit pas
          le filtre de période : il montre tout le monde.
        </p>
      </div>

      {erreur && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {/* LES FILTRES PORTENT LEUR NOMBRE. */}
      <div className="flex flex-wrap gap-2">
        <Puce
          actif={c.statut === "tous"}
          onClick={() => setC({ ...c, statut: "tous" })}
          libelle="Tout le monde"
          nombre={compte.tous ?? 0}
        />
        {ORDRE_STATUTS.filter((s) => (compte[s] ?? 0) > 0).map((s) => (
          <Puce
            key={s}
            actif={c.statut === s}
            onClick={() => setC({ ...c, statut: s })}
            libelle={NOM_STATUT[s]}
            nombre={compte[s] ?? 0}
          />
        ))}
      </div>

      {/* DE QUOI IL EST CLIENT, en filtre ET en pastille sur la ligne.
          Une personne cliente de deux produits est comptée dans les
          deux : ces nombres ne s'additionnent pas au total, et c'est
          voulu. La question est "combien ont l'Atelier", pas une
          partition. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Client de</span>
        <Puce
          actif={c.produit === "tous"}
          onClick={() => setC({ ...c, produit: "tous" })}
          libelle="Peu importe"
          nombre={compteProduit.tous ?? 0}
        />
        {APPARTENANCES_ORDRE.filter((a) => (compteProduit[a] ?? 0) > 0).map((a) => (
          <Puce
            key={a}
            actif={c.produit === a}
            onClick={() => setC({ ...c, produit: a })}
            libelle={NOM_APPARTENANCE[a]}
            nombre={compteProduit[a] ?? 0}
          />
        ))}
        {tipote === null && (
          // MUET N'EST PAS VIDE. Sans cette phrase, l'absence totale de
          // pastille Tipote se lirait "aucun client Tipote".
          <span className="text-xs text-muted-foreground">
            Tipote n&apos;a pas répondu : ses comptes ne sont pas affichés.
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={c.recherche}
            onChange={(e) => setC({ ...c, recherche: e.target.value })}
            placeholder="Un nom, une adresse"
            aria-label="Chercher une personne"
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={c.tri}
          onChange={(e) => setC({ ...c, tri: e.target.value as TriClients })}
          aria-label="Trier"
          className="rounded-lg border bg-card px-3 py-2 text-sm"
        >
          {TRIS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.libelle}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {vues.length} personne{vues.length > 1 ? "s" : ""}
        </span>
      </div>

      {vues.length === 0 ? (
        // LE VIDE PARLE : sans un mot, il se lit "c'est cassé".
        <section className={`${CARTE} p-6`}>
          <p className="text-sm font-medium">Personne ne correspond.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Essaie une autre adresse, ou retire le filtre.
          </p>
        </section>
      ) : (
        <>
          <section className={`${CARTE} divide-y`}>
            {vues.slice(0, combien).map((p) => (
              <Link
                key={p.email}
                href={`/pilotage/clients/${encodeURIComponent(p.email)}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name ?? p.email}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.name ? p.email : p.plan}
                    {p.quizCount > 0 && ` · ${p.quizCount} quiz`}
                    {p.leadCount > 0 && ` · ${p.leadCount} leads`}
                  </span>
                </span>
                {/* DE QUOI IL EST CLIENT, EN UN COUP D'OEIL. Les mêmes
                    couleurs que le graphique de l'encaissé : une
                    pastille bleue ici et une barre bleue là-bas parlent
                    du même produit. */}
                <span className="hidden shrink-0 items-center gap-1 sm:flex">
                  {appartenances(p).map((a) => (
                    <span
                      key={a}
                      className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                        a === "tiquiz-gratuit" ? "border text-muted-foreground" : ""
                      }`}
                      style={
                        a === "tiquiz-gratuit"
                          ? undefined
                          : { backgroundColor: TON_PRODUIT[a].fond, color: TON_PRODUIT[a].texte }
                      }
                    >
                      {NOM_APPARTENANCE[a]}
                    </span>
                  ))}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${TON_STATUT[p.status]}`}
                >
                  {AU_SINGULIER[p.status]}
                </span>
                <span className="hidden w-24 shrink-0 text-right text-sm tabular-nums sm:block">
                  {p.paidCents > 0 ? euros(p.paidCents) : "-"}
                </span>
                <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground md:block">
                  {quand(p.lastSignIn)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </section>

          {/* ON N'AFFICHE PAS 200 000 LIGNES D'UN COUP, et on dit
              combien il en reste : un tableau coupé en silence fait
              croire qu'on a tout vu. */}
          {vues.length > combien && (
            <button
              type="button"
              onClick={() => setCombien((n) => n + 100)}
              className="w-full rounded-lg border py-2 text-sm hover:bg-accent"
            >
              Voir 100 de plus ({vues.length - combien} restantes)
            </button>
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
}: {
  actif: boolean;
  onClick: () => void;
  libelle: string;
  nombre: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={[
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        actif ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
      ].join(" ")}
    >
      {libelle} <span className="tabular-nums opacity-70">{nombre}</span>
    </button>
  );
}
