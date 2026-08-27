// tests/logic/facturation.test.mts
//
// UNE FACTURE LÉGALE, ET LA TVA QUI VA AVEC.
//
// Béné, 24 août 2026 : "bref tout ce qu'il faut pour une facture légale
// et que je puisse mettre à jour si demande du client : lui aussi doit
// avoir ces infos et pouvoir les mettre à jour. PayPal envoie des
// factures auto ? Si non il faut qu'on les créée... stripe le fait c'est
// bien mais paypal j'ai un doute."
//
// C'est de l'argent et des mentions légales : un taux faux ne se voit
// sur aucun écran, il se voit à la déclaration, des mois plus tard. Ces
// tests portent donc sur la DÉCISION, pas sur l'affichage.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import { construireFacture, serieDe, type VenteAFacturer } from "@/lib/facture/construire";
import {
  ACHETEUR_VIDE,
  acheteurComplet,
  fusionnerAcheteur,
  lignesAdresse,
  lireAcheteur,
  manques,
  nomFacture,
  vendeur,
} from "@/lib/facture/identite";
import { encaissementDepuisSale, remboursementDepuisRefund } from "@/lib/facture/paypalVente";
import { acheteurDepuisStripe, couperNom } from "@/lib/facture/stripeAcheteur";
import {
  PAYS_UE,
  TAUX_UE,
  decomposerTTC,
  formatTaux,
  normaliserNumeroTva,
  normaliserPays,
  numeroTvaBienForme,
  resoudreTva,
} from "@/lib/facture/tva";

const lire = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

// ── LA TVA : LES QUATRE CAS, ET ILS SONT EXHAUSTIFS ─────────────────

