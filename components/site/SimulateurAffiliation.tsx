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
// -- DES CURSEURS, ET LE PALIER QUI SE VOIT (Béné, même jour) ---------
//
// "Elle prend en compte l'augmentation de palier ? Il faut ! [...] la
// calculatrice elle doit prendre en compte le taux suivant le nb
// d'affiliés. Aussi fais la plus ergonomique, avec des curseurs et pas
// des boutons plus moins."
//
// Le taux ÉTAIT pris en compte : `simulerParPlan` appelle
// `tauxCommissionPct` sur le TOTAL des filleuls. Ce qui manquait, c'est
// qu'on ne le VOYAIT nulle part. Un barème invisible ne donne à personne
// l'envie de pousser un curseur, et il laisse croire que le chiffre est
// un simple produit.
//
// L'écran dit donc trois choses en même temps : le taux courant, la
// marche suivante (`prochaineMarcheCommission`, calculée dans le lib,
// jamais réécrite ici), et ce que la marche a déjà ajouté par rapport au
// taux de base.
//
// Un curseur bouge en continu, donc le chiffre bouge pendant qu'on tire,
// donc la mécanique se comprend sans la lire. Les boutons plus/moins
// demandaient dix clics pour atteindre la première marche.
//
// -- AUCUN APLAT DE COULEUR SOUS DU TEXTE (Béné, 31 août 2026) --------
//
// "Supprime l'arrière plan bleu sous le texte c'est pas adapté, pas
// beau, j'en veux pas, nulle part. Au pire mets carrément le texte en
// couleur, mais dans les couleurs Tiquiz pas couleurs des vignettes.
// Notre branding c'est celui des pages de vente tiquiz.fr et
// atelierduquiz.fr pas les vignettes."
//
// C'est la TROISIÈME fois que la remarque sort : "l'encart est tout
// pété" (3 août), "les encarts bleu sont moches j'en veux pas"
// (30 août), et ici. Le motif est toujours le même : on prend les
// couleurs d'un VISUEL (une couverture d'article, une vignette sombre)
// et on les applique à une INTERFACE. Un dessin peut vivre sur un fond
// marine ; une page de vente qui doit se lire, non.
//
// **Règle : fond blanc, texte à l'encre, UN seul accent bleu, et il est
// un FILET HORIZONTAL ou un CHIFFRE en couleur.** C'est exactement le
// gabarit de `EncartCta`, validé le 30 août. Le chiffre qui compte se
// distingue par sa TAILLE et sa COULEUR, pas par un rectangle derrière
// lui.
//
// INTERDIT ici : `bg-[var(--tq-marine)]`, `bg-[var(--tq-bleu)]` sous du
// texte, et tout `text-white` qui en découlerait. Le bleu de la piste du
// curseur est une exception assumée : rien n'est écrit dessus.
//
// -- LE CALCUL N'EST PAS ICI -------------------------------------------
//
// Il vit dans `lib/site/recompenseAffiliation.ts`, pur et testé. Un
// barème enfermé dans un composant React n'est pas testable, donc il
// n'est pas testé, donc c'est exactement là que les bugs de chiffres
// s'installent.

import { useId, useMemo, useState, type ReactNode } from "react";

import {
  OWNER_CATALOG,
  OWNER_PRODUCT_ORDER,
  formatCents,
  type OwnerProductId,
} from "@/lib/checkout/catalog";
import {
  COMMISSION_BASE_PCT,
  COMMISSION_MAX_PCT,
  PALIER_FILLEULS,
  REMISE_ABO_MAX_PCT,
  prochaineMarcheCommission,
  simulerParPlan,
  type FilleulsParPlan,
} from "@/lib/site/recompenseAffiliation";
import { LANGUE_SANS_PREFIXE, type LanguePublique } from "@/lib/site/langues";

/** Le haut du curseur. 100 filleuls, c'est la gratuité de l'abonnement. */
const MAX_CURSEUR = 100;

/**
 * LE TEXTE DE L'ÉCRAN, PAR LANGUE.
 *
 * Les phrases dont le milieu porte un `<strong>` sont des FONCTIONS qui
 * rendent du JSX, jamais trois chaînes recollées autour d'une balise :
 * "encore N filleuls et tu passes à X %" ne se traduit pas morceau par
 * morceau, et l'anglais n'ordonne pas ses mots comme le français.
 *
 * ET LES MONTANTS RESTENT EN EUROS, seul leur FORMAT change (`5,67 €`
 * contre `€5.67`) : un affilié anglophone est payé en euros comme les
 * autres, et convertir afficherait un versement qui n'aura pas lieu.
 */
