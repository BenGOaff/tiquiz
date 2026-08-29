"use client";

// components/pilotage/BusinessPilotage.tsx
//
// CE QUI RENTRE CONTRE CE QUI SORT (Béné, 29 août 2026).
//
// "La page business putain ce qu'elle est moche, elle donne pas envie.
// Tu peux pas me faire ressortir des chiffres importants ? Genre en haut
// revenus récurrents, commissions en cours ?"
//
// -- CE QUI CHANGE, ET POURQUOI CE N'EST PAS QUE DE LA DÉCO -----------
//
// QUATRE GRANDS CHIFFRES EN HAUT. Le premier jet alignait neuf montants
// de la même taille : quand tout a le même poids, rien ne ressort, et
// l'oeil doit lire les neuf pour trouver celui qu'il cherche. La
// hiérarchie n'est pas un ornement, c'est ce qui rend un tableau de
// bord lisible en trois secondes.
//
// ON N'EXTRAPOLE PLUS LE PROCHAIN MOIS. Béné : "on tracke les
// commissions, donc on peut estimer en temps réel les commissions à
// verser." Exact : les montants existent, commission par commission.
// L'ancien "net attendu" appliquait au récurrent le POURCENTAGE observé
// sur la période, donc il doublait dès qu'une grosse vente affiliée
// tombait dedans, sans qu'aucun abonné n'ait bougé.
//
// LES DÉCISIONS SONT DANS `lib/pilotage/business.ts`, pur et testé. Cet
// écran met en forme, il ne calcule pas.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Loader2, TrendingDown, TrendingUp } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import {
  engagement,
  tuiles,
  type CoutAffiliation,
  type TonTuile,
  type Tuile,
} from "@/lib/pilotage/business";
import { moisLabel } from "@/lib/admin/adminStats";
import type { Mrr, PointChurn } from "@/lib/admin/mrr";

type Donnees = {
  resume: {
    encaisseCents: number;
    rembourseCents: number;
    ventes: number;
    nouveauxComptes: number;
    departs: number;
  };
  periode: { libelle: string; tronquee: boolean };
  mrr: Mrr;
  churn: PointChurn[];
  coutAffiliation: CoutAffiliation | null;
};

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Les mêmes teintes que le graphique et que les pastilles de la liste :
// une couleur suit une entité dans toute la console, jamais un rang.
const TEINTE: Record<TonTuile, { accent: string; valeur: string }> = {
  positif: { accent: "var(--pil-atelier)", valeur: "var(--pil-atelier)" },
  neutre: { accent: "var(--pil-tiquiz)", valeur: "inherit" },
  sortie: { accent: "var(--pil-autre)", valeur: "var(--pil-autre)" },
};

