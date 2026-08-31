"use client";

// components/site/SimulateurAffiliation.tsx
//
// COMBIEN TU GAGNES CHAQUE MOIS.
//
// Béné, 31 août 2026 : "la calculatrice sur la page affiliation est
// bordélique : je veux voir combien je gagne chaque mois en fonction de
// mes affiliés, et de leurs plans. Et en dessous, je veux voir
// l'option : augmenter mes commissions OU faire baisser mon abonnement.
// Le visiteur doit voir que ça existe mais là on l'aide à être séduit
// par le programme c'est tout."
//
// Le "bordélique" est précis, et il tenait en trois choses :
//
//  1. le résultat était SUR 12 MOIS, alors que la question est
//     mensuelle ;
//  2. tous les filleuls avaient le MÊME plan, alors qu'une audience
//     mélange du mensuel et de l'annuel ;
//  3. l'écran demandait SON abonnement à lui avant de montrer le
//     moindre chiffre, pour pouvoir arbitrer entre les deux
//     récompenses. Un formulaire qui interroge quelqu'un sur un
//     abonnement qu'il n'a pas encore, sur la page qui doit le
//     convaincre, c'est une porte fermée.
//
// L'ordre suit donc sa phrase : le chiffre d'abord, les deux options
// ensuite, et elles sont MONTRÉES, pas arbitrées. L'arbitrage se fait
// dans l'espace affilié, une fois inscrit, avec ses vrais filleuls.
//
// -- LE CALCUL N'EST PAS ICI -------------------------------------------
//
// Il vit dans `lib/site/recompenseAffiliation.ts`, pur et testé. Un
// barème enfermé dans un composant React n'est pas testable, donc il
// n'est pas testé, donc c'est exactement là que les bugs de chiffres
// s'installent.

import { useMemo, useState } from "react";

import {
  OWNER_CATALOG,
  OWNER_PRODUCT_ORDER,
  formatCents,
  type OwnerProductId,
} from "@/lib/checkout/catalog";
import {
  COMMISSION_MAX_PCT,
  PALIER_FILLEULS,
  REMISE_ABO_MAX_PCT,
  simulerParPlan,
  type FilleulsParPlan,
} from "@/lib/site/recompenseAffiliation";

function euros(cents: number): string {
  return formatCents(cents, "eur", "fr-FR");
}

function libelle(id: OwnerProductId): string {
  return OWNER_CATALOG[id].label.replace(/\bPlus\b/g, "PLUS").replace(/^Tiquiz /, "");
}

function prix(id: OwnerProductId): string {
  const p = OWNER_CATALOG[id];
  return `${euros(p.amountCents)} / ${p.interval === "year" ? "an" : "mois"}`;
}

/** Un compteur par palier : moins, le nombre, plus. */
function Compteur({
  produit,
  valeur,
  gainCents,
  onChange,
}: {
  produit: OwnerProductId;
  valeur: number;
  gainCents: number;
  onChange: (v: number) => void;
}) {
  const bouton =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 " +
    "bg-white/[0.06] text-xl font-bold text-white transition-colors hover:border-white/45 " +
    "disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
      <div className="min-w-[9rem] flex-1">
        <span className="block font-bold leading-tight text-white">{libelle(produit)}</span>
        <span className="block text-sm text-white/50">{prix(produit)}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={bouton}
          onClick={() => onChange(valeur - 1)}
          disabled={valeur <= 0}
          aria-label={`Un filleul de moins sur ${libelle(produit)}`}
        >
          &minus;
        </button>
        <input
          type="number"
          min={0}
          max={999}
          value={valeur}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`Filleuls sur ${libelle(produit)}`}
          className="h-10 w-16 rounded-lg border border-white/20 bg-transparent text-center text-lg font-extrabold text-white [appearance:textfield] focus:border-[var(--tq-cyan)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          className={bouton}
          onClick={() => onChange(valeur + 1)}
          aria-label={`Un filleul de plus sur ${libelle(produit)}`}
        >
          +
        </button>
      </div>

      {/* Le gain de CETTE ligne : sans lui, on voit un total sans savoir
          d'où il vient, et on ne peut pas comparer les paliers. */}
      <span className="ml-auto min-w-[6.5rem] text-right text-lg font-extrabold text-[var(--tq-cyan)]">
        {gainCents > 0 ? `${euros(gainCents)} / mois` : "—"}
      </span>
    </div>
  );
}

