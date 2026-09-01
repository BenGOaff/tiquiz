"use client";

// components/pilotage/GraphiqueEncaisse.tsx
//
// LES VENTES CHAQUE JOUR (Béné, 29 août 2026).
//
// "Je t'ai demandé mille fois de t'inspirer de Systeme.io qui donne les
// ventes chaque jour. Une barre toute seule, tu veux que j'en fasse
// quoi ?"
//
// Le pas (jour ou mois) est décidé par `lib/pilotage/serieEmpilee.ts`,
// selon la période choisie. Ce composant ne le devine pas : un aperçu
// qui recalcule une décision finit toujours par dessiner autre chose que
// ce que le titre annonce.
//
// -- CE QUI COMPTE DANS CE FICHIER -------------------------------------
//
// LES HAUTEURS SONT EN PIXELS. Un pourcentage dans une colonne flex sans
// hauteur propre s'écrase à zéro : c'est ce qui avait produit un
// graphique sans barres, avec des montants qui flottaient au dessus du
// vide.
//
// UNE ÉTIQUETTE SUR N. Trente dates écrites côte à côte se chevauchent.
// `etiquettesVisibles` en garde une sur n, la première et la dernière
// toujours : ce sont elles qui disent ce que le graphique couvre.
//
// PAS UN NOMBRE SUR CHAQUE COLONNE. Le meilleur jour porte le sien, le
// reste se lit au survol et dans le tableau.
//
// UN TABLEAU EST TOUJOURS DISPONIBLE. Une couleur n'est jamais la seule
// information, et c'est aussi le plus pratique pour le chiffre exact.
//
// LES COULEURS VIENNENT DE globals.css (`--pil-*`), validées dans les
// deux modes. Ne pas les réécrire ici : ce serait une deuxième liste.

import { useState } from "react";

import {
  etiquettesVisibles,
  labelJourLong,
  segmentsDessin,
  type PointEmpile,
  type SerieEmpilee,
  PRODUITS_ORDRE,
} from "@/lib/pilotage/serieEmpilee";
import { NOM_PRODUIT, type Produit } from "@/lib/admin/saleProduct";
import { CARTE } from "@/components/pilotage/carte";

const COULEUR: Record<Produit, string> = {
  tiquiz: "var(--pil-tiquiz)",
  atelier: "var(--pil-atelier)",
  inconnu: "var(--pil-autre)",
};