export function BusinessPilotage() {
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

  if (!d && !erreur) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const e = d ? engagement(d.coutAffiliation) : null;
  const grands: Tuile[] = d
    ? tuiles({
        mrrCents: d.mrr.cents,
        abonnes: d.mrr.abonnes,
        encaisseCents: d.resume.encaisseCents,
        ventes: d.resume.ventes,
        engagement: e,
      })
    : [];

  // Le dernier mois qui a de la donnée : c'est lui qui dit si on gagne
  // ou si on perd des abonnés en ce moment.
  const dernier = d?.churn.filter((p) => p.base > 0 || p.nouveaux > 0 || p.partis > 0).at(-1);
  const solde = dernier ? dernier.nouveaux - dernier.partis : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Business</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {d ? d.periode.libelle : "Ce qui rentre contre ce qui sort."}
        </p>
      </div>

      {erreur && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {erreur}
        </p>
      )}

      {d && (
        <>
          {/* ── LES QUATRE CHIFFRES QUI PASSENT DEVANT ──────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {grands.map((t) => (
              <div key={t.cle} className={`${CARTE} relative overflow-hidden p-5`}>
                {/* Un filet de couleur en haut : il donne le rythme sans
                    prendre de place horizontale, donc sans décaler quoi
                    que ce soit (leçon des 4 temps du résultat). */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: TEINTE[t.ton].accent }}
                />
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.titre}
                </p>
                <p
                  className="mt-2 text-3xl font-semibold tabular-nums"
                  style={{ color: t.cents === null ? undefined : TEINTE[t.ton].valeur }}
                >
                  {t.cents === null ? (
                    <span className="text-2xl text-muted-foreground">inconnu</span>
                  ) : (
                    euros(t.cents)
                  )}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.note}</p>
              </div>
            ))}
          </div>

          {!e && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                L&apos;espace affilié n&apos;a pas répondu : les commissions et le net ne sont
                pas affichés. &quot;Je n&apos;ai pas pu lire&quot; et &quot;ça n&apos;a rien
                coûté&quot; sont deux réponses différentes, et la seconde montrerait une marge
                qui n&apos;existe pas.{" "}
                <Link href="/pilotage/sante" className="underline underline-offset-2">
                  Voir pourquoi
                </Link>
                .
              </span>
            </p>
          )}

          {/* ── CE QU'ON DOIT, ET QUAND ─────────────────────────────── */}
          {e && (
            <section className={`${CARTE} p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium">Ce qu&apos;on doit aux affiliés</h2>
                <Link
                  href="/pilotage/affilies"
                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                >
                  Qui, et combien chacun <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ces montants sont ceux des commissions enregistrées, pas une estimation. La
                seule chose qui peut encore les faire bouger est un remboursement pendant la
                garantie.
              </p>

              {/* Une seule barre, trois parts. Elle dit d'un coup d'oeil
                  ce qui est acquis et ce qui peut encore bouger. */}
              <Repartition
                parts={[
                  { cle: "verse", libelle: "Déjà versé", cents: e.verseesCents, couleur: "var(--pil-atelier)" },
                  { cle: "du", libelle: "À verser au prochain lot", cents: e.aVerserCents, couleur: "var(--pil-autre)" },
                  { cle: "garantie", libelle: "Sous garantie 30 jours", cents: e.sousGarantieCents, couleur: "color-mix(in oklab, var(--pil-autre) 45%, transparent)" },
                ]}
              />

              {e.autresDevises > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {e.autresDevises} commission{e.autresDevises > 1 ? "s" : ""} en devise
                  étrangère, non additionnée{e.autresDevises > 1 ? "s" : ""} : on ne convertit
                  pas, un taux inventé donnerait une somme fausse.
                </p>
              )}
              {d.resume.rembourseCents > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {euros(d.resume.rembourseCents)} remboursés sur la période, comptés dans le
                  mois où ils sortent et pas dans celui de la vente.
                </p>
              )}
            </section>
          )}

          {/* ── D'OÙ VIENT LE RÉCURRENT ─────────────────────────────── */}
          <section className={`${CARTE} p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium">D&apos;où vient le récurrent</h2>
              {d.mrr.enSursisCents > 0 && (
                <span className="text-xs text-muted-foreground">
                  {euros(d.mrr.enSursisCents)} déjà perdus : {d.mrr.partants} ont demandé à
                  partir
                </span>
              )}
            </div>
            {d.mrr.parPlan.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Aucun abonnement en cours.</p>
            ) : (
              <Repartition
                parts={d.mrr.parPlan.map((p, i) => ({
                  cle: p.plan,
                  libelle: `${p.plan} · ${p.abonnes} abonné${p.abonnes > 1 ? "s" : ""}`,
                  cents: p.cents,
                  couleur:
                    i === 0
                      ? "var(--pil-tiquiz)"
                      : `color-mix(in oklab, var(--pil-tiquiz) ${Math.max(25, 90 - i * 22)}%, transparent)`,
                }))}
              />
            )}
            {d.mrr.nonChiffrables.length > 0 && (
              // ON NE DEVINE PAS UN PRIX, et on ne cache pas ceux qu'on
              // ne sait pas chiffrer : ils existent.
              <p className="mt-3 text-xs text-muted-foreground">
                Non chiffrés : {d.mrr.nonChiffrables.map((p) => `${p.plan} (${p.personnes})`).join(", ")}
              </p>
            )}
          </section>

          {/* ── LES DÉPARTS ─────────────────────────────────────────── */}
          <section className={`${CARTE} p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium">Départs, mois par mois</h2>
              {solde !== null && dernier && (
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    solde >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {solde >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {solde >= 0 ? `+${solde}` : solde} en {moisLabel(dernier.mois)}
                </span>
              )}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-4 font-normal">Mois</th>
                    <th className="py-1.5 pr-4 text-right font-normal">Payants au 1er</th>
                    <th className="py-1.5 pr-4 text-right font-normal">Nouveaux</th>
                    <th className="py-1.5 pr-4 text-right font-normal">Partis</th>
                    <th className="py-1.5 text-right font-normal">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {d.churn
                    .filter((p) => p.base > 0 || p.nouveaux > 0 || p.partis > 0)
                    .map((p) => (
                      <tr key={p.mois} className="border-b last:border-0">
                        <td className="py-1.5 pr-4">{moisLabel(p.mois)}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums">{p.base}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                          {p.nouveaux > 0 ? `+${p.nouveaux}` : "-"}
                        </td>
                        <td className="py-1.5 pr-4 text-right tabular-nums">
                          {p.partis > 0 ? `-${p.partis}` : "-"}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {/* UN TAUX SUR UNE BASE TROP PETITE N'EST PAS
                              UN TAUX. `null` n'est pas zéro : les
                              effectifs bruts disent déjà ce qu'il y a à
                              dire. */}
                          {p.tauxPct === null ? (
                            <span className="text-muted-foreground">trop peu</span>
                          ) : (
                            `${p.tauxPct} %`
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * UNE BARRE, PLUSIEURS PARTS.
 *
 * Une répartition en trois nombres alignés demande de faire le rapport
 * de tête. En une barre, la proportion se voit sans lire. Les parts à
 * zéro ne sont pas dessinées mais restent LISTÉES : un zéro est une
 * information, une absence de ligne est un doute.
 */
function Repartition({
  parts,
}: {
  parts: { cle: string; libelle: string; cents: number; couleur: string }[];
}) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.cents), 0);
  return (
    <div className="mt-4">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          parts
            .filter((p) => p.cents > 0)
            .map((p) => (
              <span
                key={p.cle}
                style={{ width: `${(p.cents / total) * 100}%`, backgroundColor: p.couleur }}
                aria-hidden
              />
            ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {parts.map((p) => (
          <li key={p.cle} className="flex items-baseline gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: p.couleur }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{p.libelle}</span>
            <span className="shrink-0 font-medium tabular-nums">{euros(p.cents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
