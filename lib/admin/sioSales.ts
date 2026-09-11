// lib/admin/sioSales.ts
//
// LES VENTES SYSTEME.IO, DANS LE MÊME TABLEAU QUE LES NÔTRES.
//
// Béné, 21 août : "sur mon dashboard je dois retrouver mes clients
// actuels et ceux qui sont passés et passeront encore par systeme io
// sinon c'est tout sauf fiable et exhaustif."
//
// Elle a raison, et mon premier écran l'avouait en bas de page. La
// TOTALITÉ de ses clients payants d'aujourd'hui sont arrivés par
// Systeme.io : un tableau de bord qui ne montre que nos propres ventes
// affiche un chiffre d'affaires proche de zéro et laisse croire qu'il
// n'y a rien à piloter. C'est pire qu'un écran vide, parce que c'est un
// écran qui a l'air de marcher.
//
// -- LA DONNÉE ÉTAIT DÉJÀ LÀ -------------------------------------------
//
// Rien à collecter : `webhook_logs` enregistre chaque appel de
// Systeme.io depuis le 7 août (drame Ivan), payload compris. Il ne
// manquait qu'un lecteur.
//
// -- ON NE DEVINE PAS, ON RÉUTILISE CE QUI EST DÉJÀ TESTÉ --------------
//
// Le plan vendu se lit avec `inferPlanFromOfferId` puis
// `inferPlanFromAmount`, les MÊMES fonctions que le webhook qui ouvre
// les accès. Réécrire une table de correspondance ici la ferait diverger
// de celle qui décide vraiment, et on retrouverait un tableau de bord
// qui annonce un palier différent de celui que le client a reçu.
//
// -- CE QU'ON NE SAIT PAS, ON NE L'INVENTE PAS ------------------------
//
// Le remboursement. Je n'ai pas d'événement de remboursement Systeme.io
// OBSERVÉ dans les journaux, et la leçon du 7 août est écrite noir sur
// blanc : "raisonner sur la forme SUPPOSÉE d'un payload au lieu de la
// regarder". Une vente Systeme.io est donc affichée comme encaissée, et
// l'écran dit clairement que son remboursement se fait chez eux.

import type { EventRow, Sale } from "@/lib/checkout/sales";
import { readPricePlan } from "@/lib/sio/pricePlans";
import {
  AMOUNT_PATHS,
  PAID_AMOUNT_PATHS,
  OFFER_ID_PATHS,
  extractStr,
  inferPlanFromAmount,
  inferPlanFromOfferId,
  isConfirmedSaleEvent,
  isKnownAmountCents,
} from "@/lib/sio/webhookInference";

/** Les adresses possibles de l'email dans un payload Systeme.io. */
const EMAIL_PATHS = [
  "customer.email",
  "data.customer.email",
  "contact.email",
  "data.contact.email",
  "email",
] as const;

const NAME_PATHS = [
  "customer.first_name",
  "data.customer.first_name",
  "contact.first_name",
  "data.contact.first_name",
] as const;

/**
 * Le montant EN CENTIMES.
 *
 * Systeme.io envoie tantôt `1700`, tantôt `17.00`, selon l'événement.
 * `inferPlanFromAmount` gère déjà cette ambiguïté pour le ROUTAGE (il
 * essaie les deux lectures) ; ici il faut TRANCHER, parce qu'on affiche
 * un chiffre et qu'un chiffre faux dans un tableau de bord fait prendre
 * de mauvaises décisions.
 *
 * Trois règles, de la plus sûre à la moins sûre :
 *
 * 1. **la valeur est ÉCRITE avec des décimales** (`"17.00"`, `"17,50"`) :
 *    c'est des euros, sans ambiguïté possible. Attention, il faut
 *    regarder le TEXTE reçu et pas le nombre : `Number("17.00")` vaut
 *    `17`, un entier, et l'information est perdue. C'est exactement ce
 *    que le test a attrapé au premier jet ;
 * 2. **l'entier est un montant qu'on a vraiment vendu** (`1700`, `17000`,
 *    `2900`...) : c'est des centimes ;
 * 3. **cet entier fois 100 est un montant qu'on a vraiment vendu**
 *    (`17` -> `1700`) : c'était des euros.
 *
 * Sinon, on lit des centimes tels quels : **sous-estimer un chiffre
 * d'affaires est moins grave que le gonfler**, et un montant qu'on ne
 * reconnaît pas mérite de toute façon un coup d'oeil.
 */