describe("Quel taux, et pourquoi ce taux là", () => {
  test("acheteur français : 20 %, aucune mention", () => {
    const d = resoudreTva({ pays: "FR", vies: "non-verifie" });
    assert.equal(d.regime, "france");
    assert.equal(d.tauxBp, 2000);
    assert.equal(d.mention, null);
  });

  test("LE PIÈGE : une entreprise FRANÇAISE avec numéro de TVA paie quand même", () => {
    // L'autoliquidation n'existe pas entre deux entreprises du même
    // pays. Se tromper ici, c'est facturer 0 % à tous les clients pros
    // français, et payer la TVA de sa poche au redressement.
    const d = resoudreTva({ pays: "FR", numeroTva: "FR38909349045", vies: "non-verifie" });
    assert.equal(d.regime, "france");
    assert.equal(d.tauxBp, 2000);
  });

  test("entreprise belge avec numéro valide : autoliquidation à 0 %", () => {
    const d = resoudreTva({ pays: "BE", numeroTva: "BE0123456789", vies: "non-verifie" });
    assert.equal(d.regime, "autoliquidation");
    assert.equal(d.tauxBp, 0);
    assert.match(d.mention ?? "", /[Aa]utoliquidation/);
    // Bien formé n'est pas valide : tant que VIES n'est pas branché,
    // chaque autoliquidation reste à vérifier une fois.
    assert.ok(d.aCompleter.includes("tva-a-valider-vies"));
  });

  test("particulier belge : le taux BELGE, pas le français", () => {
    // Un service électronique est taxé là où le client consomme.
    const d = resoudreTva({ pays: "BE", vies: "non-verifie" });
    assert.equal(d.regime, "oss");
    assert.equal(d.tauxBp, 2100);
    assert.match(d.mention ?? "", /OSS/);
  });

  test("hors Union : 0 %, hors champ, et la mention le dit", () => {
    const d = resoudreTva({ pays: "US", vies: "non-verifie" });
    assert.equal(d.regime, "hors-ue");
    assert.equal(d.tauxBp, 0);
    assert.match(d.mention ?? "", /259 B/);
  });

  test("un numéro illisible NE DÉCLENCHE PAS l'autoliquidation", () => {
    // Facturer la TVA à tort est réparable ; l'oublier ne l'est pas.
    const d = resoudreTva({ pays: "BE", numeroTva: "PAS-UN-NUMERO", vies: "non-verifie" });
    assert.equal(d.regime, "oss");
    assert.equal(d.tauxBp, 2100);
    assert.ok(d.aCompleter.includes("tva-numero-invalide"));
  });

  test("un numéro d'un AUTRE pays que l'adresse est refusé", () => {
    // Adresse allemande, numéro belge : soit l'adresse est fausse, soit
    // c'est une tentative. Dans les deux cas on ne l'accepte pas.
    const d = resoudreTva({ pays: "DE", numeroTva: "BE0123456789", vies: "non-verifie" });
    assert.equal(d.regime, "oss");
    assert.ok(d.aCompleter.includes("tva-numero-invalide"));
  });

  test("pays inconnu : on facture au taux français, et on le SIGNALE", () => {
    // On n'attend pas une adresse pour donner sa facture à quelqu'un qui
    // a payé (règle du 7 août). On émet, et on dit ce qui manque.
    const d = resoudreTva({ pays: null, vies: "non-verifie" });
    assert.equal(d.tauxBp, 2000);
    assert.ok(d.aCompleter.includes("pays"));
  });

  test("la Grèce écrit EL sur ses numéros et GR sur ses adresses", () => {
    // Le seul pays où le préfixe du numéro n'est pas le code du pays.
    // L'oublier ferait refuser toutes les autoliquidations grecques.
    assert.ok(numeroTvaBienForme("EL123456789", "GR"));
    assert.equal(resoudreTva({ pays: "GR", numeroTva: "EL123456789", vies: "non-verifie" }).regime, "autoliquidation");
  });

  test("les 27 pays de l'Union ont un taux", () => {
    assert.equal(PAYS_UE.length, 27);
    for (const p of PAYS_UE) {
      assert.ok(Number.isInteger(TAUX_UE[p]), `${p} sans taux`);
      assert.ok(TAUX_UE[p] >= 1500 && TAUX_UE[p] <= 2800, `${p} : taux invraisemblable`);
    }
  });

  test("la table des taux porte sa date de mise à jour", () => {
    // Un taux change plusieurs fois par an dans l'Union. Sans date, rien
    // ne dit quand la table a été vérifiée pour la dernière fois.
    assert.match(lire("lib/facture/tva.ts"), /TAUX_MAJ = "\d{4}-\d{2}-\d{2}"/);
  });

  test("la Finlande garde son demi-point", () => {
    // 25,5 % : arrondir à 25 ou 26 fausserait chaque facture finlandaise.
    assert.equal(TAUX_UE.FI, 2550);
    assert.equal(formatTaux(2550), "25,5 %");
  });

  test("le pays et le numéro sont normalisés avant toute décision", () => {
    assert.equal(normaliserPays(" be "), "BE");
    assert.equal(normaliserPays("Belgique"), null);
    assert.equal(normaliserNumeroTva(" be 0123.456-789 "), "BE0123456789");
  });
});

// ── LES MONTANTS : LE PRIX EST TTC ──────────────────────────────────