const HAUTEUR_TRACE = 176;

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function eurosPrecis(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

/** Ce que dit l'infobulle d'un point. */
function detail(m: PointEmpile, pas: "jour" | "mois"): string {
  const quand = pas === "jour" ? labelJourLong(m.cle) : m.label;
  if (m.totalCents === 0) return `${quand} : aucune vente`;
  const lignes = PRODUITS_ORDRE.filter((p) => m.parProduit[p] > 0).map(
    (p) => `${NOM_PRODUIT[p]} ${eurosPrecis(m.parProduit[p])}`,
  );
  return `${quand} : ${eurosPrecis(m.totalCents)}\n${lignes.join("\n")}`;
}

export function GraphiqueEncaisse({ serie }: { serie: SerieEmpilee }) {
  const [tableau, setTableau] = useState(false);
  // Le survol ouvre une vraie infobulle, en plus du `title` natif : sur
  // une colonne d'un jour, l'infobulle du navigateur met une seconde à
  // venir, et on a déjà changé de colonne.
  const [survol, setSurvol] = useState<number | null>(null);

  // CE QU'ON NE SAIT PAS SE DIT, on ne dessine pas un cadre vide.
  if (!serie.fiable) {
    return (
      <section className={`${CARTE} p-5`}>
        <h2 className="text-sm font-medium">Encaissé</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {serie.raison === "aucune-donnee"
            ? "Aucune vente sur la période lue. Rien n'est dessiné tant qu'il n'y a rien à dessiner."
            : `${serie.concernees} vente${serie.concernees > 1 ? "s" : ""} sans montant connu. `
              + "Le graphique est retiré plutôt que de montrer une somme fausse."}
        </p>
      </section>
    );
  }

  const titre = serie.pas === "jour" ? "Encaissé jour par jour" : "Encaissé par mois";
  const max = Math.max(1, ...serie.points.map((m) => m.totalCents));
  const iMax = serie.points.findIndex((m) => m.totalCents === max && m.totalCents > 0);
  // Sur beaucoup de colonnes, une largeur estimée suffit à décider
  // combien de tags tiennent : on ne mesure pas le DOM, ce qui
  // ferait dépendre le rendu d'un cycle de mise en page.
  const visibles = new Set(etiquettesVisibles(serie.points.length, 900));
  const jours = serie.pas === "jour";
  const avecVente = serie.points.filter((m) => m.totalCents > 0).length;

  return (
    <section className={`${CARTE} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">{titre}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm">
            <span className="font-semibold tabular-nums">{euros(serie.totalCents)}</span>{" "}
            <span className="text-muted-foreground">
              sur {serie.points.length} {jours ? "jour" : "mois"}
              {serie.points.length > 1 ? "s" : ""}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setTableau((v) => !v)}
            className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            {tableau ? "Voir le graphique" : "Voir les chiffres"}
          </button>
        </div>
      </div>

      {/* LA LÉGENDE EST TOUJOURS LÀ dès deux séries : sans elle,
          l'identité d'un segment reposerait sur la couleur seule. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {serie.presents.map((p) => (
          <span key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: COULEUR[p] }}
              aria-hidden
            />
            {NOM_PRODUIT[p]}
          </span>
        ))}
        {/* SUR UNE PÉRIODE QUOTIDIENNE, LE NOMBRE DE JOURS QUI VENDENT
            est l'information qu'on vient chercher. Un mois à 1 200 € en
            trois jours et un mois à 1 200 € étalé ne se pilotent pas
            pareil. */}
        {jours && (
          <span className="ml-auto text-xs text-muted-foreground">
            {avecVente} jour{avecVente > 1 ? "s" : ""} avec au moins une vente
          </span>
        )}
      </div>

      {tableau ? (
        <div className="mt-4 max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-4 font-normal">{jours ? "Jour" : "Mois"}</th>
                {serie.presents.map((p) => (
                  <th key={p} className="py-1.5 pr-4 text-right font-normal">
                    {NOM_PRODUIT[p]}
                  </th>
                ))}
                <th className="py-1.5 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Les jours à zéro sont retirés DU TABLEAU : ils portent
                  le rythme sur le dessin, ils n'ajoutent que des lignes
                  vides à faire défiler ici. */}
              {serie.points
                .filter((m) => m.totalCents > 0)
                .map((m) => (
                  <tr key={m.cle} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{m.label}</td>
                    {serie.presents.map((p) => (
                      <td key={p} className="py-1.5 pr-4 text-right tabular-nums">
                        {m.parProduit[p] ? eurosPrecis(m.parProduit[p]) : "-"}
                      </td>
                    ))}
                    <td className="py-1.5 text-right font-medium tabular-nums">
                      {eurosPrecis(m.totalCents)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="relative mt-5">
            {/* L'INFOBULLE. Elle est ancrée en haut du tracé et pas sur
                la colonne : sur une barre de trois pixels, une bulle
                collée à la barre sort du cadre. */}
            {survol !== null && serie.points[survol] && (
              <div
                className="pointer-events-none absolute -top-1 z-10 whitespace-pre rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md"
                style={{
                  left: `${((survol + 0.5) / serie.points.length) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {detail(serie.points[survol], serie.pas)}
              </div>
            )}
            <div
              // Un filet de base ancre les colonnes : sans lui, une barre
              // de trois pixels flotte au lieu de reposer sur quelque chose.
              className={`flex items-end border-b ${jours ? "gap-px" : "gap-2 sm:gap-3"}`}
              style={{ height: `${HAUTEUR_TRACE + 20}px` }}
              onMouseLeave={() => setSurvol(null)}
            >
              {serie.points.map((m, i) => {
                const segments = segmentsDessin(m, max, HAUTEUR_TRACE);
                const nomme = i === iMax;
                return (
                  <div
                    key={m.cle}
                    className="group flex min-w-0 flex-1 cursor-default flex-col items-center justify-end"
                    onMouseEnter={() => setSurvol(i)}
                    onFocus={() => setSurvol(i)}
                    tabIndex={0}
                    title={detail(m, serie.pas)}
                  >
                    {/* Le total, seulement là où il apprend quelque
                        chose : le meilleur jour. Le reste au survol. */}
                    <span
                      className={[
                        "mb-1 h-4 truncate text-[11px] tabular-nums",
                        nomme ? "font-semibold text-foreground" : "text-transparent",
                      ].join(" ")}
                    >
                      {nomme && m.totalCents > 0 ? euros(m.totalCents) : ""}
                    </span>
                    {/* La barre est BORNÉE en largeur en mensuel : une
                        barre qui remplit toute sa colonne demande plus
                        d'encre qu'il n'y a d'information. En quotidien
                        elle prend sa colonne, sinon elle disparaît. */}
                    <div
                      className={`flex w-full flex-col-reverse justify-end ${
                        jours ? "gap-px" : "max-w-14 gap-[2px]"
                      } ${survol === i ? "opacity-100" : survol === null ? "" : "opacity-60"}`}
                    >
                      {segments.length === 0 ? (
                        // UN JOUR SANS VENTE LAISSE SA TRACE. Sans ce
                        // filet, un creux est indistinguable d'un trou
                        // dans le graphique.
                        <div className="h-[2px] w-full rounded-sm bg-border" />
                      ) : (
                        segments.map((s, j) => (
                          <div
                            key={s.produit}
                            className={j === segments.length - 1 ? "rounded-t-[2px]" : ""}
                            style={{
                              height: `${s.hauteurPx}px`,
                              backgroundColor: COULEUR[s.produit],
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`mt-2 flex ${jours ? "gap-px" : "gap-2 sm:gap-3"}`}>
            {serie.points.map((m, i) => (
              <span
                key={m.cle}
                className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground"
              >
                {visibles.has(i) ? m.label : ""}
              </span>
            ))}
          </div>
        </>
      )}

      {/* CE QUE LE TOTAL CONTIENT. Un montant venu du tarif du plan
          compte, mais il se dit : sinon un écart avec la banque reste
          mystérieux. */}
      {serie.estimees > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Dont {serie.estimees} vente{serie.estimees > 1 ? "s" : ""} chiffrée
          {serie.estimees > 1 ? "s" : ""} au tarif du plan, remise éventuelle non déduite.
        </p>
      )}
    </section>
  );
}