interface TexteSimulateur {
  /** L'unité qui suit un prix de formule : "mois" / "an". */
  parMois: string;
  parAn: string;
  /** Le gain d'une ligne de curseur, déjà formaté. */
  gainParMois: (montant: string) => string;
  curseurLabel: (nom: string) => string;
  curseurNombreLabel: (nom: string) => string;
  titreCurseurs: string;
  introCurseurs: string;
  labelRente: string;
  labelTaux: (filleuls: number) => string;
  deplus: (montant: string, basePct: number) => string;
  vide: string;
  marcheSuivante: (manque: number, tauxPct: number, annuel: string) => ReactNode;
  auMaximum: (maxPct: number, annuel: string) => ReactNode;
  titreProgression: string;
  introProgression: (palier: number) => string;
  labelPlusDeCommission: string;
  labelMoinsDAbonnement: string;
  aFilleuls: (filleuls: number) => string;
  texteCommission: (basePct: number, maxPct: number) => string;
  gratuit: string;
  texteRemise: (palier: number, maxPct: number, basePct: number) => string;
  avertissement: string;
}

const TEXTES: Record<LanguePublique, TexteSimulateur> = {
  fr: {
    parMois: "mois",
    parAn: "an",
    gainParMois: (m) => `${m} / mois`,
    curseurLabel: (nom) => `Filleuls sur ${nom}`,
    curseurNombreLabel: (nom) => `Nombre de filleuls sur ${nom}`,
    titreCurseurs: "Tes filleuls, et la formule qu'ils prennent",
    introCurseurs:
      "Tire les curseurs. Ton audience mélangera plusieurs formules, et ton taux monte avec le nombre total de filleuls.",
    labelRente: "Ta rente, chaque mois",
    labelTaux: (f) => `Ton taux à ${f} filleuls`,
    deplus: (m, base) => `soit ${m} / mois de plus que les ${base} % de départ`,
    vide: "Tire un curseur pour voir ce que ça donne.",
    marcheSuivante: (manque, taux, annuel) => (
      <>
        Encore {manque} filleul{manque > 1 ? "s" : ""} et tu passes à <strong>{taux} %</strong>. Sur
        douze mois, ça fait <strong>{annuel}</strong>, tant qu&apos;ils restent abonnés.
      </>
    ),
    auMaximum: (max, annuel) => (
      <>
        Tu es au taux maximum, {max} %. Sur douze mois, ça fait <strong>{annuel}</strong>, tant
        qu&apos;ils restent abonnés.
      </>
    ),
    titreProgression: "Ta progression, et ce que tu en fais",
    introProgression: (palier) =>
      `Tes filleuls te font monter d'une marche tous les ${palier}. Tu choisis ce que cette marche te rapporte : une commission plus forte, ou un abonnement moins cher. Une seule des deux à la fois, et ça se change quand tu veux depuis ton espace affilié.`,
    labelPlusDeCommission: "Augmenter tes commissions",
    labelMoinsDAbonnement: "Ou faire baisser ton abonnement",
    aFilleuls: (f) => `à ${f} filleul${f > 1 ? "s" : ""}`,
    texteCommission: (base, max) =>
      `C'est l'option retenue dans le calcul ci-dessus. Elle démarre à ${base} % et monte jusqu'à ${max} %.`,
    gratuit: "gratuit",
    texteRemise: (palier, max, base) =>
      `Sur ton propre abonnement Tiquiz : une marche tous les ${palier} filleuls, offert à ${max}. Dans ce cas, ta commission reste à ${base} %.`,
    avertissement:
      "Les commissions sont calculées hors taxes, et une formule annuelle est lissée sur douze mois pour pouvoir l'additionner au mensuel. C'est une fenêtre de calcul, pas une prévision : la commission s'arrête si la personne arrête son abonnement ou se fait rembourser, et les mois déjà versés te restent acquis. Personne ne peut te promettre un nombre de filleuls : ça, c'est ton travail.",
  },
  en: {
    parMois: "month",
    parAn: "year",
    gainParMois: (m) => `${m} / month`,
    curseurLabel: (nom) => `Referrals on ${nom}`,
    curseurNombreLabel: (nom) => `Number of referrals on ${nom}`,
    titreCurseurs: "Your referrals, and the plan they pick",
    introCurseurs:
      "Drag the sliders. Your audience will mix several plans, and your rate climbs with the total number of referrals.",
    labelRente: "Your income, every month",
    labelTaux: (f) => `Your rate at ${f} referrals`,
    deplus: (m, base) => `that is ${m} / month more than the ${base} % you start at`,
    vide: "Drag a slider to see what it adds up to.",
    marcheSuivante: (manque, taux, annuel) => (
      <>
        {manque} more referral{manque > 1 ? "s" : ""} and you move up to <strong>{taux} %</strong>.
        Over twelve months that is <strong>{annuel}</strong>, for as long as they stay subscribed.
      </>
    ),
    auMaximum: (max, annuel) => (
      <>
        You are at the top rate, {max} %. Over twelve months that is <strong>{annuel}</strong>, for
        as long as they stay subscribed.
      </>
    ),
    titreProgression: "How you move up, and what you do with it",
    introProgression: (palier) =>
      `Every ${palier} referrals move you up a step. You decide what that step gives you: a higher commission, or a cheaper subscription. One or the other, never both, and you can switch whenever you want from your affiliate area.`,
    labelPlusDeCommission: "Raise your commission",
    labelMoinsDAbonnement: "Or lower your own subscription",
    aFilleuls: (f) => `at ${f} referral${f > 1 ? "s" : ""}`,
    texteCommission: (base, max) =>
      `This is the option used in the figure above. It starts at ${base} % and climbs to ${max} %.`,
    gratuit: "free",
    texteRemise: (palier, max, base) =>
      `On your own Tiquiz subscription: one step every ${palier} referrals, free at ${max}. In that case your commission stays at ${base} %.`,
    avertissement:
      "Commissions are worked out on the amount before tax, and a yearly plan is spread over twelve months so it can be added to the monthly ones. This is a calculation, not a forecast: the commission stops if the person cancels or gets refunded, and the months already paid out stay yours. Nobody can promise you a number of referrals: that part is your work.",
  },
};