describe("Le prix est TTC, la TVA se calcule dedans", () => {
  test("17,00 € à 20 % : 14,17 HT + 2,83 de TVA", () => {
    const m = decomposerTTC(1700, 2000);
    assert.equal(m.htCents, 1417);
    assert.equal(m.tvaCents, 283);
    assert.equal(m.htCents + m.tvaCents, m.totalCents);
  });

  test("la somme des lignes fait TOUJOURS le total", () => {
    // On arrondit le HT, et la TVA est la DIFFÉRENCE : arrondir les deux
    // séparément donne une facture qui ne tombe pas juste, ce qu'un
    // comptable voit tout de suite.
    for (const total of [100, 1700, 2900, 17000, 29000, 999, 1]) {
      for (const bp of [0, 1700, 1900, 2000, 2100, 2550, 2700]) {
        const m = decomposerTTC(total, bp);
        assert.equal(m.htCents + m.tvaCents, total, `${total} à ${bp}`);
      }
    }
  });

  test("à 0 %, le HT est le total", () => {
    const m = decomposerTTC(1700, 0);
    assert.equal(m.htCents, 1700);
    assert.equal(m.tvaCents, 0);
  });

  test("un client belge paie le MÊME montant qu'un français", () => {
    // C'est tout le sens du TTC : le montant payé ne bouge pas, c'est la
    // part de TVA qui change dedans.
    const fr = decomposerTTC(1700, resoudreTva({ pays: "FR", vies: "non-verifie" }).tauxBp);
    const be = decomposerTTC(1700, resoudreTva({ pays: "BE", vies: "non-verifie" }).tauxBp);
    assert.equal(fr.totalCents, be.totalCents);
    assert.notEqual(fr.tvaCents, be.tvaCents);
  });
});

// ── L'IDENTITÉ ──────────────────────────────────────────────────────

describe("Ce qu'il faut pour une facture légale", () => {
  const complet = lireAcheteur({
    prenom: "Marie", nom: "Dupont", adresse1: "12 rue des Lilas",
    codePostal: "34000", ville: "Montpellier", pays: "FR",
  });

  test("nom, adresse, ville et pays suffisent", () => {
    assert.deepEqual(manques(complet), []);
    assert.ok(acheteurComplet(complet));
  });

  test("la société et la TVA sont 'si concerné', jamais exigées", () => {
    // Béné a écrit "si concerné" : un particulier n'a ni l'une ni
    // l'autre, et lui réclamer un numéro de TVA n'aurait aucun sens.
    assert.deepEqual(manques({ ...complet, societe: null, tvaNumero: null }), []);
  });

  test("il manque tout : les quatre manques sortent, pas un de plus", () => {
    assert.deepEqual(manques(ACHETEUR_VIDE), ["nom", "adresse", "ville", "pays"]);
  });

  test("la société passe devant la personne sur la facture", () => {
    const pro = { ...complet, societe: "ACME SARL" };
    assert.equal(nomFacture(pro), "ACME SARL");
    // Mais la personne reste imprimée : une facture adressée à une
    // société doit quand même arriver à quelqu'un.
    assert.ok(lignesAdresse(pro).includes("Marie Dupont"));
  });

  test("le pays s'imprime en toutes lettres", () => {
    assert.ok(lignesAdresse(complet).includes("France"));
  });

  test("FUSIONNER N'EFFACE JAMAIS", () => {
    // Un paiement Stripe ne collecte pas la société : s'il remplaçait le
    // bloc entier, il effacerait celle que la personne a saisie dans ses
    // réglages la semaine d'avant.
    const ancien = lireAcheteur({ ...complet, societe: "ACME SARL", tvaNumero: "FR38909349045" });
    const depuisStripe = lireAcheteur({ prenom: "Marie", nom: "Durand", adresse1: "3 rue Neuve" });
    const f = fusionnerAcheteur(ancien, depuisStripe);
    assert.equal(f.societe, "ACME SARL");
    assert.equal(f.tvaNumero, "FR38909349045");
    // Et ce qui est fourni GAGNE, champ par champ.
    assert.equal(f.nom, "Durand");
    assert.equal(f.adresse1, "3 rue Neuve");
    assert.equal(f.ville, "Montpellier");
  });

  test("le vendeur vient d'une seule source", () => {
    const v = vendeur();
    assert.equal(v.denomination, "ETHILIFE");
    for (const champ of ["forme", "capital", "rcs", "tva", "adresse"] as const) {
      assert.ok(v[champ], `mention vendeur manquante : ${champ}`);
    }
  });
});

// ── LA FACTURE CONSTRUITE ───────────────────────────────────────────