export default function SimulateurAffiliation() {
  // Un départ qui montre déjà un chiffre : un simulateur ouvert à zéro
  // affiche 0 €, et 0 € ne donne envie à personne de bouger un curseur.
  const [parPlan, setParPlan] = useState<FilleulsParPlan>({ mensuel: 10, annuel: 2 });

  const s = useMemo(() => simulerParPlan(parPlan), [parPlan]);

  const poser = (produit: OwnerProductId, v: number) =>
    setParPlan((avant) => ({ ...avant, [produit]: Math.max(0, Math.min(999, Math.trunc(v) || 0)) }));

  const gainDe = (produit: OwnerProductId): number =>
    s.lignes.find((l) => l.produit === produit)?.mensuelCents ?? 0;

  return (
    <div className="rounded-3xl bg-[var(--tq-marine)] p-7 sm:p-10">
      <h3 className="text-[1.35rem] text-white">Tes filleuls, et la formule qu&apos;ils prennent</h3>
      <p className="mt-2 max-w-[75ch] text-[0.95rem] leading-relaxed text-white/55">
        Compte ceux que tu vises sur chaque formule. Ton audience en mélangera plusieurs.
      </p>

      <div className="mt-5 grid gap-3">
        {OWNER_PRODUCT_ORDER.map((id) => (
          <Compteur
            key={id}
            produit={id}
            valeur={parPlan[id] ?? 0}
            gainCents={gainDe(id)}
            onChange={(v) => poser(id, v)}
          />
        ))}
      </div>

      {/* ── LA RÉPONSE À SA QUESTION, ET ELLE PASSE AVANT TOUT ── */}
      <div className="mt-7 rounded-2xl bg-[var(--tq-bleu)] p-7 text-white">
        <p className="tq-etiquette !text-white/70">Ta rente, chaque mois</p>
        <p className="mt-1 text-[3rem] font-extrabold leading-none">{euros(s.mensuelCents)}</p>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-white/85">
          {s.filleuls === 0 ? (
            "Ajoute un filleul pour voir ce que ça donne."
          ) : (
            <>
              {s.filleuls} filleul{s.filleuls > 1 ? "s" : ""} abonné
              {s.filleuls > 1 ? "s" : ""}, à {s.tauxPct} % de commission. Soit{" "}
              <strong>{euros(s.annuelCents)} sur douze mois</strong>, tant qu&apos;ils restent
              abonnés.
            </>
          )}
        </p>
      </div>

      {/* ── ET CE QUI EXISTE EN PLUS. On le MONTRE, on n'arbitre pas. ── */}
      <div className="mt-8">
        <h3 className="text-[1.35rem] text-white">Et ça monte avec tes filleuls</h3>
        <p className="mt-2 max-w-[75ch] text-[0.95rem] leading-relaxed text-white/55">
          Au delà d&apos;un certain nombre de filleuls, tu choisis ce que ta progression te
          rapporte. Une seule des deux à la fois, et ça se change quand tu veux depuis ton espace
          affilié.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-6">
            <p className="tq-etiquette !text-[var(--tq-cyan)]">Augmenter tes commissions</p>
            <p className="mt-2 text-[1.6rem] font-extrabold leading-none text-white">
              jusqu&apos;à {COMMISSION_MAX_PCT} %
            </p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-white/60">
              Ton taux monte d&apos;une marche tous les {PALIER_FILLEULS} filleuls, et la première
              s&apos;ouvre dès le premier.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-6">
            <p className="tq-etiquette !text-[var(--tq-cyan)]">Faire baisser ton abonnement</p>
            <p className="mt-2 text-[1.6rem] font-extrabold leading-none text-white">
              jusqu&apos;à la gratuité
            </p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-white/60">
              Une marche tous les {PALIER_FILLEULS} filleuls sur ton propre abonnement, offert à{" "}
              {REMISE_ABO_MAX_PCT} filleuls.
            </p>
          </div>
        </div>
      </div>

      {/* CE QUE CE CHIFFRE N'EST PAS. Obligatoire : promettre un revenu
          est exactement ce que Béné interdit. */}
      <p className="mt-7 max-w-[85ch] text-[0.9rem] leading-relaxed text-white/50">
        Les commissions sont calculées hors taxes, et une formule annuelle est lissée sur douze mois
        pour pouvoir l&apos;additionner au mensuel. C&apos;est une fenêtre de calcul, pas une
        prévision : la commission s&apos;arrête si la personne arrête son abonnement ou se fait
        rembourser, et les mois déjà versés te restent acquis. Personne ne peut te promettre un
        nombre de filleuls : ça, c&apos;est ton travail.
      </p>
    </div>
  );
}