function euros(cents: number, langue: LanguePublique): string {
  return formatCents(cents, "eur", langue === "fr" ? "fr-FR" : "en-US");
}

function libelle(id: OwnerProductId): string {
  return OWNER_CATALOG[id].label.replace(/\bPlus\b/g, "PLUS").replace(/^Tiquiz /, "");
}

function prix(id: OwnerProductId, langue: LanguePublique): string {
  const p = OWNER_CATALOG[id];
  const t = TEXTES[langue];
  return `${euros(p.amountCents, langue)} / ${p.interval === "year" ? t.parAn : t.parMois}`;
}

/** Un curseur par formule : on tire, le chiffre bouge. */
function Curseur({
  produit,
  valeur,
  gainCents,
  langue,
  onChange,
}: {
  produit: OwnerProductId;
  valeur: number;
  gainCents: number;
  langue: LanguePublique;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const nom = libelle(produit);
  const t = TEXTES[langue];

  return (
    <div className="rounded-2xl border border-[var(--tq-bord)] bg-[var(--tq-panneau)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <label htmlFor={id} className="font-bold leading-tight">
          {nom}
        </label>
        <span className="tq-doux text-sm">{prix(produit, langue)}</span>
        <span className="ml-auto text-lg font-extrabold text-[var(--tq-bleu)]">
          {gainCents > 0 ? t.gainParMois(euros(gainCents, langue)) : "-"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <input
          id={id}
          type="range"
          min={0}
          max={MAX_CURSEUR}
          step={1}
          value={Math.min(valeur, MAX_CURSEUR)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={t.curseurLabel(nom)}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--tq-bord)] accent-[var(--tq-bleu)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tq-bleu)]"
        />
        {/* Le nombre reste SAISISSABLE : le curseur s'arrete a 100, et
            quelqu'un qui vise plus doit pouvoir l'ecrire. */}
        <input
          type="number"
          min={0}
          max={999}
          value={valeur}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={t.curseurNombreLabel(nom)}
          className="h-10 w-16 shrink-0 rounded-lg border border-[var(--tq-bord)] bg-white text-center text-lg font-extrabold text-[var(--tq-encre)] [appearance:textfield] focus:border-[var(--tq-bleu)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}

export default function SimulateurAffiliation({
  langue = LANGUE_SANS_PREFIXE,
}: {
  langue?: LanguePublique;
}) {
  // Un depart qui montre deja un chiffre : un simulateur ouvert a zero
  // affiche 0 EUR, et 0 EUR ne donne envie a personne de bouger un curseur.
  const [parPlan, setParPlan] = useState<FilleulsParPlan>({ mensuel: 12, annuel: 3 });

  const t = TEXTES[langue];
  const s = useMemo(() => simulerParPlan(parPlan), [parPlan]);
  const marche = useMemo(() => prochaineMarcheCommission(s.filleuls), [s.filleuls]);

  const poser = (produit: OwnerProductId, v: number) =>
    setParPlan((avant) => ({ ...avant, [produit]: Math.max(0, Math.min(999, Math.trunc(v) || 0)) }));

  const gainDe = (produit: OwnerProductId): number =>
    s.lignes.find((l) => l.produit === produit)?.mensuelCents ?? 0;

  const marcheGagne = s.mensuelCents - s.mensuelAuTauxDeBaseCents;

  return (
    <div className="rounded-3xl border border-[var(--tq-bord)] bg-white p-7 sm:p-10">
      <h3 className="text-[1.35rem]">{t.titreCurseurs}</h3>
      <p className="tq-doux mt-2 max-w-[75ch] text-[0.95rem] leading-relaxed">{t.introCurseurs}</p>

      <div className="mt-5 grid gap-3">
        {OWNER_PRODUCT_ORDER.map((id) => (
          <Curseur
            key={id}
            produit={id}
            valeur={parPlan[id] ?? 0}
            gainCents={gainDe(id)}
            langue={langue}
            onChange={(v) => poser(id, v)}
          />
        ))}
      </div>

      {/* -- LA REPONSE A SA QUESTION, ET ELLE PASSE AVANT TOUT --
          Pas d'aplat : un filet horizontal et un chiffre en couleur.
          Le chiffre se distingue par sa TAILLE, pas par un rectangle
          derriere lui (cf. l'en-tete de ce fichier). */}
      <div className="mt-8 border-t border-[var(--tq-bord)] pt-7">
        <span aria-hidden="true" className="block h-[3px] w-12 rounded-full bg-[var(--tq-bleu)]" />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <p className="tq-etiquette">{t.labelRente}</p>
            <p className="mt-1 text-[3rem] font-extrabold leading-none text-[var(--tq-bleu)]">
              {euros(s.mensuelCents, langue)}
            </p>
          </div>

          {/* LE PALIER, VISIBLE. C'est ce qui manquait a l'ecran. */}
          <div className="sm:text-right">
            <p className="tq-etiquette">{t.labelTaux(s.filleuls)}</p>
            <p className="mt-1 text-[2rem] font-extrabold leading-none text-[var(--tq-encre)]">
              {s.tauxPct} %
            </p>
            {marcheGagne > 0 ? (
              <p className="tq-doux mt-1 text-sm">
                {t.deplus(euros(marcheGagne, langue), COMMISSION_BASE_PCT)}
              </p>
            ) : null}
          </div>
        </div>

        {/* LA MARCHE SUIVANTE : le bareme devient une raison de tirer le
            curseur, au lieu d'un chiffre qu'on subit. */}
        <p className="tq-doux mt-4 text-[0.95rem] leading-relaxed">
          {s.filleuls === 0
            ? t.vide
            : marche
              ? t.marcheSuivante(marche.manque, marche.tauxPct, euros(s.annuelCents, langue))
              : t.auMaximum(COMMISSION_MAX_PCT, euros(s.annuelCents, langue))}
        </p>
      </div>

      {/* -- ET CE QUI EXISTE EN PLUS. On le MONTRE, on n'arbitre pas. -- */}
      <div className="mt-10">
        <h3 className="text-[1.35rem]">{t.titreProgression}</h3>
        <p className="tq-doux mt-2 max-w-[75ch] text-[0.95rem] leading-relaxed">
          {t.introProgression(PALIER_FILLEULS)}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--tq-bord)] bg-[var(--tq-panneau)] p-6">
            <p className="tq-etiquette">{t.labelPlusDeCommission}</p>
            <p className="mt-2 text-[1.6rem] font-extrabold leading-none text-[var(--tq-bleu)]">
              {s.tauxPct} %{" "}
              <span className="tq-doux text-[0.95rem] font-normal">{t.aFilleuls(s.filleuls)}</span>
            </p>
            <p className="tq-doux mt-3 text-[0.95rem] leading-relaxed">
              {t.texteCommission(COMMISSION_BASE_PCT, COMMISSION_MAX_PCT)}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--tq-bord)] bg-[var(--tq-panneau)] p-6">
            <p className="tq-etiquette">{t.labelMoinsDAbonnement}</p>
            <p className="mt-2 text-[1.6rem] font-extrabold leading-none text-[var(--tq-bleu)]">
              {s.remisePct >= REMISE_ABO_MAX_PCT ? t.gratuit : `-${s.remisePct} %`}{" "}
              <span className="tq-doux text-[0.95rem] font-normal">{t.aFilleuls(s.filleuls)}</span>
            </p>
            <p className="tq-doux mt-3 text-[0.95rem] leading-relaxed">
              {t.texteRemise(PALIER_FILLEULS, REMISE_ABO_MAX_PCT, COMMISSION_BASE_PCT)}
            </p>
          </div>
        </div>
      </div>

      {/* CE QUE CE CHIFFRE N'EST PAS. Obligatoire : promettre un revenu
          est exactement ce que Bene interdit. */}
      <p className="tq-doux mt-8 max-w-[85ch] text-[0.9rem] leading-relaxed">{t.avertissement}</p>
    </div>
  );
}
