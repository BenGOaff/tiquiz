"use client";

// components/pilotage/TraficPilotage.tsx
//
// TRAFIC ET VENTES SUR LE MÊME ÉCRAN (Béné, 4 septembre 2026, point 3).
//
// "1. begin_checkout au clic sur un palier ; 2. purchase sur la page de
// remerciement ; 3. seulement après : un écran dans l'admin qui montre
// les deux ensemble."
//
// Les deux chiffres viennent du MÊME appel et de la MÊME période : deux
// appels séparés finiraient par porter deux périodes différentes, et
// l'écran diviserait des pommes par des poires sans que rien ne le dise.
//
// TROIS PHRASES SONT OBLIGATOIRES ICI, et elles disent ce que l'écran
// NE sait pas :
//   - on compte des VUES DE PAGE, pas des visiteurs (aucun cookie) ;
//   - un taux ne s'affiche qu'au dessus d'un seuil de vues ;
//   - le comptage a commencé le 7 septembre, donc une période plus
//     ancienne n'est pas un site désert.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import {
  construireEntonnoir,
  MIN_VUES_POUR_UN_TAUX,
  pagesLesPlusVues,
  sourcesDuTrafic,
  vuesParJour,
  type LigneTrafic,
} from "@/lib/trafic/entonnoir";

/** Le premier jour où le compteur a tourné. Avant, il n'y a rien à lire. */
const DEBUT_DU_COMPTAGE = "2026-09-07";

type Trafic =
  | { lisible: true; lignes: LigneTrafic[]; tronquee: boolean }
  | { lisible: false; raison: string };

type Donnees = {
  periode: { libelle: string; debut: string | null };
  resume: { ventes: number; encaisseCents: number };
  trafic?: Trafic;
};

