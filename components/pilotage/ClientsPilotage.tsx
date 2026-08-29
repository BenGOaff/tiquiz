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
  compterParStatut,
  CRITERES_PAR_DEFAUT,
  ORDRE_STATUTS,
  NOM_STATUT,
  type CritereClients,
  type TriClients,
} from "@/lib/pilotage/clients";
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
      setPeople((j.people as Person[]) ?? []);
      setErreur(null);
    } catch {
      setErreur("La liste n'a pas pu être lue.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const compte = useMemo(() => compterParStatut(people ?? []), [people]);
  const vues = useMemo(() => filtrerClients(people ?? [], c), [people, c]);

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
