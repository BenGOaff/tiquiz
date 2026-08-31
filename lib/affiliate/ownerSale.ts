// lib/affiliate/ownerSale.ts
//
// UNE VENTE ENCAISSÉE CHEZ NOUS PAIE SON AFFILIÉE.
//
// -- LE TROU QUE CE FICHIER BOUCHE -------------------------------------
//
// Le webhook Systeme.io de Tiquiz remonte bien ses ventes à Tipote, qui
// centralise les commissions (`app/api/systeme-io/webhook/route.ts`,
// bloc "Attribution affiliée"). Notre propre bon de commande, lui,
// n'appelait rien du tout. On avait déplacé la VENTE sans déplacer la
// COMMISSION.
//
// Le symptôme, c'est l'absence de symptôme : la page s'affiche, la carte
// passe, le plan s'ouvre, l'argent arrive. Seule l'affiliée voit qu'il
// ne se passe rien chez elle, et elle ne peut rien prouver.
//
// -- LA SOURCE DE VÉRITÉ EST CHEZ TIPOTE, ET C'EST VOULU ---------------
//
// `affiliates`, `affiliate_conversions` et `affiliate_commissions`
// vivent sur le Supabase de Tipote : c'est ce que lit le tableau de bord
// des affiliées (`affiliate.tipote.com`). Écrire une deuxième table ici
// donnerait deux comptes différents pour le même argent.
//
// -- ON COMMISSIONNE CHAQUE ENCAISSEMENT, JAMAIS L'OUVERTURE -----------
//
// Béné, 26 août 2026 : "chez nous on paye bien 40% chaque mois où
// l'affilié reste abonné, pas une seule fois... ! On arrête de payer si
// [le client] se barre c'est tout. S'il arrête son abonnement ou s'il
// demande un remboursement : pas de com pour son affilié. Mais sinon on
// paye tous les mois..."
//
// La commission est donc RÉCURRENTE, et la règle tient en une ligne :
// **une commission par euro encaissé, aucune sur une ouverture.**
//
// La clé d'idempotence est le PAIEMENT (la facture Stripe, la vente
// PayPal), jamais l'abonnement. Avec l'abonnement pour clé, la deuxième
// échéance tombait sur la contrainte d'unicité et ne payait pas : c'est
// exactement ce qu'il ne faut pas.
//
// Et ça règle trois cas tout seuls, sans un drapeau de plus :
//   * le MOIS OFFERT : la facture d'essai vaut 0, donc pas de
//     commission ; la première vraie échéance en crée une ;
//   * l'ARRÊT de l'abonnement : plus d'échéance, donc plus de
//     commission, sans rien à débrancher ;
//   * le REMBOURSEMENT : on annule la commission DE CETTE ÉCHÉANCE là,
//     les mois déjà versés restent acquis.
//
// -- APRÈS LE PLAN, ET JAMAIS AVANT ------------------------------------
//
// Cette fonction ne jette jamais et ne bloque rien. Une commission qui
// échoue ne doit pas priver un acheteur de ce qu'il a payé. Les échecs
// sont journalisés FORT : c'est de l'argent dû à quelqu'un.
//
// Le module jumeau côté Atelier (`formaquiz`) fait la même chose en
// écrivant directement dans SA base : toute correction ici se regarde
// là-bas, et réciproquement.

import "server-only";

import { commissionBaseCents } from "@/lib/checkout/commissionBase";
import { readSa } from "./sa";
import { readRef as readRefCode } from "./refLien";

/** L'endroit où Tipote centralise les commissions. */
const ENDPOINT_PAR_DEFAUT = "https://app.tipote.com/api/affiliate/attribute-sale";