function nombre(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function TraficPilotage() {
  const params = useSearchParams();
  const query = params?.toString() ?? "";
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/pilotage${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const j = await res.json();
      if (!j?.ok) {
        setErreur("Les chiffres n'ont pas pu être lus.");
        return;
      }
      setD(j as Donnees);
      setErreur(null);
    } catch {
      setErreur("Les chiffres n'ont pas pu être lus.");
    }
  }, [query]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const lignes = useMemo<LigneTrafic[]>(
    () => (d?.trafic?.lisible ? d.trafic.lignes : []),
    [d],
  );
  const entonnoir = useMemo(
    () => construireEntonnoir({ lignes, ventes: d?.resume.ventes ?? 0 }),
    [lignes, d],
  );

  if (!d && !erreur) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (erreur || !d) {
    return <p className="text-sm text-muted-foreground">{erreur}</p>;
  }

  const trafic = d.trafic;
  // LA MIGRATION PAS ENCORE PASSÉE N'EST PAS UN SITE DÉSERT.
  const illisible = !trafic || trafic.lisible === false;
  const avantLeComptage = Boolean(d.periode.debut && d.periode.debut < DEBUT_DU_COMPTAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trafic et conversions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Combien de monde arrive, combien achète, et par où ils viennent. {d.periode.libelle}.
        </p>
      </div>

      {illisible ? (
        <div className={`${CARTE} p-5`}>
          <p className="text-sm font-medium">Le comptage du trafic n&apos;a pas pu être lu.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce n&apos;est pas un site sans visite : c&apos;est que la lecture a échoué. Le plus
            probable est que la migration <code>20260907_trafic_pages_publiques.sql</code> ne soit
            pas encore passée sur Supabase.
          </p>
          {trafic && trafic.lisible === false ? (
            <p className="mt-2 text-xs text-muted-foreground">Raison : {trafic.raison}</p>
          ) : null}
        </div>
      ) : (
        <>
          <Entonnoir e={entonnoir} encaisseCents={d.resume.encaisseCents} />

          {avantLeComptage ? (
            <p className="text-xs text-muted-foreground">
              Le comptage des vues a commencé le 7 septembre 2026. Une période qui remonte plus loin
              montre moins de vues que de réalité, alors que les ventes, elles, remontent à leur
              début.
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Classement
              titre="D&apos;où vient le monde"
              aide="Les navigations d'une de nos pages vers une autre sont écartées : elles n'ont amené personne."
              lignes={sourcesDuTrafic(lignes)}
              total={entonnoir.vues}
            />
            <Classement
              titre="Les pages les plus vues"
              aide="Le chemin exact, pas une famille : c'est ce qui dit quel article ou quelle page amène du monde."
              lignes={pagesLesPlusVues(lignes)}
              total={entonnoir.vues}
            />
          </div>

          <Courbe jours={vuesParJour(lignes)} />

          <p className="text-xs text-muted-foreground">
            On compte des <strong>vues de page</strong>, jamais des visiteurs : aucun cookie
            n&apos;est posé pour ces chiffres, donc on ne sait pas distinguer une personne qui
            revient d&apos;une nouvelle. En échange, ce compteur voit aussi les gens qui refusent le
            bandeau cookies et ceux qui ont un bloqueur, que Google Analytics ne voit pas.
          </p>
        </>
      )}
    </div>
  );
}

function Entonnoir({
  e,
  encaisseCents,
}: {
  e: ReturnType<typeof construireEntonnoir>;
  encaisseCents: number;
}) {
  const marches = [
    { titre: "Vues du site", valeur: nombre(e.vues), note: "toutes les pages publiques" },
    {
      titre: "Vues d'un bon de commande",
      valeur: nombre(e.vuesCommande),
      note:
        e.tauxVersCommande === null
          ? `pas encore ${MIN_VUES_POUR_UN_TAUX} vues, aucun taux affiché`
          : `${e.tauxVersCommande} % des vues`,
    },
    {
      titre: "Ventes encaissées",
      valeur: nombre(e.ventes),
      note:
        e.tauxCommandeVersVente === null
          ? "pas encore assez de bons de commande vus"
          : `${e.tauxCommandeVersVente} % des bons de commande vus`,
    },
  ];

  return (
    <div className={`${CARTE} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Le parcours, marche par marche</h2>
        <p className="text-sm text-muted-foreground">
          {euros(encaisseCents)} encaissés
          {e.tauxGlobal === null ? null : <> · {e.tauxGlobal} % des vues finissent en vente</>}
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {marches.map((m) => (
          <div key={m.titre} className="rounded-lg border border-border/60 p-4">
            <p className="text-xs text-muted-foreground">{m.titre}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{m.valeur}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Classement({
  titre,
  aide,
  lignes,
  total,
}: {
  titre: string;
  aide: string;
  lignes: { cle: string; vues: number }[];
  total: number;
}) {
  return (
    <div className={`${CARTE} p-5`}>
      <h2 className="text-sm font-semibold">{titre}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{aide}</p>
      {lignes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Aucune vue sur cette période.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {lignes.map((l) => (
            <li key={l.cle} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate" title={l.cle}>
                {l.cle}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {nombre(l.vues)}
                {total > 0 ? <> · {Math.round((l.vues / total) * 100)} %</> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Courbe({ jours }: { jours: { jour: string; vues: number }[] }) {
  const max = jours.reduce((m, j) => Math.max(m, j.vues), 0);
  if (jours.length === 0) return null;
  return (
    <div className={`${CARTE} p-5`}>
      <h2 className="text-sm font-semibold">Les vues, jour par jour</h2>
      <div className="mt-4 flex items-end gap-1" style={{ height: 120 }}>
        {jours.map((j) => (
          <div
            key={j.jour}
            className="flex-1 rounded-t"
            style={{
              // Une barre à zéro reste VISIBLE (1 px) : une colonne
              // absente se lit comme un jour manquant, pas comme un
              // jour sans visite.
              height: max > 0 ? `${Math.max(1, Math.round((j.vues / max) * 100))}%` : "1px",
              background: "var(--pil-tiquiz)",
            }}
            title={`${j.jour} : ${nombre(j.vues)} vues`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {jours[0]?.jour} au {jours[jours.length - 1]?.jour}
      </p>
    </div>
  );
}