export function readSioAmountCents(raw: unknown): number | null {
  const texte = typeof raw === "string" ? raw.trim() : String(raw ?? "");
  const brut = typeof raw === "number" ? raw : Number(texte.replace(",", "."));
  if (!Number.isFinite(brut) || brut <= 0) return null;

  // 1. Ecrit avec des decimales, ou non entier : des euros.
  if (/[.,]\d/.test(texte) || !Number.isInteger(brut)) return Math.round(brut * 100);

  // 2 et 3. On tranche avec ce qu'on a vraiment vendu.
  const entier = Math.round(brut);
  if (isKnownAmountCents(entier)) return entier;
  if (isKnownAmountCents(entier * 100)) return entier * 100;
  return entier;
}

/**
 * Plie les événements Systeme.io en ventes.
 *
 * Une seule ligne par événement encaissé : chaque renouvellement d'un
 * abonnement Systeme.io EST une vente, et doit compter dans le chiffre
 * d'affaires du mois où il tombe.
 *
 * La déduplication se fait sur `event_id` quand il existe. Sans lui, on
 * compose une clé avec l'adresse et l'horodatage : un même événement
 * rejoué par Systeme.io compterait sinon deux fois, et Béné lirait un
 * chiffre d'affaires gonflé. Un chiffre gonflé dans un tableau de bord
 * est pire qu'une absence de chiffre.
 */
