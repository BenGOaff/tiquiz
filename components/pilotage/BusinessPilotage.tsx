"use client";

// components/pilotage/BusinessPilotage.tsx
//
// CE QUI RENTRE CONTRE CE QUI SORT (Béné, 29 août 2026).
//
// "Équilibre entre ventes (ce qui rentre) et affiliation (ce qui sort),
// churn, revenu récurrent. Je dois voir facilement ce que je vais
// rentrer et sortir tous les mois sur toutes les app."
//
// -- DEUX BLOCS, ET ILS NE S'ADDITIONNENT JAMAIS ----------------------
//
// La BALANCE est une recette : ce qui est vraiment rentré sur la
// période, moins ce qu'on doit dessus. Le RÉCURRENT est une projection :
// ce qui se renouvellera. Les mettre dans le même total ferait compter
// deux fois le même argent, et c'est le genre de chiffre sur lequel on
// prend une décision.
//
// -- "JE N'AI PAS PU LIRE" N'EST PAS "ÇA N'A RIEN COÛTÉ" --------------
//
// Une liaison muette afficherait sinon une marge parfaite. L'écran dit
// qu'il ne sait pas, et retire le net plutôt que d'en inventer un.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { CARTE } from "@/components/pilotage/carte";
import { balance, previsionnel, type CoutAffiliation } from "@/lib/pilotage/business";
import { moisLabel } from "@/lib/admin/adminStats";
import type { Mrr, PointChurn } from "@/lib/admin/mrr";

type Donnees = {
  resume: { encaisseCents: number; rembourseCents: number; ventes: number; nouveauxComptes: number; departs: number };
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

  const cout = d?.coutAffiliation ?? null;
  const b = d ? balance(d.resume.encaisseCents, cout ?? { duesCents: 0, sousGarantieCents: 0, verseesCents: 0, annuleesCents: 0, autresDevises: 0, tronque: false }) : null;
  const prev = d && cout ? previsionnel(d.mrr.cents, b?.partPct ?? null) : null;

  return (
    <div className="space-y-5">
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

      {d && b && (
        <>
          {/* ── LA BALANCE DE LA PÉRIODE ────────────────────────────── */}
          <section className={`${CARTE} p-5`}>
            <h2 className="text-sm font-medium">Ce qui rentre, ce qui sort</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Poste titre="Encaissé" valeur={euros(b.entreCents)} note={`${d.resume.ventes} ventes`} />
              <Poste
                titre="Commissions engagées"
                valeur={cout ? euros(b.sortCents) : "inconnu"}
                note={
                  cout
                    ? `${euros(cout.duesCents)} à verser, ${euros(cout.sousGarantieCents)} sous garantie`
                    : "l'espace affilié n'a pas répondu"
                }
              />
              <Poste
                titre="Net"
                valeur={cout ? euros(b.netCents) : "-"}
                note={
                  cout
                    ? b.partPct === null
                      ? "rien n'est rentré sur la période"
                      : `${b.partPct} % de l'encaissé part en commissions`
                    : "on ne l'affiche pas tant qu'on ne sait pas ce qui sort"
                }
                fort
              />
            </div>
            {d.resume.rembourseCents > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {euros(d.resume.rembourseCents)} remboursés sur la période, comptés dans le mois
                où ils sortent et pas dans celui de la vente.
              </p>
            )}
            {cout?.autresDevises ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {cout.autresDevises} commission{cout.autresDevises > 1 ? "s" : ""} en devise
                étrangère, non additionnée{cout.autresDevises > 1 ? "s" : ""} : on ne convertit
                pas, un taux inventé donnerait une balance fausse.
              </p>
            ) : null}
            {!cout && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-xs dark:bg-amber-950/20">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  L&apos;espace affilié n&apos;a pas répondu. Le net n&apos;est pas affiché :
                  &quot;je n&apos;ai pas pu lire&quot; et &quot;ça n&apos;a rien coûté&quot; sont
                  deux réponses différentes, et la seconde montrerait une marge fausse.
                </span>
              </p>
            )}
          </section>

          {/* ── LE RÉCURRENT, QUI NE S'ADDITIONNE PAS À LA BALANCE ──── */}
          <section className={`${CARTE} p-5`}>
            <h2 className="text-sm font-medium">Ce qui se renouvelle</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Une projection, pas une recette : ces euros ne sont pas encore rentrés, et ils ne
              s&apos;ajoutent pas à l&apos;encaissé ci-dessus.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Poste
                titre="Revenu récurrent"
                valeur={euros(d.mrr.cents)}
                note={`${d.mrr.abonnes} abonnements`}
                fort
              />
              <Poste
                titre="Déjà perdu"
                valeur={euros(d.mrr.enSursisCents)}
                note={`${d.mrr.partants} ont demandé à partir`}
              />
              <Poste
                titre="Net attendu"
                valeur={prev === null ? "-" : euros(prev)}
                note={
                  prev === null
                    ? "il faut connaître la part qui repart en commissions"
                    : "récurrent moins la part qui repart en commissions"
                }
              />
            </div>
            {d.mrr.parPlan.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {d.mrr.parPlan
                  .map((p) => `${p.plan} : ${p.abonnes} (${euros(p.cents)})`)
                  .join(" · ")}
              </p>
            )}
            {d.mrr.nonChiffrables.length > 0 && (
              // ON NE DEVINE PAS UN PRIX, et on ne cache pas ceux qu'on
              // ne sait pas chiffrer : ils existent.
              <p className="mt-1 text-xs text-muted-foreground">
                Non chiffrés :{" "}
                {d.mrr.nonChiffrables.map((p) => `${p.plan} (${p.personnes})`).join(", ")}
              </p>
            )}
          </section>

          {/* ── LE CHURN ────────────────────────────────────────────── */}
          <section className={`${CARTE} p-5`}>
            <h2 className="text-sm font-medium">Départs, mois par mois</h2>
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
                  {d.churn.filter((p) => p.base > 0 || p.nouveaux > 0 || p.partis > 0).map((p) => (
                    <tr key={p.mois} className="border-b last:border-0">
                      <td className="py-1.5 pr-4">{moisLabel(p.mois)}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">{p.base}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                        {p.nouveaux > 0 ? `+${p.nouveaux}` : "-"}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {p.partis > 0 ? `-${p.partis}` : "-"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {/* UN TAUX SUR UNE BASE TROP PETITE N'EST PAS UN
                            TAUX. `null` n'est pas zéro : les effectifs
                            bruts disent déjà ce qu'il y a à dire. */}
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

function Poste({
  titre,
  valeur,
  note,
  fort,
}: {
  titre: string;
  valeur: string;
  note?: string;
  fort?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{titre}</p>
      <p className={`mt-1 tabular-nums ${fort ? "text-2xl font-semibold" : "text-xl font-medium"}`}>
        {valeur}
      </p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
