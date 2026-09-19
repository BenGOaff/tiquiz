// tests/logic/cadeau-atelier.test.mts
//
// « S'IL UPGRADE SUR LA VERSION PAYANTE (N'IMPORTE LAQUELLE) IL REÇOIT
//   EN PLUS L'ATELIER DU QUIZ GRATOS » (Béné, 18 septembre 2026)
//
// Et ses deux arbitrages du même jour, qui changent tout :
//
//   * le cadeau n'est ouvert que dans des FENÊTRES : les 7 jours après
//     l'inscription gratuite, puis 2 jours à la relance de 6 mois, puis
//     2 jours à celle d'un an ;
//   * les 30 jours offerts par un lien affilié se CUMULENT avec lui.
//
// -- CE QUE CE FICHIER EXISTE POUR EMPÊCHER ----------------------------
//
// Trois portes ouvrent un plan payant (le checkout Stripe, le webhook
// PayPal, le webhook Systeme.io). Si chacune décidait de son côté si le
// cadeau est dû, les trois finiraient par ne pas dire la même chose :
// c'est le piège numéro 1 de ce dépôt, sorti huit fois. Elles appellent
// donc toutes LA MÊME fonction, et ce test le vérifie dans la source.
//
// Et le cas qui coûterait le plus cher : offrir l'Atelier à CHAQUE
// changement de palier. Quelqu'un qui passe de mensuel à annuel
// n'upgrade pas DEPUIS LE GRATUIT, et l'oublier reviendrait à donner la
// formation à tout le monde, une fois par changement.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  JOURS_FENETRE_INSCRIPTION,
  JOURS_FENETRE_RELANCE,
  RATTRAPAGE_JOURS,
  RELANCES_JOURS,
  cadeauAtelierOuvert,
  estUnUpgradeDepuisLeGratuit,
  relanceAEnvoyer,
} from "../../lib/cadeau/atelierOffert.ts";
import { buildCadeauAtelierContent } from "../../lib/email/cadeauAtelierContent.ts";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const lire = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

const JOUR = 24 * 60 * 60 * 1000;
const INSCRIT = "2026-09-01T10:00:00.000Z";
const t0 = Date.parse(INSCRIT);
const apres = (jours: number) => new Date(t0 + jours * JOUR);

const VIERGE = {
  inscritLe: INSCRIT,
  relance6moisLe: null,
  relance1anLe: null,
  offertLe: null,
};

describe("La fenêtre de l'inscription", () => {
  test("LES 7 JOURS SONT OUVERTS, LE 8e NE L'EST PLUS", () => {
    assert.equal(cadeauAtelierOuvert(VIERGE, apres(0)).ouvert, true);
    assert.equal(cadeauAtelierOuvert(VIERGE, apres(3)).ouvert, true);
    assert.equal(cadeauAtelierOuvert(VIERGE, apres(7)).ouvert, true);
    // Le 8e jour : c'est son arbitrage, et c'est ce qui rend la relance
    // utile. Sans cette borne, les "2 jours" des relances ne veulent
    // rien dire.
    const ferme = cadeauAtelierOuvert(VIERGE, apres(8));
    assert.equal(ferme.ouvert, false);
    assert.equal(ferme.ouvert === false && ferme.motif, "hors_fenetre");
    assert.equal(JOURS_FENETRE_INSCRIPTION, 7);
  });

  test("LA FIN DE LA FENÊTRE SORT AVEC LA RÉPONSE", () => {
    // L'email et l'écran doivent pouvoir dire "jusqu'à jeudi". La
    // recalculer ailleurs donnerait deux dates pour la même promesse.
    const v = cadeauAtelierOuvert(VIERGE, apres(1));
    assert.equal(v.ouvert, true);
    assert.equal(v.ouvert === true && v.finLe, new Date(t0 + 7 * JOUR).toISOString());
  });

  test("SANS DATE D'INSCRIPTION, ON N'OFFRE RIEN", () => {
    // Le repli conservateur : un cadeau manqué se rattrape à la main,
    // un cadeau donné à tort ouvre un accès à vie qu'on ne reprend pas.
    const v = cadeauAtelierOuvert({ ...VIERGE, inscritLe: null }, apres(1));
    assert.equal(v.ouvert, false);
    assert.equal(v.ouvert === false && v.motif, "date_inconnue");
  });

  test("DÉJÀ OFFERT PASSE AVANT TOUT LE RESTE", () => {
    // L'accès est à vie : rouvrir une fenêtre ne doit pas renvoyer un
    // deuxième email de bienvenue à quelqu'un qui suit la formation.
    const v = cadeauAtelierOuvert(
      { ...VIERGE, offertLe: "2026-09-02T00:00:00.000Z" },
      apres(1),
    );
    assert.equal(v.ouvert, false);
    assert.equal(v.ouvert === false && v.motif, "deja_offert");
  });
});