export function buildSioSales(rows: EventRow[]): Sale[] {
  const vues = new Set<string>();
  const ventes: Sale[] = [];

  for (const row of rows) {
    if (String(row.source ?? "").trim() !== "systeme_io") continue;
    // Les relivraisons sont lues a part, APRES : voir `echeancesSio`.
    // Les laisser ici ferait gagner la plus recente sur la vente
    // d'origine (les lignes arrivent de la plus recente a la plus
    // ancienne, et la cle est l'identifiant de commande) : la vente
    // changerait de date au lieu de compter deux fois.
    if (estUneRelivraison(row)) continue;

    const type = row.event_type ?? null;
    // Les optins gratuits, les échecs de paiement et les annulations
    // passent par le même webhook. Aucun n'est un encaissement.
    if (!isConfirmedSaleEvent(type)) continue;
    if (/CANCEL|REFUND|FAILED|ANNUL|REMBOURS/i.test(String(type))) continue;

    const payload = row.payload;
    const email = extractStr(payload, EMAIL_PATHS)?.toLowerCase() ?? null;

    const cle =
      String(row.event_id ?? "").trim() ||
      `${email ?? "?"}|${row.created_at}|${type ?? "?"}`;
    if (vues.has(cle)) continue;
    vues.add(cle);

    const offre = extractStr(payload, OFFER_ID_PATHS);
    // DEUX QUESTIONS, DEUX LISTES DE CHEMINS.
    //
    // Pour ROUTER le palier, le prix affiche du plan est un bon indice.
    // Pour CHIFFRER une vente, il ne vaut rien : c'est la somme
    // encaissee qu'il faut, et elle seule.
    const montantBrut = extractStr(payload, PAID_AMOUNT_PATHS);
    const plan =
      inferPlanFromOfferId(offre) ?? inferPlanFromAmount(extractStr(payload, AMOUNT_PATHS));

    // LE MONTANT, ET D'OÙ IL VIENT.
    //
    // Le payload d'abord : c'est la somme réellement encaissée, la seule
    // qui puisse entrer dans un chiffre d'affaires.
    //
    // À défaut, le prix affiché du plan tarifaire, lu dans son compte
    // Systeme.io le 22 août. C'est ce qui a manqué pendant des semaines :
    // 47 ventes bien réelles affichées à `0,00 €`, et un onglet Ventes
    // qui ne servait à rien. Mais ça reste une ESTIMATION, et elle est
    // marquée comme telle : son compte porte 54 codes de réduction
    // actifs, dont certains à 100 %, donc une vente remisée vaudrait
    // moins que le prix du plan.
    //
    // LE TARIF SE LIT TOUJOURS, MÊME QUAND LE MONTANT EST LÀ.
    //
    // Il ne servait qu'à combler un montant manquant, donc une vente qui
    // portait sa somme n'était JAMAIS nommée : elle sortait en "Produit
    // non identifié" sur le tableau de bord, y compris quand Systeme.io
    // sait parfaitement de quoi il parle ("Le Pacte™ - 24 €/mois").
    // C'est ce que Béné a vu le 1er septembre. Le tarif répond à deux
    // questions différentes, le montant ET le nom, et une seule était
    // posée.
    const duPayload = readSioAmountCents(montantBrut);
    const tarif = readPricePlan(offre);
    const amountCents = duPayload ?? tarif?.montantCents ?? 0;
    const amountSource: Sale["amountSource"] =
      duPayload != null ? "payload" : tarif ? "plan" : "inconnu";

    ventes.push({
      // Rien a rembourser de notre cote : la reference est l'evenement,
      // pour que la ligne reste identifiable dans les journaux.
      ref: cle,
      provider: "systeme_io",
      email,
      name: extractStr(payload, NAME_PATHS),
      // Le PLAN plutot que l'offre brute : c'est ce que Bene lit.
      //
      // Sans palier Tiquiz, on garde l'IDENTIFIANT DU PLAN TARIFAIRE dès
      // qu'on le reconnaît : `readSaleProduct` en tire la famille et
      // `nomProduitVendu` le nom propre du produit. Écrire "inconnu" ici
      // jetait un nom qu'on avait sous la main, et rangeait Le Pacte, la
      // formation et une vraie vente orpheline dans le même sac.
      productId: plan ?? (tarif ? String(offre) : "inconnu"),
      amountCents,
      amountSource,
      currency: tarif?.devise ?? "eur",
      paidAt: row.created_at,
      // On n'invente pas un remboursement qu'on n'a jamais observe.
      refundedAt: null,
      nature: "premiere",
    });
  }

  return [...ventes, ...echeancesSio(rows, ventes)];
}

// ── LES ÉCHÉANCES SYSTEME.IO ───────────────────────────────────────────
//
// Béné, 11 septembre : "peut-être que le webhook n'est pas appelé parce
// que c'est pas une nouvelle vente mais un abonnement qui se continue ?
// Il faut le traquer aussi. Je veux savoir ce que je gagne, d'où ça
// vient, les nouvelles ventes, les abonnements récurrents."
//
// LU DANS LE JOURNAL DU SERVEUR, pas déduit : Systeme.io rappelle le
// webhook pour une commande DÉJÀ traitée, avec le MÊME identifiant de
// commande (`sio_order_11771832` cinq fois, `sio_order_11953332` juste
// après une vente du 10 septembre). Le webhook les écartait comme des
// relivraisons, sans trace jusqu'au 11 septembre ; il les journalise
// depuis, statut `duplicate`, payload et type compris.
//
// CE QU'ON NE SAIT PAS, ET QU'ON DIT : le TYPE d'événement d'un
// renouvellement n'a jamais été lu (l'ancien journal ne l'imprimait
// pas). On ne l'exige donc pas. Ce qui distingue une échéance d'une
// vraie relivraison, c'est le TEMPS : une relivraison suit son original
// de quelques minutes ou de quelques heures, une échéance tombe un mois
// ou un an après. Le seuil est posé LOIN des deux groupes.
//
// Ce lecteur ne touche à rien qui OUVRE un accès ou qui PAIE quelqu'un :
// il nomme, dans le tableau de bord, ce que le webhook a déjà reçu.

