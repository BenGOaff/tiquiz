"use client";

// components/admin/StatistiquesCard.tsx
//
// SUIVRE SES VENTES VISUELLEMENT, SANS JAMAIS DESSINER UN CHIFFRE FAUX.
//
// Béné, 22 août : "un onglet statistiques aussi pour suivre mes ventes,
// visuellement (uniquement de manière fiable aussi...)".
//
// -- AUCUN CALCUL ICI --------------------------------------------------
//
// Tout vient de `lib/admin/adminStats.ts`, testé. Ce fichier dessine des
// barres et écrit des phrases, il ne décide de rien. Un écran qui
// recalcule ce que le serveur a déjà calculé finit toujours par mentir :
// c'est vrai sept fois dans ce dépôt.
//
// -- POURQUOI PAS DE LIBRAIRIE DE GRAPHIQUES ---------------------------
//
// Une dépendance de plus, c'est un `package-lock.json` à committer, un
// `npm ci` qui peut casser en prod et pas en local, et du poids sur une
// page interne consultée par une seule personne. Des `div` avec une
// hauteur en pourcentage font exactement le même travail ici.

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildAdminStats,
  moisLabel,
  type Serie,
  type SerieFiable,
  type StatsAdmin,
} from "@/lib/admin/adminStats";
import type { Person, PeopleTotals } from "@/lib/admin/people";

interface Reponse {
  ok?: boolean;
  people?: Person[];
  totals?: PeopleTotals;
  reason?: string;
}

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * UNE COURBE, OU LA RAISON DE NE PAS L'AFFICHER.
 *
 * Le composant prend une `Serie`, donc il est OBLIGÉ de traiter le cas
 * "je ne sais pas". C'est le type qui porte la garantie, pas la bonne
 * volonté de celui qui écrira le prochain graphique.
 */