export interface VenteACommissionner {
  email: string | null;
  /**
   * PAR QUEL MOYEN L'ARGENT EST RENTRÉ.
   *
   * Sert à préfixer la clé d'idempotence. Le préfixe était `stripe:`
   * pour tout le monde, y compris pour PayPal : ça marchait par accident
   * (les identifiants ne se ressemblent pas), mais une clé qui ment sur
   * sa provenance est introuvable le jour où il faut la retrouver à la
   * main. Le dépôt de l'Atelier portait déjà ce champ.
   */
  moyen: "stripe" | "paypal";
  /**
   * L'IDENTIFIANT DE L'ENCAISSEMENT. Clé d'idempotence.
   *
   * **Le PAIEMENT, jamais l'abonnement** : une facture Stripe, une
   * vente PayPal. Avec l'abonnement pour clé, la deuxième échéance
   * serait un doublon et l'affilié ne toucherait rien à partir du
   * deuxième mois.
   */
  reference: string | null;
  /** Le `sa` d'un ANCIEN lien Systeme.io, s'il y en avait un. */
  affiliateRef: string | null;
  /**
   * Le CODE PUBLIC de l'affiliée (`?ref=`), sur nos liens actuels.
   *
   * Depuis le 24 août 2026, nos liens ne portent plus le `sa` : Béné,
   * "je ne veux surtout pas de sa dans les nouveaux liens... c'est
   * celui de systeme io c'est tout !!". Tipote traduit le code en
   * affiliée contre sa table, anciens codes compris.
   *
   * Les deux champs ne sont jamais remplis en même temps : un lien est
   * d'une génération ou de l'autre. Ils restent SÉPARÉS pour que
   * personne n'ait à deviner lequel il a reçu.
   */
  affiliateCode: string | null;
  /** Ce qui a été encaissé, TVA comprise. */
  amountTotalCents: number;
  /**
   * LA TVA COMPRISE DEDANS.
   *
   * Stripe la calcule et la renvoie. **PayPal, non : c'est NOUS qui la
   * calculons**, au moment d'émettre la facture de cette vente
   * (`lib/facture/taxeVentePaypal.ts`), à partir du pays de l'acheteur,
   * de son numéro de TVA et de la réponse de VIES.
   *
   * Béné, 31 août 2026 : "pour l'affiliation on fait uniquement 40 %
   * etc. sur le HT. Débrouille toi pour que sur PayPal ça marche
   * aussi." Ça remplace sa décision du 22 août ("pour paypal : oui on
   * garde le TTC"), qui datait d'un moment où nous ne savions pas
   * ventiler. Jusque là, ce champ arrivait à ZÉRO depuis PayPal : le
   * `base: "ht"` envoyé à Tipote était donc un mensonge, et l'affiliée
   * touchait 1,13 € de trop par échéance mensuelle.
   *
   * **Ne PAS poser un taux ici.** Un acheteur belge, un professionnel
   * en autoliquidation et un acheteur hors UE n'ont pas la même taxe :
   * un taux appliqué de mémoire les paierait tous les trois faux.
   */
  amountTaxCents: number;
  product: { id: string; label: string };
}

