// lib/blog/tableauxRente.ts
//
// LES TABLEAUX DE L'ARTICLE "RENTE MENSUELLE", CALCULÉS ET NON TAPÉS.
//
// Béné, 1er septembre 2026 : "rente mensuelle tiquiz : il manque tous
// les tableaux et les images, bref l'article est pourri et cassé".
//
// Elle avait raison, et ce n'était pas une impression. Trois titres se
// suivaient SANS RIEN ENTRE EUX ("2.1. Ta rente sur le plan Mensuel",
// "2.2. Ta rente sur le plan Annuel", "2.3. Pourquoi le mensuel
// rapporte plus"), et la section 8 annonçait "voici une comparaison"
// avant d'enchaîner directement sur "Verdict :". L'import depuis
// Systeme.io n'a pas su lire leurs blocs tableau : il les a laissés
// tomber, en silence, et personne ne l'a vu avant qu'elle ne lise sa
// propre page.
//
// -- POURQUOI UN MODULE PLUTÔT QUE DU HTML DANS LE JSON ----------------
//
// Parce que ce sont des MONTANTS, et que cet article a déjà brûlé deux
// fois là dessus : il a annoncé 108 €/mois pour 30 filleuls (le calcul
// de l'ancien tarif à 9 €) et 1 800 €/an pour 50 filleuls annuels.
// Un tableau tapé à la main serait faux au premier changement de tarif,
// de taux ou de base, sans que rien ne le dise.
//
// Tout tombe donc du catalogue et du barème :
//   - `OWNER_CATALOG` pour les prix affichés ;
//   - `horsTaxes` pour la base, parce que la commission se calcule sur
//     le HT (décision de Béné du 31 août) ;
//   - `tauxCommissionPct` pour la marche atteinte à ce nombre de
//     filleuls, et `commissionCentsAuTaux` pour l'arrondi au centime,
//     LES MÊMES que ceux du simulateur de la page d'affiliation.
//
// Deux calculs séparés pour le même chiffre finissent toujours par se
// contredire, et c'est l'affilié qui découvre l'écart sur son premier
// versement.
//
// -- CE QUE CE MODULE NE FAIT PAS --------------------------------------
//
// **Il ne reconstruit PAS le comparatif avec les autres programmes.**
// Le tableau perdu comparait Tiquiz à "4 programmes d'affiliation SaaS
// populaires en français", et je n'ai vérifié aucun de leurs taux. Les
// réinventer serait exactement ce que Béné interdit en premier. La
// section 8 compare donc les CRITÈRES d'une rente solide et ce que
// Tiquiz répond sur chacun : tout y est vérifiable dans notre code.

import { OWNER_CATALOG, type OwnerProductId } from "@/lib/checkout/catalog";
import { horsTaxes, PRIX_ATELIER_CENTS, TAUX } from "@/lib/site/programmeAffiliation";
import { commissionCentsAuTaux, tauxCommissionPct } from "@/lib/site/recompenseAffiliation";

/** Les nombres de filleuls montrés dans les deux tableaux de rente. */
const PALIERS_MONTRES = [1, 5, 10, 20, 30, 50] as const;

/** Un montant en euros, avec la virgule et l'espace insécable des milliers. */
export function euros(cents: number): string {
  const s = (Math.round(cents) / 100).toFixed(2).replace(".", ",");
  const [entier, decimales] = s.split(",");
  return `${entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${decimales} €`;
}

function ligne(cellules: readonly string[], balise: "td" | "th" = "td"): string {
  return `<tr>${cellules.map((c) => `<${balise}>${c}</${balise}>`).join("")}</tr>`;
}

function tableau(entetes: readonly string[], lignes: readonly (readonly string[])[]): string {
  return `<table><thead>${ligne(entetes, "th")}</thead><tbody>${lignes
    .map((l) => ligne(l))
    .join("")}</tbody></table>`;
}

/** La commission d'UNE échéance de ce palier, au taux atteint à `n` filleuls. */
export function renteUnitaireCents(produit: OwnerProductId, filleuls: number): number {
  return commissionCentsAuTaux(produit, tauxCommissionPct(filleuls));
}

/** Le tableau de rente d'un palier : une ligne par nombre de filleuls. */
function tableauRente(produit: OwnerProductId, colonneTotal: string, parAn: number): string {
  return tableau(
    ["Filleuls", "Ton taux", "Par échéance", colonneTotal],
    PALIERS_MONTRES.map((n) => {
      const unitaire = renteUnitaireCents(produit, n);
      return [
        String(n),
        `${tauxCommissionPct(n)} %`,
        euros(unitaire),
        `<strong>${euros(unitaire * n * parAn)}</strong>`,
      ];
    }),
  );
}

/** Ce que rapporte une vente de l'Atelier du Quiz, en centimes. */
export const RENTE_ATELIER_CENTS = Math.round(horsTaxes(PRIX_ATELIER_CENTS) * TAUX.atelier);