describe("D'une vente à une facture", () => {
  const vente: VenteAFacturer = {
    provider: "paypal",
    saleRef: "SALE-1",
    productId: "mensuel",
    libelle: "Tiquiz mensuel",
    currency: "eur",
    totalCents: 1700,
    paidAt: "2026-08-24T10:00:00Z",
    emailCle: "Marie@Exemple.FR",
  };
  const acheteur = lireAcheteur({
    prenom: "Marie", nom: "Dupont", adresse1: "12 rue des Lilas",
    codePostal: "34000", ville: "Montpellier", pays: "FR",
  });

  test("la série est l'année du PAIEMENT, pas l'année courante", () => {
    // Un webhook rejoué le 2 janvier pour un encaissement du 31 décembre
    // doit tomber dans la série de décembre, sinon la numérotation n'est
    // plus chronologique.
    assert.equal(serieDe("2026-12-31T23:59:00Z"), "TQ-2026");
    assert.equal(serieDe("2027-01-01T00:01:00Z"), "TQ-2027");
  });

  test("une facture ordinaire", () => {
    const f = construireFacture("facture", vente, acheteur, "non-verifie");
    assert.equal(f.serie, "TQ-2026");
    assert.equal(f.totalCents, 1700);
    assert.equal(f.htCents + f.tvaCents, 1700);
    assert.equal(f.tvaTauxBp, 2000);
    assert.deepEqual(f.aCompleter, []);
    // L'adresse est RECOPIÉE dans la facture : c'est ce qui la rend
    // opposable des années après, et ce qui fait qu'un déménagement ne
    // réécrit pas l'historique.
    assert.equal(f.acheteur.ville, "Montpellier");
    assert.equal(f.emailCle, "marie@exemple.fr");
  });

  test("UN AVOIR EST NÉGATIF, ET C'EST UN PARAMÈTRE", () => {
    // Le genre ne se déduit pas d'un montant négatif : ça marcherait
    // jusqu'au premier remboursement partiel.
    const a = construireFacture("avoir", vente, acheteur, "non-verifie");
    assert.equal(a.totalCents, -1700);
    assert.equal(a.htCents, -1417);
    assert.equal(a.tvaCents, -283);
    assert.equal(a.htCents + a.tvaCents, a.totalCents);
  });

  test("sans identité, on émet QUAND MÊME, en marquant", () => {
    // "il a payé le client, il doit recevoir ses accès, point barre"
    // vaut aussi pour sa facture : on ne la retient pas.
    const f = construireFacture("facture", vente, null, "non-verifie");
    assert.equal(f.totalCents, 1700);
    assert.equal(f.tvaTauxBp, 2000);
    assert.deepEqual(f.aCompleter.sort(), ["adresse", "nom", "pays", "ville"]);
  });
});

// ── LES PAYLOADS, LUS ET PAS SUPPOSÉS ───────────────────────────────