/**
 * Le nombre de jours en dessous duquel un rappel pour la même commande
 * est une relivraison, et pas une échéance.
 *
 * 20 : loin des relivraisons (des minutes, des heures) et loin des
 * échéances (28 à 31 jours pour un mensuel, 365 pour un annuel). Un
 * seuil qui départage à la limite finit par crier sur du travail juste.
 */
export const ECART_MIN_JOURS_ECHEANCE = 20;

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Un échec de paiement, une annulation, un remboursement : rien n'est encaissé. */
const PAS_UN_ENCAISSEMENT = /FAIL|DECLIN|DISPUT|CANCEL|REFUND|EXPIR|CHARGEBACK|ANNUL|REMBOURS/i;

function estUneRelivraison(row: EventRow): boolean {
  return String(row.status ?? "").trim().toLowerCase() === "duplicate";
}

/**
 * Les rappels pour une commande déjà traitée qui tombent au moins
 * `ECART_MIN_JOURS_ECHEANCE` jours après le dernier encaissement compté
 * pour cette commande.
 *
 * `dejaComptees` : les ventes d'origine, pour dater le dernier
 * encaissement de chaque commande. Sans origine dans la fenêtre lue
 * (une vente d'avant le journal), on COMPTE : le cas qui gonflerait,
 * la relivraison, a toujours son original à quelques minutes, donc dans
 * la fenêtre.
 */
export function echeancesSio(rows: readonly EventRow[], dejaComptees: readonly Sale[]): Sale[] {
  const dernierEncaissement = new Map<string, number>();
  for (const v of dejaComptees) {
    if (v.provider !== "systeme_io") continue;
    const t = Date.parse(v.paidAt);
    if (!Number.isFinite(t)) continue;
    const cle = v.ref;
    dernierEncaissement.set(cle, Math.max(dernierEncaissement.get(cle) ?? 0, t));
  }

  const rappels = rows
    .filter((r) => String(r.source ?? "").trim() === "systeme_io" && estUneRelivraison(r))
    .filter((r) => String(r.event_id ?? "").trim() !== "")
    .filter((r) => !PAS_UN_ENCAISSEMENT.test(String(r.event_type ?? "")))
    // Du plus ancien au plus récent : chaque échéance comptée devient
    // la référence de la suivante.
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  const echeances: Sale[] = [];
  for (const row of rappels) {
    const commande = String(row.event_id).trim();
    const t = Date.parse(row.created_at);
    if (!Number.isFinite(t)) continue;
    const precedent = dernierEncaissement.get(commande);
    if (precedent != null && t - precedent < ECART_MIN_JOURS_ECHEANCE * JOUR_MS) continue;
    dernierEncaissement.set(commande, t);

    const payload = row.payload;
    const offre = extractStr(payload, OFFER_ID_PATHS);
    const plan =
      inferPlanFromOfferId(offre) ?? inferPlanFromAmount(extractStr(payload, AMOUNT_PATHS));
    const duPayload = readSioAmountCents(extractStr(payload, PAID_AMOUNT_PATHS));
    const tarif = readPricePlan(offre);
    echeances.push({
      // La commande ET la date : deux échéances de la même commande sont
      // deux lignes, et aucune ne se confond avec la vente d'origine.
      ref: `${commande}|${row.created_at}`,
      provider: "systeme_io",
      email: extractStr(payload, EMAIL_PATHS)?.toLowerCase() ?? null,
      name: extractStr(payload, NAME_PATHS),
      productId: plan ?? (tarif ? String(offre) : "inconnu"),
      amountCents: duPayload ?? tarif?.montantCents ?? 0,
      amountSource: duPayload != null ? "payload" : tarif ? "plan" : "inconnu",
      currency: tarif?.devise ?? "eur",
      paidAt: row.created_at,
      refundedAt: null,
      nature: "echeance",
    });
  }
  return echeances;
}