/**
 * LE BARÈME DES MARCHES, DÉRIVÉ DE `tauxCommissionPct`.
 *
 * On ne réécrit pas le découpage à la main : la marche s'ouvre au
 * PREMIER filleul de la dizaine (1 suffit pour 45 %, 11 pour 50 %), ce
 * qui n'est pas le découpage de la remise d'abonnement, et deux
 * formules pour le même barème finissent toujours par diverger.
 */
function tableauMarches(): string {
  const lignes: string[][] = [];
  let debut = 0;
  for (let n = 0; n <= 51; n++) {
    const suivant = n === 51 ? -1 : tauxCommissionPct(n + 1);
    if (suivant === tauxCommissionPct(n)) continue;
    const libelle =
      n === 51 ? "51 et plus" : debut === n ? String(n) : `${debut} à ${n}`;
    lignes.push([libelle, `${tauxCommissionPct(n)} %`]);
    debut = n + 1;
  }
  return tableau(["Filleuls qui paient", "Ton taux sur CHAQUE échéance"], lignes);
}

/**
 * LES TABLEAUX, ET L'ENDROIT OÙ CHACUN SE POSE.
 *
 * `apres` est soit l'`id` d'un titre, soit un fragment de texte présent
 * dans un bloc HTML. On insère JUSTE APRÈS ce bloc, et seulement s'il
 * n'y a pas déjà un tableau derrière : la réparation doit pouvoir
 * tourner deux fois sans rien changer la seconde.
 */
export const TABLEAUX: readonly { readonly apres: string; readonly html: string }[] = [
  {
    apres: "c'est le <strong>plancher</strong>",
    html: `${tableauMarches()}<p>Le taux s'applique à <strong>tous</strong> tes filleuls, pas seulement à ceux de la dernière marche : le jour où tu passes à 50 %, les dix premiers passent à 50 % aussi.</p>`,
  },
  {
    apres: "2-1-ta-rente-sur-le-plan-mensuel-filleuls-a-17-par-mois",
    html: `${tableauRente("mensuel", "Sur 12 mois", 12)}<p>Ta rente par échéance monte avec le nombre de filleuls : ${
      OWNER_CATALOG.mensuel.amountCents / 100
    } € TTC font ${euros(horsTaxes(OWNER_CATALOG.mensuel.amountCents))} hors taxes, et c'est sur cette base que le pourcentage s'applique.</p>`,
  },
  {
    apres: "2-2-ta-rente-sur-le-plan-annuel-filleuls-a-170-par-an",
    html: `${tableauRente("annuel", "Par an", 1)}<p>Un filleul annuel te rapporte tout d'un coup, une fois par an, au lieu de douze petites échéances. C'est la même mécanique, à un rythme différent.</p>`,
  },
  {
    apres: "Voici les critères qui comptent",
    html: tableau(
      ["Ce qui fait une rente solide", "Chez Tiquiz"],
      [
        ["La commission est-elle récurrente ?", "Oui, à chaque échéance encaissée"],
        ["Pendant combien de temps ?", "Tant que ton filleul reste abonné"],
        ["Sur quelle base ?", "Le montant hors taxes de l'échéance"],
        ["Le taux peut-il monter ?", "Oui, de 40 % à 70 % selon tes filleuls"],
        ["Combien de temps dure le cookie ?", "Un an"],
        ["Et une inscription gratuite ?", "Elle te rattache la personne à vie"],
        ["Seuil de versement", "20 €, et ce qui n'est pas atteint reste acquis"],
        ["Quand tu es payé", "30 jours après le paiement, entre le 10 et le 13"],
      ],
    ),
  },
];

/** Un bloc d'article, vu d'ici : on ne lit que ce qu'on doit reconnaître. */
type Bloc = { type?: unknown; id?: unknown; html?: unknown };

function correspond(bloc: Bloc, apres: string): boolean {
  if (bloc.type === "titre" && bloc.id === apres) return true;
  return bloc.type === "html" && typeof bloc.html === "string" && bloc.html.includes(apres);
}

/**
 * Pose les tableaux manquants dans un article, et rend combien il en a posé.
 *
 * IDEMPOTENT : un tableau déjà présent juste après son ancre n'est pas
 * reposé. C'est la même exigence que la typographie française, et pour
 * la même raison : ce pipeline tourne à chaque réparation.
 */
export function poserTableaux(blocs: Bloc[]): number {
  let poses = 0;
  for (const { apres, html } of TABLEAUX) {
    const i = blocs.findIndex((b) => correspond(b, apres));
    if (i < 0) continue;
    const suivant = blocs[i + 1];
    const dejaLa =
      suivant &&
      suivant.type === "html" &&
      typeof suivant.html === "string" &&
      suivant.html.includes("<table>");
    if (dejaLa) {
      if (suivant.html !== html) {
        suivant.html = html;
        poses++;
      }
      continue;
    }
    blocs.splice(i + 1, 0, { type: "html", html });
    poses++;
  }
  return poses;
}
