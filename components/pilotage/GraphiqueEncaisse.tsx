"use client";

// components/pilotage/GraphiqueEncaisse.tsx
//
// UN SEUL GRAPHIQUE, EMPILÉ PAR PRODUIT (Béné, 29 août 2026).
//
// "On pourrait tout avoir sur un seul graphique avec des codes couleurs
// par exemple." Trois graphiques empilés l'un sous l'autre demandaient
// de faire la somme de tête ; un seul empilé la fait pour elle.
//
// -- CE QUI CHANGE PAR RAPPORT À L'ANCIEN, ET POURQUOI -----------------
//
// LES HAUTEURS SONT EN PIXELS. L'ancienne barre portait un pourcentage
// dans une colonne sans hauteur propre : le pourcentage ne se calculait
// sur rien et la barre s'écrasait à zéro. D'où des montants qui
// flottaient au dessus du vide. La géométrie vit dans
// `lib/pilotage/serieEmpilee.ts`, pure et testée.
//
// PAS UN NOMBRE SUR CHAQUE COLONNE. Le mois le plus fort et le dernier
// portent leur total ; le reste se lit au survol et dans le tableau.
// Douze nombres alignés en 10px, c'est ce qu'elle appelle illisible.
//
// UN TABLEAU EST TOUJOURS DISPONIBLE. C'est l'accessibilité (une couleur
// ne doit jamais être la seule information) et c'est aussi le plus
// pratique quand on veut le chiffre exact.
//
// LES COULEURS VIENNENT DE globals.css (`--pil-*`), validées par le
// script de palette dans les DEUX modes. Ne pas les réécrire ici : ce
// serait une deuxième liste, donc une divergence programmée.

import { useState } from "react";

import {
  segmentsDessin,
  type SerieEmpilee,
  PRODUITS_ORDRE,
} from "@/lib/pilotage/serieEmpilee";
import { NOM_PRODUIT, type Produit } from "@/lib/admin/saleProduct";
import { moisLabel } from "@/lib/admin/adminStats";
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

export function GraphiqueEncaisse({ serie }: { serie: SerieEmpilee }) {
  const [tableau, setTableau] = useState(false);

  // CE QU'ON NE SAIT PAS SE DIT, on ne dessine pas un cadre vide.
  if (!serie.fiable) {
    return (
      <section className={`${CARTE} p-5`}>
        <h2 className="text-sm font-medium">Encaissé par mois</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {serie.raison === "aucune-donnee"
            ? "Aucune vente sur la période lue. Rien n'est dessiné tant qu'il n'y a rien à dessiner."
            : `${serie.concernees} vente${serie.concernees > 1 ? "s" : ""} sans montant connu. `
              + "Le graphique est retiré plutôt que de montrer une somme fausse."}
        </p>
      </section>
    );
  }

  const max = Math.max(1, ...serie.mois.map((m) => m.totalCents));
  const iMax = serie.mois.findIndex((m) => m.totalCents === max);
  const iDernier = serie.mois.length - 1;

  return (
    <section className={`${CARTE} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Encaissé par mois</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {euros(serie.totalCents)} sur la période
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
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
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
      </div>

      {tableau ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-4 font-normal">Mois</th>
                {serie.presents.map((p) => (
                  <th key={p} className="py-1.5 pr-4 text-right font-normal">
                    {NOM_PRODUIT[p]}
                  </th>
                ))}
                <th className="py-1.5 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {serie.mois.map((m) => (
                <tr key={m.mois} className="border-b last:border-0">
                  <td className="py-1.5 pr-4">{moisLabel(m.mois)}</td>
                  {serie.presents.map((p) => (
                    <td key={p} className="py-1.5 pr-4 text-right tabular-nums">
                      {m.parProduit[p] ? euros(m.parProduit[p]) : "-"}
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-medium tabular-nums">
                    {euros(m.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div
            // Un filet de base ancre les colonnes : sans lui, une
            // barre de trois pixels flotte au lieu de reposer sur
            // quelque chose.
            className="mt-5 flex items-end gap-2 border-b sm:gap-3"
            style={{ height: `${HAUTEUR_TRACE + 20}px` }}
          >
            {serie.mois.map((m, i) => {
              const segments = segmentsDessin(m, max, HAUTEUR_TRACE);
              const nomme = i === iMax || i === iDernier;
              return (
                <div
                  key={m.mois}
                  className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                  title={
                    m.totalCents === 0
                      ? `${moisLabel(m.mois)} : rien`
                      : `${moisLabel(m.mois)} : ${euros(m.totalCents)}\n`
                        + PRODUITS_ORDRE.filter((p) => m.parProduit[p] > 0)
                          .map((p) => `${NOM_PRODUIT[p]} ${euros(m.parProduit[p])}`)
                          .join("\n")
                  }
                >
                  {/* Le total, seulement là où il apprend quelque chose. */}
                  <span
                    className={[
                      "mb-1 h-4 truncate text-[11px] tabular-nums",
                      nomme ? "font-semibold text-foreground" : "text-transparent",
                      "group-hover:text-foreground",
                    ].join(" ")}
                  >
                    {m.totalCents > 0 ? euros(m.totalCents) : ""}
                  </span>
                  {/* La colonne. `gap-[2px]` sépare les segments par la
                      couleur du fond : sans ce filet, deux teintes
                      voisines se touchent et se lisent comme une seule. */}
                  {/* La barre est BORNÉE en largeur. Une barre qui
                      remplit toute sa colonne écrase le graphique et
                      demande plus d'encre qu'il n'y a d'information. */}
                  <div className="flex w-full max-w-14 flex-col-reverse justify-end gap-[2px]">
                    {segments.length === 0 ? (
                      <div className="h-[2px] w-full rounded-sm bg-border" />
                    ) : (
                      segments.map((s, j) => (
                        <div
                          key={s.produit}
                          className={j === segments.length - 1 ? "rounded-t" : ""}
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
          <div className="mt-2 flex gap-2 sm:gap-3">
            {serie.mois.map((m) => (
              <span
                key={m.mois}
                className="min-w-0 flex-1 truncate text-center text-[11px] text-muted-foreground"
              >
                {moisLabel(m.mois)}
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