describe("Ce qu'un événement PayPal dit de l'argent", () => {
  test("un encaissement", () => {
    const e = encaissementDepuisSale({
      id: "9XY", amount: { total: "17.00", currency: "EUR" },
      create_time: "2026-08-24T10:00:00Z",
    });
    assert.equal(e?.saleRef, "9XY");
    assert.equal(e?.totalCents, 1700);
    assert.equal(e?.currency, "eur");
  });

  test("PayPal envoie les montants en CHAÎNE", () => {
    // `Number("")` vaut 0 : sans le test de chaîne vide, un montant
    // absent deviendrait une facture à zéro euro.
    assert.equal(encaissementDepuisSale({ id: "A", amount: { total: "" } }), null);
    assert.equal(encaissementDepuisSale({ id: "A", amount: {} }), null);
    assert.equal(encaissementDepuisSale({ id: "A" }), null);
    assert.equal(encaissementDepuisSale({ amount: { total: "17.00" } }), null);
  });

  test("les centimes ne se perdent pas", () => {
    assert.equal(encaissementDepuisSale({ id: "A", amount: { total: "29.90" } })?.totalCents, 2990);
    assert.equal(encaissementDepuisSale({ id: "A", amount: { total: "0.01" } })?.totalCents, 1);
  });

  test("un remboursement porte SA vente d'origine", () => {
    const r = remboursementDepuisRefund({
      id: "REF-1", sale_id: "9XY",
      amount: { total: "17.00", currency: "EUR" },
      // `total_refunded_amount` est le CUMUL : le confondre avec
      // `amount.total` ferait un avoir de trop au second remboursement
      // partiel.
      total_refunded_amount: { total: "34.00" },
    });
    assert.equal(r?.refundRef, "REF-1");
    assert.equal(r?.saleRef, "9XY");
    assert.equal(r?.totalCents, 1700);
  });

  test("la clé d'idempotence d'un avoir est le REMBOURSEMENT", () => {
    // Deux remboursements partiels de la même vente doivent produire
    // deux avoirs : les distinguer par `sale_id` n'en produirait qu'un.
    const a = remboursementDepuisRefund({ id: "R1", sale_id: "S", amount: { total: "5.00" } });
    const b = remboursementDepuisRefund({ id: "R2", sale_id: "S", amount: { total: "12.00" } });
    assert.notEqual(a?.refundRef, b?.refundRef);
  });
});

describe("Ce que Stripe a déjà collecté", () => {
  test("l'adresse et le numéro de TVA sont repris", () => {
    const a = acheteurDepuisStripe({
      email: "marie@exemple.fr",
      name: "Marie Dupont",
      address: { line1: "12 rue des Lilas", postal_code: "34000", city: "Montpellier", country: "FR" },
      tax_ids: [{ type: "eu_vat", value: "FR38909349045" }],
    });
    assert.equal(a.prenom, "Marie");
    assert.equal(a.nom, "Dupont");
    assert.equal(a.pays, "FR");
    assert.equal(a.tvaNumero, "FR38909349045");
    assert.deepEqual(manques(a), []);
  });

  test("un identifiant fiscal qui N'EST PAS un numéro de TVA est ignoré", () => {
    // Prendre "le premier de la liste" ferait passer un ABN australien
    // pour un numéro de TVA européen, donc une autoliquidation inventée.
    const a = acheteurDepuisStripe({
      name: "Bob", tax_ids: [{ type: "au_abn", value: "12345678901" }],
    });
    assert.equal(a.tvaNumero, null);
  });

  test("un nom composé se recolle à l'identique", () => {
    const { prenom, nom } = couperNom("Jean Pierre Martin");
    assert.equal(`${prenom} ${nom}`, "Jean Pierre Martin");
  });

  test("pas de détails : un acheteur vide, jamais une exception", () => {
    assert.deepEqual(acheteurDepuisStripe(null), ACHETEUR_VIDE);
    assert.deepEqual(acheteurDepuisStripe({}), ACHETEUR_VIDE);
  });
});

// ── LES GARDE-FOUS DE STRUCTURE ─────────────────────────────────────