function Barres({
  titre,
  serie,
  format,
  sousTitre,
}: {
  titre: string;
  serie: Serie;
  format?: (v: number) => string;
  sousTitre?: string;
}) {
  if (!serie.fiable) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-semibold">{titre}</p>
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="size-4 shrink-0" />
            <p>
              {serie.raison === "montants-absents" ? (
                <>
                  Pas de courbe ici, et c&apos;est volontaire : {serie.concernees} vente
                  {serie.concernees > 1 ? "s" : ""} de la période{" "}
                  {serie.concernees > 1 ? "n'ont" : "n'a"} pas de montant, parce que
                  Systeme.io ne nous le transmet pas. Une courbe à zéro se lirait
                  &quot;je ne vends rien&quot; alors qu&apos;elle voudrait dire &quot;je ne
                  connais pas les montants&quot;. Le nombre de ventes, juste au dessus, est
                  fiable.
                </>
              ) : (
                <>Aucune vente sur la période. Rien à dessiner, et ce n&apos;est pas une panne.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ecrire = format ?? ((v: number) => String(v));
  const max = Math.max(1, ...serie.points.map((p) => p.valeur));

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">{titre}</p>
          <p className="text-sm text-muted-foreground">
            {ecrire(serie.total)} sur la période
          </p>
        </div>
        {sousTitre && <p className="mt-0.5 text-xs text-muted-foreground">{sousTitre}</p>}

        <div className="mt-4 flex h-32 items-end gap-1.5">
          {serie.points.map((p) => (
            <div key={p.mois} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {p.valeur > 0 ? ecrire(p.valeur) : ""}
              </span>
              <div
                className="w-full rounded-t bg-primary/80"
                // Une barre a zero garde 2px : sinon un mois vide est
                // indistinguable d'un mois absent du graphique.
                style={{ height: `${Math.max(2, Math.round((p.valeur / max) * 100))}%` }}
                title={`${moisLabel(p.mois)} : ${ecrire(p.valeur)}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1.5">
          {serie.points.map((p) => (
            <span
              key={p.mois}
              className="flex-1 text-center text-[10px] text-muted-foreground"
            >
              {moisLabel(p.mois).replace(/\s/, " ")}
            </span>
          ))}
        </div>

        {/* Ce qu'on n'a pas pu placer se dit. Sinon la somme des barres
            est inferieure au total reel et rien ne l'explique : c'est la
            mecanique du funnel fantome d'Adeline. */}
        {serie.sansDate > 0 && (
          <p className="mt-2 text-xs text-amber-700">
            {serie.sansDate} ligne{serie.sansDate > 1 ? "s" : ""} sans date, absente
            {serie.sansDate > 1 ? "s" : ""} des barres.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Plans({ plans }: { plans: { plan: string; count: number }[] }) {
  const total = plans.reduce((s, p) => s + p.count, 0);
  if (!total) return null;
  const max = Math.max(1, ...plans.map((p) => p.count));
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">Répartition par palier</p>
          <p className="text-sm text-muted-foreground">{total} comptes Tiquiz</p>
        </div>
        <div className="mt-3 space-y-2">
          {plans.map((p) => (
            <div key={p.plan} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{p.plan}</span>
              <div className="h-4 flex-1 rounded bg-muted">
                <div
                  className="h-4 rounded bg-primary/80"
                  style={{ width: `${Math.max(2, Math.round((p.count / max) * 100))}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-semibold">
                {p.count} ({total ? Math.round((p.count / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatistiquesCard() {
  const [stats, setStats] = useState<StatsAdmin | null>(null);
  const [totals, setTotals] = useState<PeopleTotals | null>(null);
  const [chargement, setChargement] = useState(true);
  const [panne, setPanne] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch("/api/admin/pilotage", { cache: "no-store" });
      const json: Reponse = await res.json();
      if (!json.ok || !json.people) {
        // UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE A L'ECRAN.
        // Des graphiques vides se lisent "tu ne vends rien", ce qui
        // envoie chercher au mauvais endroit (regle du 3 aout).
        setPanne(
          res.status === 401
            ? "Ton compte n'est pas reconnu comme administrateur."
            : String(json.reason ?? "Le serveur a refusé sans dire pourquoi."),
        );
        setStats(null);
        return;
      }
      setPanne(null);
      setTotals(json.totals ?? null);
      setStats(buildAdminStats(json.people, new Date()));
    } catch {
      setPanne("La connexion a coupé avant la réponse. Réessaie.");
      setStats(null);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement && !stats) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto size-6 animate-spin" />
      </div>
    );
  }

  if (panne) {
    return (
      <Card className="border-rose-300 bg-rose-50">
        <CardContent className="py-3">
          <p className="text-sm font-bold text-rose-900">
            Les statistiques n&apos;ont pas pu être chargées. Il n&apos;y a rien à lire ci
            dessous, ce n&apos;est pas parce que tu n&apos;as pas de ventes.
          </p>
          <p className="mt-1 text-xs text-rose-900">{panne}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void charger()}>
            <RefreshCw className="size-4" /> Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const moisCourant = stats.mois[stats.mois.length - 1];
  const dernier = (s: SerieFiable) =>
    s.points.find((p) => p.mois === moisCourant)?.valeur ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Les 12 derniers mois. Ne sont dessinés que les chiffres qu&apos;on sait justes.
        </p>
        <Button variant="outline" size="sm" onClick={() => void charger()} disabled={chargement}>
          {chargement ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Rafraîchir
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Ventes ce mois", valeur: dernier(stats.ventes) },
          { label: "Nouveaux comptes ce mois", valeur: dernier(stats.comptesCrees) },
          { label: "Départs ce mois", valeur: dernier(stats.departs) },
          { label: "Comptes en tout", valeur: totals?.comptes ?? 0 },
          { label: "Quiz créés", valeur: stats.quiz },
          { label: "Leads collectés", valeur: stats.leads },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pb-3 pt-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-bold">{c.valeur}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Barres
        titre="Ventes par mois"
        serie={stats.ventes}
        sousTitre="Le nombre de ventes encaissées, toutes sources confondues."
      />
      <Barres titre="Encaissé par mois" serie={stats.encaisse} format={euros} />
      <Barres
        titre="Nouveaux comptes par mois"
        serie={stats.comptesCrees}
        sousTitre="Comptes Tiquiz créés, gratuits compris."
      />
      <Barres
        titre="Départs par mois"
        serie={stats.departs}
        sousTitre="Abonnements résiliés. En perdre est normal : ce qui compte est le rapport avec la colonne des ventes."
      />
      <Plans plans={stats.plans} />
    </div>
  );
}
