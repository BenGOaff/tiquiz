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
import { BASE_MIN_CHURN, type Mrr, type PointChurn } from "@/lib/admin/mrr";
import {
  buildAdminStats,
  moisLabel,
  type Serie,
  type SerieFiable,
  type StatsAdmin,
} from "@/lib/admin/adminStats";
import type { Person, PeopleTotals } from "@/lib/admin/people";
import { NOM_PRODUIT } from "@/lib/admin/saleProduct";

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
                  {serie.concernees > 1 ? "portent" : "porte"} sur un produit qu&apos;on ne
                  reconnaît pas, donc son montant est inconnu. Une courbe qui les oublie
                  serait fausse sans le dire. Le nombre de ventes, juste au dessus, est
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
        {/* CE QUE LE TOTAL CONTIENT. Ces montants comptent (decision
            Bene du 22 aout) : on dit juste combien viennent du tarif du
            plan, pour qu'un ecart avec sa banque ne reste pas
            mysterieux. */}
        {serie.estimees ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Dont {serie.estimees} vente{serie.estimees > 1 ? "s" : ""} chiffrée
            {serie.estimees > 1 ? "s" : ""} au tarif du plan, remise éventuelle non déduite.
          </p>
        ) : null}

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

/**
 * TIQUIZ ET L'ATELIER, SEPARES.
 *
 * Bene, 22 aout : "je vois mal les differences entre Tiquiz et
 * l'Atelier, partout, dans les ventes, les stats". Un abonnement a 17 €
 * et une formation a 47 € dans la meme barre ne veulent rien dire : ni
 * le nombre, ni le total.
 */
function Produits({ parProduit }: { parProduit: StatsAdmin["parProduit"] }) {
  if (!parProduit.length) return null;
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm font-semibold">Par produit, sur toute la période lue</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {parProduit.map((p) => (
            <div key={p.produit} className="rounded-lg border px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {NOM_PRODUIT[p.produit]}
              </p>
              <p className="text-xl font-bold">{euros(p.totalCents)}</p>
              <p className="text-xs text-muted-foreground">
                {p.ventes} vente{p.ventes > 1 ? "s" : ""}
                {p.estimees > 0 ? `, dont ${p.estimees} au tarif du plan` : ""}
              </p>
            </div>
          ))}
        </div>
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

/**
 * LE REVENU RÉCURRENT, EN HAUT DE L'ÉCRAN (Béné, 27 août 2026).
 *
 * "Oui je veux mon MRR et mon churn facilement trouvables."
 *
 * Deux chiffres et pas un, parce qu'ils ne disent pas la même chose :
 * ce qui se renouvellera, et ce qui paie encore mais a déjà donné son
 * préavis. Les fondre en un seul aurait gonflé le premier.
 *
 * La phrase sur le catalogue n'est pas de la modestie : un abonné venu
 * de Systeme.io sur un ancien tarif est compté au prix d'aujourd'hui, et
 * quelqu'un qui compare ce chiffre à son relevé bancaire doit savoir
 * pourquoi il ne tombe pas au centime.
 */
function RevenuRecurrent({ mrr }: { mrr: Mrr }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Revenu récurrent mensuel</p>
            <p className="mt-1 text-3xl font-bold">{euros(mrr.cents)}</p>
            <p className="text-xs text-muted-foreground">
              {mrr.abonnes} abonnement{mrr.abonnes > 1 ? "s" : ""} qui se renouvelle
              {mrr.abonnes > 1 ? "nt" : ""}
            </p>
          </div>
          {mrr.partants > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Dont le préavis est posé</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">-{euros(mrr.enSursisCents)}</p>
              <p className="text-xs text-muted-foreground">
                {mrr.partants} personne{mrr.partants > 1 ? "s" : ""} qui paie
                {mrr.partants > 1 ? "nt" : ""} encore mais ne se renouvellera
                {mrr.partants > 1 ? "ont" : ""} pas
              </p>
            </div>
          )}
        </div>

        {mrr.parPlan.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {mrr.parPlan.map((p) => (
              <span key={p.plan} className="text-muted-foreground">
                <span className="font-medium text-foreground">{p.plan}</span> : {p.abonnes} ({euros(p.cents)})
              </span>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Calculé aux tarifs du catalogue d&apos;aujourd&apos;hui, l&apos;annuel ramené au mois.
          Un abonnement arrivé par Systeme.io sur un ancien tarif est donc compté au prix actuel.
          Les accès à vie n&apos;y sont pas : ils ne se renouvellent pas.
        </p>

        {mrr.nonChiffrables.length > 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Non compté, faute de tarif connu :{" "}
            {mrr.nonChiffrables.map((n) => `${n.personnes} en ${n.plan}`).join(", ")}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * LE CHURN, ET SON REFUS DE CALCULER.
 *
 * Sur une base de 3 personnes, un départ vaut 33 %. Le taux n'est donc
 * calculé qu'à partir de `BASE_MIN_CHURN` ; en dessous on montre les
 * effectifs bruts et on le DIT. C'est la règle du funnel de Jocelyne
 * (4 août) transposée à l'argent : la retenue ne s'obtient pas en la
 * demandant, elle s'obtient en refusant de calculer.
 */
function Churn({ serie }: { serie: PointChurn[] }) {
  // Les six derniers mois : au delà, la ligne du haut est vide et fait
  // croire que la donnée manque, alors que le business n'existait pas.
  const lignes = serie.slice(-6).reverse();
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm font-semibold">Churn mensuel</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          La part des abonnements qui se sont arrêtés dans le mois, sur ceux qui étaient
          en cours au premier jour.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-1 font-medium">Mois</th>
                <th className="pb-1 text-right font-medium">Payants au début</th>
                <th className="pb-1 text-right font-medium">Nouveaux</th>
                <th className="pb-1 text-right font-medium">Partis</th>
                <th className="pb-1 text-right font-medium">Taux</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.mois} className="border-t">
                  <td className="py-1.5">{moisLabel(l.mois)}</td>
                  <td className="py-1.5 text-right tabular-nums">{l.base}</td>
                  <td className="py-1.5 text-right tabular-nums text-emerald-700">
                    {l.nouveaux > 0 ? `+${l.nouveaux}` : "0"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{l.partis}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {l.tauxPct === null ? (
                      <span className="text-muted-foreground">trop peu</span>
                    ) : (
                      `${l.tauxPct} %`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          En dessous de {BASE_MIN_CHURN} payants au premier jour du mois, le taux n&apos;est pas
          calculé : un départ sur trois personnes ferait 33 %, ce qui ne dit rien de ton business.
        </p>
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

      <RevenuRecurrent mrr={stats.mrr} />

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

      <Produits parProduit={stats.parProduit} />

      <Barres
        titre="Ventes par mois"
        serie={stats.ventes}
        sousTitre={
          stats.ventesParProduit.length
            ? `Ce mois ci : ${stats.ventesParProduit
                .map((p) => `${p.valeur} ${NOM_PRODUIT[p.produit]}`)
                .join(", ")}.`
            : "Le nombre de ventes encaissées, toutes sources confondues."
        }
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
      <Churn serie={stats.churn} />
      <Plans plans={stats.plans} />
    </div>
  );
}