export async function commissionnerVente(vente: VenteACommissionner): Promise<void> {
  try {
    const secret = process.env.AFFILIATE_INTERNAL_SECRET?.trim();
    if (!secret) {
      // L'ABSENCE FERME, mais elle ne se tait pas : sans ce secret,
      // AUCUNE vente ne paie personne, et rien d'autre ne le dirait.
      console.error(
        "[commission] AFFILIATE_INTERNAL_SECRET absente du serveur Tiquiz : " +
          "aucune commission ne peut etre creee.",
      );
      return;
    }

    const email = (vente.email ?? "").trim();
    const reference = (vente.reference ?? "").trim();
    if (!email || !reference) {
      console.error(
        `[commission] vente sans ${!email ? "adresse" : "reference"} : aucune commission possible.`,
      );
      return;
    }

    const base = commissionBaseCents(vente.amountTotalCents, vente.amountTaxCents);
    if (base <= 0) {
      // On a l'adresse ET la reference : un montant a zero veut dire
      // qu'on a perdu la somme en route, pas qu'il n'y avait rien a
      // payer. Se taire rendrait la perte introuvable.
      console.error(
        `[commission] vente ${reference} sans montant exploitable ` +
          `(encaisse ${vente.amountTotalCents} c, taxe ${vente.amountTaxCents} c) : aucune commission.`,
      );
      return;
    }

    // Prefixe : ce n'est PAS un numero de commande Systeme.io, et deux
    // numerotations independantes finissent par se percuter sur la
    // contrainte d'unicite (source_app, sio_order_id). La deuxieme vente
    // serait alors silencieusement traitee comme un doublon.
    const ref = `${vente.moyen}:${reference}`;

    const url = process.env.TIPOTE_AFFILIATE_ENDPOINT?.trim() || ENDPOINT_PAR_DEFAUT;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      // UN APPEL SANS DÉLAI MAXIMUM BLOQUE LE WEBHOOK QUI L'APPELLE.
      //
      // Cette fonction tourne DANS le webhook de paiement. Si Tipote ne
      // répond pas, la requête reste ouverte jusqu'à ce que la
      // plateforme la tue, et le fournisseur ne reçoit jamais sa
      // réponse. La commission peut attendre ; l'accès du client, non.
      // (Audit du 24 août : `proprietaireDuLien` avait son délai, pas
      // celui ci.)
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        customer_email: email,
        sale_amount_cents: base,
        currency: "EUR",
        source_app: "tiquiz",
        sio_order_id: ref,
        // `null` est le cas COURANT pour les deux : sans lien
        // d'affiliation, l'attribution retombe sur la conversion par
        // email.
        // ON DIT SUR QUOI ON PAIE. `commissionBaseCents` a deja retire
        // la TVA : sans ce champ, Tipote lisait le montant comme du TTC
        // et le rabotait une deuxieme fois (audit du 26 aout).
        base: "ht",
        // ET QUI PAIE. Cette vente est prise sur NOTRE bon de commande,
        // donc c'est nous qui versons la commission. Une vente passee
        // par un tunnel Systeme.io est versee par EUX, et n'entre donc
        // pas dans nos lots : sans ce champ, le premier lot aurait vire
        // une deuxieme fois ce qu'ils ont deja paye.
        regle_par: "nous",
        affiliate_ref: readSa(vente.affiliateRef),
        affiliate_code: readRefCode(vente.affiliateCode),
        product_name: vente.product.label,
        sale_at: new Date().toISOString(),
        raw_payload: { source: `${vente.moyen}_encaissement`, product: vente.product.id, reference },
      }),
    });

    if (!res.ok) {
      const corps = await res.text().catch(() => "");
      console.error(
        `[commission] Tipote a refuse (${res.status}) sur ${ref} : ${corps.slice(0, 200)}`,
      );
      return;
    }

    const json = (await res.json().catch(() => ({}))) as {
      result?: { status?: string; commission_cents?: number; sa?: string };
    };
    const r = json.result ?? {};
    if (r.status === "attributed") {
      console.log(
        `[commission] ${r.commission_cents} c pour ${r.sa} sur ${ref} ` +
          `(base ${base} c, encaisse ${vente.amountTotalCents} c, taxe ${vente.amountTaxCents} c)`,
      );
      return;
    }
    // Les autres cas sont normaux et frequents (pas d'affilie, doublon,
    // affilie inconnu). On les trace quand meme : le jour ou une affiliee
    // dit "je n'ai pas ete payee", c'est cette ligne qui repond.
    console.log(`[commission] ${r.status ?? "reponse illisible"} sur ${ref}`);
  } catch (e) {
    console.error(
      `[commission] attribution impossible : ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/**
 * LA VENTE EST TOMBÉE : LA COMMISSION AUSSI.
 *
 * Contrepartie de `commissionnerVente`, appelée quand l'argent repart :
 * remboursement total, ou impayé repris par la banque.
 *
 * -- CE QUE ÇA FERME (audit du 26 août 2026) ---------------------------
 *
 * Rien n'annulait une commission. Un remboursement fermait l'accès,
 * arrêtait l'abonnement, émettait l'avoir, et laissait la commission
 * mûrir : vingt et un jours plus tard elle entrait dans un lot, et
 * l'argent partait. Tant que Systeme.io payait ça ne coûtait rien ;
 * depuis le 25 août c'est nous qui virons, et un virement ne se reprend
 * pas.
 *
 * Nos conditions d'affiliation le promettaient déjà ("elles peuvent être
 * annulées en cas de remboursement, d'impayé, de fraude") : le texte
 * annonçait ce que le code ne faisait pas.
 *
 * **La clé doit être EXACTEMENT celle de la création.** `stripe:<ref>`
 * pour une vente carte, l'identifiant d'abonnement pour PayPal : c'est
 * ce que `commissionnerVente` a écrit dans `sio_order_id`. Une clé qui
 * ne correspond pas n'annule rien, en silence, ce qui est précisément le
 * bug qu'on ferme.
 *
 * Ne jette jamais et ne bloque rien : le remboursement doit aboutir même
 * si Tipote ne répond pas. On CRIE, parce que c'est de l'argent qui va
 * partir si personne ne regarde.
 */
export async function annulerCommissionVente(args: {
  /**
   * LES RÉFÉRENCES DE L'ENCAISSEMENT QUI TOMBE.
   *
   * Plusieurs, parce qu'un même remboursement peut désigner sa cible de
   * deux façons selon ce que le fournisseur nous donne (la facture ou
   * le paiement chez Stripe ; la vente ou l'abonnement chez PayPal). On
   * essaie chacune : une seule existera en base, les autres ne trouvent
   * rien et ne coûtent qu'un aller-retour.
   *
   * Elles doivent porter LE MÊME préfixe qu'à la création : une clé qui
   * ne correspond pas n'annule rien, en silence, ce qui est exactement
   * le bug qu'on ferme.
   */
  references: readonly (string | null | undefined)[];
  motif: "remboursement" | "impaye" | "fraude";
}): Promise<void> {
  const secret = process.env.AFFILIATE_INTERNAL_SECRET?.trim();
  const cles = args.references
    .map((r) => (r ?? "").trim())
    .filter((r) => r.length > 0);

  if (!secret || cles.length === 0) {
    console.error(
      `[commission] annulation impossible (${!secret ? "secret absent" : "aucune reference"}) : ` +
        `une commission peut partir sur une vente ${args.motif}.`,
    );
    return;
  }

  const url = (process.env.TIPOTE_AFFILIATE_ENDPOINT?.trim() || ENDPOINT_PAR_DEFAUT).replace(
    /\/attribute-sale$/,
    "/cancel-sale",
  );

  let annulees = 0;
  for (const cle of cles) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
        // Même délai que l'attribution : cette fonction tourne DANS le
        // webhook de paiement, et l'accès du client ne doit pas attendre
        // que Tipote réponde.
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          source_app: "tiquiz",
          sio_order_id: cle,
          motif: args.motif,
        }),
      });

      if (!res.ok) {
        const corps = await res.text().catch(() => "");
        console.error(
          `[commission] annulation REFUSEE (${res.status}) sur ${cle} : ${corps.slice(0, 200)}. ` +
            `La commission va murir et partir au prochain lot.`,
        );
        continue;
      }

      const json = (await res.json().catch(() => ({}))) as {
        resultat?: { annulees?: number; tropTard?: number; tropTardCents?: number };
      };
      const r = json.resultat ?? {};
      annulees += r.annulees ?? 0;
      if ((r.tropTard ?? 0) > 0) {
        // DÉJÀ VERSÉE : ce n'est pas rattrapable par du code. L'argent
        // est parti et la facture d'autofacturation qui le justifie a
        // été remise à un comptable.
        console.error(
          `[commission] ${cle} (${args.motif}) : ${r.tropTard} commission(s) DEJA VERSEE(S) ` +
            `(${r.tropTardCents ?? 0} c). A recuperer a la main.`,
        );
      }
    } catch (e) {
      console.error(
        `[commission] annulation impossible sur ${cle} : ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(
    `[commission] ${args.motif} sur ${cles.join(", ")} : ${annulees} commission(s) annulee(s)`,
  );
}