describe("Les règles qui ne se voient pas dans un écran", () => {
  test("PayPal facture sur l'ENCAISSEMENT, jamais sur l'activation", () => {
    // `BILLING.SUBSCRIPTION.ACTIVATED` arrive aussi quand l'abonnement
    // démarre par un mois offert : facturer là facturerait un cadeau.
    const src = lire("app/api/commande/paypal/webhook/route.ts");
    const activation = src.indexOf('eventType !== "BILLING.SUBSCRIPTION.ACTIVATED"');
    const encaissement = src.indexOf('eventType === "PAYMENT.SALE.COMPLETED"');
    assert.ok(encaissement > 0 && activation > 0);
    assert.ok(
      src.slice(encaissement, activation).includes("facturerEcheance"),
      "la facture doit être émise dans la branche PAYMENT.SALE.COMPLETED",
    );
  });

  test("un remboursement PayPal émet un avoir", () => {
    const src = lire("app/api/commande/paypal/webhook/route.ts");
    assert.match(src, /PAYMENT\.SALE\.REFUNDED/);
    assert.match(src, /avoirDuRemboursement/);
  });

  test("la facturation est enregistrée AVANT d'ouvrir PayPal", () => {
    // L'écrire au retour serait trop tard : l'acheteur qui ferme son
    // onglet a payé quand même, et sa facture n'aurait aucune adresse.
    const src = lire("app/api/commande/paypal/route.ts");
    const ecriture = src.indexOf("ecrireFacturation(");
    const ouverture = src.indexOf("createOwnerPaypalSubscription(");
    assert.ok(ecriture > 0 && ouverture > 0);
    assert.ok(ecriture < ouverture, "la facturation doit être écrite avant l'appel à PayPal");
  });

  test("le formulaire carte exige toujours l'adresse et propose l'entreprise", () => {
    // Sans ces deux lignes, une vente Stripe n'aurait pas d'adresse non
    // plus, et la facture Stripe elle même deviendrait un simple reçu.
    const src = lire("lib/checkout/stripeCheckout.ts");
    assert.match(src, /billing_address_collection: "required"/);
    assert.match(src, /"tax_id_collection\[enabled\]": "true"/);
  });

  test("l'émission passe par la fonction SQL, jamais par un INSERT direct", () => {
    // Allouer le numéro puis insérer en deux appels laisserait un trou
    // dans la numérotation dès que le second échoue.
    const src = lire("lib/facture/store.ts");
    assert.match(src, /rpc\("emettre_facture"/);
    assert.ok(
      !/from\(TABLE_FACTURES\)[\s\S]{0,120}\.insert\(/.test(src),
      "aucune insertion directe dans `factures`",
    );
  });

  test("la migration porte l'unicité qui rend un réessai inoffensif", () => {
    const sql = lire("supabase/migrations/20260824_facturation.sql");
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS factures_vente_uidx/);
    assert.match(sql, /\(provider, sale_ref, genre\)/);
    // Et la fonction rend la facture existante au lieu de lever : un
    // webhook rejoué doit répondre 200 sans consommer un numéro.
    assert.match(sql, /IF FOUND THEN\s*\n\s*RETURN v_ligne;/);
  });

  test("le client et l'admin voient LE MÊME formulaire", () => {
    // Trois formulaires écrits séparément finiraient par ne pas demander
    // les mêmes choses, et c'est le champ absent du troisième qui
    // manquerait sur la facture.
    for (const f of [
      "components/facturation/MesInfosFacturation.tsx",
      "components/admin/FacturationClient.tsx",
      "app/commande/[produit]/CommandeClient.tsx",
    ]) {
      assert.match(lire(f), /ChampsFacturation/, `${f} n'utilise pas le formulaire commun`);
    }
  });

  test("une facture émise ne se modifie pas, et les écrans le DISENT", () => {
    // Sans cette phrase, quelqu'un qui corrige son adresse s'attend à
    // voir ses anciennes factures changer et conclut que ça ne marche
    // pas (scénario Jocelyne du 1er août).
    assert.match(lire("messages/fr.json"), /Une facture déjà émise ne se modifie pas/);
    assert.match(
      lire("components/admin/FacturationClient.tsx"),
      /Une facture déjà émise ne se modifie pas/,
    );
  });

  test("les 7 langues ont le bloc facturation", () => {
    for (const l of ["fr", "en", "es", "it", "pt", "pt-BR", "ar"]) {
      const d = JSON.parse(lire(`messages/${l}.json`)) as Record<string, Record<string, string>>;
      assert.ok(d.facturation, `${l} : bloc facturation absent`);
      for (const c of ["title", "save", "saved", "saveFailed", "futureOnly", "invoicesTitle"]) {
        assert.ok(d.facturation[c], `${l}.facturation.${c} manquant`);
      }
    }
  });
});