describe("Les fenêtres des relances", () => {
  test("ELLES PARTENT DE LA DATE D'ENVOI, PAS D'UNE DATE CALCULÉE", () => {
    // LE POINT LE PLUS IMPORTANT DE CE FICHIER. Le cron peut tourner en
    // retard d'un jour après une panne. Une fenêtre calculée depuis
    // `inscritLe + 6 mois` se refermerait AVANT que la personne ne
    // reçoive l'email qui la lui annonce.
    const envoyeeEnRetard = new Date(t0 + 190 * JOUR).toISOString();
    const etat = { ...VIERGE, relance6moisLe: envoyeeEnRetard };

    // Le 182e jour, la fenêtre n'est PAS ouverte : rien n'est parti.
    assert.equal(cadeauAtelierOuvert(etat, apres(182)).ouvert, false);
    // Le jour de l'envoi, et les deux suivants, elle l'est.
    assert.equal(cadeauAtelierOuvert(etat, apres(190)).ouvert, true);
    assert.equal(cadeauAtelierOuvert(etat, apres(192)).ouvert, true);
    assert.equal(cadeauAtelierOuvert(etat, apres(193)).ouvert, false);
    assert.equal(JOURS_FENETRE_RELANCE, 2);
  });

  test("LA FENÊTRE NOMME LA PORTE PAR LAQUELLE IL EST ENTRÉ", () => {
    // Sert à savoir laquelle des trois relances convertit, donc
    // lesquelles garder.
    const six = cadeauAtelierOuvert(
      { ...VIERGE, relance6moisLe: new Date(t0 + 182 * JOUR).toISOString() },
      apres(183),
    );
    assert.equal(six.ouvert === true && six.fenetre, "relance_6_mois");

    const an = cadeauAtelierOuvert(
      { ...VIERGE, relance1anLe: new Date(t0 + 365 * JOUR).toISOString() },
      apres(366),
    );
    assert.equal(an.ouvert === true && an.fenetre, "relance_1_an");
  });
});

describe("Quand le cron doit relancer", () => {
  test("À 6 MOIS, PUIS À UN AN, ET JAMAIS DEUX FOIS", () => {
    assert.equal(relanceAEnvoyer(VIERGE, apres(100)), null);
    assert.equal(relanceAEnvoyer(VIERGE, apres(RELANCES_JOURS[0])), "relance_6_mois");
    // Une fois partie, elle ne repart pas.
    const apresSix = { ...VIERGE, relance6moisLe: new Date(t0 + 182 * JOUR).toISOString() };
    assert.equal(relanceAEnvoyer(apresSix, apres(183)), null);
    assert.equal(relanceAEnvoyer(apresSix, apres(RELANCES_JOURS[1])), "relance_1_an");
  });

  test("UN CRON EN RETARD RATTRAPE, MAIS PAS INDÉFINIMENT", () => {
    // Sans rattrapage, une panne de deux jours ferait manquer
    // DÉFINITIVEMENT tous les comptes dont le 182e jour tombe dedans, et
    // personne ne le verrait : la relance ne part pas, et rien ne dit
    // qu'elle aurait dû partir.
    assert.equal(relanceAEnvoyer(VIERGE, apres(RELANCES_JOURS[0] + 3)), "relance_6_mois");
    assert.equal(
      relanceAEnvoyer(VIERGE, apres(RELANCES_JOURS[0] + RATTRAPAGE_JOURS)),
      "relance_6_mois",
    );
    // Au delà, on laisse tomber : une relance "6 mois" au huitième mois
    // est un email qui ne veut plus rien dire.
    assert.equal(relanceAEnvoyer(VIERGE, apres(RELANCES_JOURS[0] + RATTRAPAGE_JOURS + 1)), null);
  });

  test("UN COMPTE D'UN AN JAMAIS RELANCÉ REÇOIT CELLE D'UN AN, PAS LES DEUX", () => {
    // Le cas du cron qui n'a jamais tourné. Envoyer les deux le même
    // jour serait deux emails contradictoires dans la même boîte.
    assert.equal(relanceAEnvoyer(VIERGE, apres(RELANCES_JOURS[1])), "relance_1_an");
  });

  test("CELUI QUI A DÉJÀ REÇU LE CADEAU N'EST PLUS RELANCÉ", () => {
    const offert = { ...VIERGE, offertLe: "2026-09-02T00:00:00.000Z" };
    assert.equal(relanceAEnvoyer(offert, apres(RELANCES_JOURS[0])), null);
    assert.equal(relanceAEnvoyer(offert, apres(RELANCES_JOURS[1])), null);
  });
});

describe("Ce qui compte comme un upgrade", () => {
  test("DU GRATUIT VERS N'IMPORTE QUEL PAYANT, ET RIEN D'AUTRE", () => {
    for (const plan of ["monthly", "monthly_plus", "yearly", "yearly_plus", "lifetime"]) {
      assert.equal(estUnUpgradeDepuisLeGratuit("free", plan), true, plan);
    }
    // LE CAS QUI COÛTERAIT LE PLUS CHER : un changement de palier n'est
    // PAS un upgrade depuis le gratuit. L'oublier donnerait l'Atelier a
    // tout le monde, une fois par changement.
    assert.equal(estUnUpgradeDepuisLeGratuit("monthly", "yearly"), false);
    assert.equal(estUnUpgradeDepuisLeGratuit("monthly", "monthly_plus"), false);
    assert.equal(estUnUpgradeDepuisLeGratuit("yearly_plus", "monthly"), false);
    // Et un retour au gratuit n'est pas un upgrade non plus.
    assert.equal(estUnUpgradeDepuisLeGratuit("monthly", "free"), false);
    assert.equal(estUnUpgradeDepuisLeGratuit("free", "free"), false);
  });

  test("UN PLAN ABSENT COMPTE COMME GRATUIT", () => {
    // Un compte cree par le paiement lui meme. Il n'a pas de periode
    // gratuite, donc pas de fenetre d'inscription ouverte non plus :
    // c'est `cadeauAtelierOuvert` qui s'en occupe. Les deux controles se
    // completent, aucun ne suffit seul.
    assert.equal(estUnUpgradeDepuisLeGratuit(null, "monthly"), true);
    assert.equal(estUnUpgradeDepuisLeGratuit("", "monthly"), true);
  });
});

describe("Les trois portes appellent la même décision", () => {
  test("AUCUNE NE DÉCIDE DE SON CÔTÉ", () => {
    // Le piège numéro 1 de ce dépôt : une décision prise à un endroit,
    // re-déduite à un autre. Ici il y a TROIS endroits qui ouvrent un
    // plan payant, donc trois occasions de diverger.
    for (const porte of [
      "app/api/commande/webhook/route.ts",
      "app/api/commande/paypal/webhook/route.ts",
      "app/api/systeme-io/webhook/route.ts",
    ]) {
      const src = sansCommentaires(lire(porte));
      assert.match(src, /offrirAtelierSiDu\(/, `${porte} n'offre pas l'Atelier`);
      // Et elle ne refait PAS le calcul de son cote.
      assert.ok(
        !src.includes("cadeauAtelierOuvert("),
        `${porte} recalcule la fenetre au lieu d'appeler la porte unique`,
      );
    }
  });

  test("L'URL DE L'ATELIER VIENT DU SEUL ENDROIT QUI LA PORTE", () => {
    // Drame du 3 aout : une URL ecrite en dur a deux endroits ne se
    // corrige jamais qu'a moitie. J'ai commence par la reecrire ici.
    const src = lire("lib/cadeau/offrirAtelier.ts");
    assert.match(src, /from "@\/lib\/partner\/atelierUrl"/);
    assert.ok(!src.includes("quizing.tipote.com"), "le domaine est reecrit en dur");
  });

  test("ON MARQUE APRÈS AVOIR OUVERT, JAMAIS AVANT", () => {
    // Marquer avant l'appel perdrait le cadeau sur une panne reseau, et
    // personne ne le saurait : la fenetre serait fermee sur un acces
    // jamais ouvert.
    const src = sansCommentaires(lire("lib/cadeau/offrirAtelier.ts"));
    const iAppel = src.indexOf("acces-offert");
    const iMarque = src.indexOf("cadeau_atelier_offert_le:");
    assert.ok(iAppel > 0 && iMarque > 0);
    assert.ok(iMarque > iAppel, "la marque est posee avant l'ouverture de l'acces");
  });
});

describe("La relance qu'on envoie", () => {
  test("ELLE DIT LA DATE LIMITE, ET C'EST CELLE DU SERVEUR", () => {
    const c = buildCadeauAtelierContent({
      prenom: "Greg",
      fenetre: "relance_6_mois",
      finLe: "2026-03-05T10:00:00.000Z",
      lien: "https://tiquiz.fr/commande/mensuel",
    });
    assert.match(c.text, /Greg/);
    assert.match(c.subject, /5 mars/);
    assert.match(c.text, /5 mars/);
    assert.match(c.html, /tiquiz\.fr\/commande\/mensuel/);
  });

  test("SIX MOIS ET UN AN NE SE DISENT PAS PAREIL", () => {
    const six = buildCadeauAtelierContent({
      fenetre: "relance_6_mois", finLe: "2026-03-05T10:00:00.000Z", lien: "https://x.fr",
    });
    const an = buildCadeauAtelierContent({
      fenetre: "relance_1_an", finLe: "2026-03-05T10:00:00.000Z", lien: "https://x.fr",
    });
    assert.match(six.text, /six mois/);
    assert.match(an.text, /un an/);
    assert.notEqual(six.subject, an.subject);
  });

  test("AUCUN TIRET CADRATIN, ET AUCUN ACCORD AU FÉMININ", () => {
    // Les deux regles absolues du contenu user-visible : le tiret long
    // est une signature d'IA (7 juin), et un accord au feminin dit "ce
    // produit n'est pas pour toi" (23 aout).
    for (const f of ["relance_6_mois", "relance_1_an"] as const) {
      const c = buildCadeauAtelierContent({
        fenetre: f, finLe: "2026-03-05T10:00:00.000Z", lien: "https://x.fr",
      });
      for (const texte of [c.subject, c.text]) {
        assert.ok(!/[–—]/.test(texte), `tiret cadratin dans ${f}`);
        assert.ok(!/\b(inscrite|prête|connectée|sûre)\b/.test(texte), `accord au feminin dans ${f}`);
        assert.ok(!texte.includes("·e"), `point median dans ${f}`);
      }
    }
  });

  test("SANS LIEN, L'EMAIL NE PART PAS", () => {
    // Un email qui annonce un cadeau sans lien pour le prendre donne
    // l'air de se moquer.
    const src = sansCommentaires(lire("lib/email/cadeauAtelierEmail.ts"));
    assert.match(src, /if \(!args\.lien\)[\s\S]{0,200}?return false;/);
  });
});

describe("Le cron", () => {
  test("IL RÉSERVE AVANT D'ENVOYER, ET C'EST LA BASE QUI TRANCHE", () => {
    // Deux executions qui se chevauchent enverraient le meme email deux
    // fois. Un select puis un update ne protege de rien.
    const src = sansCommentaires(lire("app/api/cron/cadeau-atelier/route.ts"));
    assert.match(src, /\.is\(colonne, null\)/, "la reservation n'est plus conditionnelle");
    const iReserve = src.indexOf(".is(colonne, null)");
    const iEnvoi = src.indexOf("sendCadeauAtelierEmail(");
    assert.ok(iReserve > 0 && iEnvoi > iReserve, "l'email part avant la reservation");
  });

  test("IL NE RELANCE QUE LES COMPTES GRATUITS", () => {
    const src = sansCommentaires(lire("app/api/cron/cadeau-atelier/route.ts"));
    assert.match(src, /plan !== "free"/, "il relancerait des gens qui paient deja");
  });

  test("LE SECRET SE COMPARE EN TEMPS CONSTANT, ET NE S'IMPRIME PAS", () => {
    const src = lire("app/api/cron/cadeau-atelier/route.ts");
    assert.match(src, /timingSafeEqual/);
    assert.ok(!/console\.(log|error)\([^)]*CRON_SECRET/.test(src), "le secret peut s'imprimer");
  });
});

describe("La migration", () => {
  test("ELLE EST IDEMPOTENTE ET RECHARGE LE SCHÉMA", () => {
    const sql = lire("supabase/migrations/20260918_cadeau_atelier.sql");
    for (const colonne of [
      "cadeau_atelier_offert_le",
      "cadeau_atelier_relance_6mois_le",
      "cadeau_atelier_relance_1an_le",
      "cadeau_atelier_fenetre",
    ]) {
      assert.ok(sql.includes(`add column if not exists ${colonne}`), colonne);
    }
    assert.match(sql, /notify pgrst, 'reload schema'/);
  });
});

// ---------------------------------------- le controle avant d'envoyer du monde

test("le controle de la chaine distingue « pas vu » de « casse »", () => {
  // C'est la faute qui a coute onze jours de compteur de trafic a zero,
  // et ce script existe justement pour ne pas la refaire : un point qu'on
  // n'a pas pu mesurer ne doit JAMAIS se lire comme un point conforme,
  // ni comme une panne.
  const src = sansCommentaires(lire("scripts/check-cadeau-atelier.mts"));
  assert.ok(src.includes("function pasVu("), "un troisieme etat existe");
  assert.ok(src.includes("A VOIR"), "et il se voit a l'ecran");
  // Le verdict ne peut pas dire « de bout en bout » quand il reste des
  // points non mesures.
  const i = src.indexOf("aveugle > 0");
  assert.ok(i > 0, "le verdict compte les points non mesures");
  assert.ok(
    src.indexOf("de bout en bout") > i,
    "le feu vert vient APRES le cas des points non mesures",
  );
  // Trois codes de sortie distincts : 1 casse, 3 incomplet, 0 vert.
  assert.ok(src.includes("souci > 0 ? 1 : aveugle > 0 ? 3 : 0"), "trois sorties distinctes");
});

test("le controle ne fait RIEN partir, et n'imprime aucun secret", () => {
  const src = lire("scripts/check-cadeau-atelier.mts");
  // Le secret sert a interroger, il ne sort jamais du processus.
  assert.ok(
    !/console\.log\([^)]*\bsecret\b[^)]*\)/.test(src),
    "le secret ne s'imprime pas",
  );
  // L'adresse du controle est VOLONTAIREMENT invalide : la porte valide
  // le secret avant l'adresse, donc aucun acces ne s'ouvre.
  assert.ok(
    src.includes("controle-sans-arobase"),
    "le controle du secret n'ouvre aucun acces a personne",
  );
  // Aucune ecriture en base.
  assert.ok(!/\bupdate\b|\binsert\b|\bupsert\b/i.test(src), "lecture seule");
});
