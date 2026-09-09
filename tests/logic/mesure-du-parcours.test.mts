// tests/logic/mesure-du-parcours.test.mts
//
// LES CINQ ÉVÉNEMENTS DU PARCOURS, ET LA DURÉE QUI JUSTIFIERA LE
// CHANTIER 3 (9 septembre 2026).
//
// Béné : "Cinq chantiers, dans cet ordre. Le point 1 avant tout : sans
// mesure, on ne saura pas si le reste a servi." Puis : "Le seul ratio à
// afficher : generation_lancee -> compte_cree. Ajoute aussi la durée
// médiane de generation_reussie : c'est le chiffre qui justifiera le
// chantier 3."
//
// -- POURQUOI CE FILET, ET CE QU'IL TIENT ----------------------------
//
// Une mesure fausse ne casse RIEN. La page s'affiche, le quiz se
// génère, l'inscription aboutit, et le tableau de bord raconte une
// autre histoire que la réalité. C'est la pire forme de panne de ce
// dépôt, et elle vit ici en cinq endroits :
//
// 1. UN PARAMÈTRE VIDE NE S'ENVOIE PAS. GA4 compterait "" comme une
//    valeur, donc un profil inconnu deviendrait une modalité de plus
//    dans ses rapports.
//
// 2. `source` RETOMBE SUR "direct", JAMAIS SUR RIEN. Une génération
//    sans source rétrécirait le dénominateur du seul ratio qu'elle
//    lit, donc le flatterait.
//
// 3. UNE DURÉE ABSURDE NE PART PAS. Une horloge qui recule ou un onglet
//    resté ouvert déplacent une médiane sans que rien ne le dise.
//
// 4. `avait_quiz` EST TOUJOURS LÀ, MÊME À `false`. C'est le numérateur
//    du ratio : omis quand il vaut faux, il ferait croire que toutes
//    les inscriptions sauvent un quiz.
//
// 5. LA FILE D'ATTENTE GARDE L'ORDRE. Le bandeau s'affiche, le visiteur
//    joue au quiz, PUIS il accepte : sans file, `quiz_demarre` est
//    perdu et `quiz_termine` envoyé, donc un entonnoir avec plus
//    d'arrivées que de départs.
//
// -- ET LA DURÉE EN BASE N'EST PAS CELLE DE GA4 ----------------------
//
// GA4 ne rend que des moyennes dans ses rapports standard : une médiane
// demande une exploration ou BigQuery. D'où la colonne `duree_ms`, et
// d'où ce filet sur ce qui l'écrit. Les deux chiffres répondent à deux
// questions différentes et ne doivent jamais se confondre : la colonne
// mesure l'appel au modèle, GA4 mesure ce que le visiteur VIT.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

import { sansCommentaires } from "./aide/sansCommentaires.mts";

import {
  DUREE_MAX_MS,
  dureeEnMs,
  estHoteDeVenteClient,
  evenementCompteCree,
  evenementGenerationLancee,
  evenementGenerationReussie,
  evenementQuizDemarre,
  evenementQuizTermine,
  parcoursDeLAdresse,
  profilNettoye,
  reponseSystemeIo,
  sourceDeLaGeneration,
} from "@/lib/analytics/parcours";
import { CLE_CONSENTEMENT } from "@/lib/analytics/google";
import {
  MIN_POUR_UNE_MEDIANE,
  mesureDeDuree,
  type LigneGeneration,
} from "@/lib/generateur/entonnoirGenerateur";

const RACINE = process.cwd();

function source(relatif: string): string {
  return fs.readFileSync(path.join(RACINE, relatif), "utf8");
}

describe("les cinq événements, et pas un de plus", () => {
  test("les cinq noms sont exactement ceux de sa consigne", () => {
    const noms = [
      evenementQuizDemarre().name,
      evenementQuizTermine("Team Capture").name,
      evenementGenerationLancee({ source: "hero" }).name,
      evenementGenerationReussie({ dureeMs: 1000 }).name,
      evenementCompteCree({ avaitQuiz: true }).name,
    ];
    assert.deepEqual(noms, [
      "quiz_demarre",
      "quiz_termine",
      "generation_lancee",
      "generation_reussie",
      "compte_cree",
    ]);
  });

  test("un paramètre vide est OMIS, jamais envoyé vide", () => {
    // GA4 compterait "" comme une modalité : un profil inconnu
    // deviendrait une valeur de plus dans ses rapports.
    for (const vide of [null, undefined, "", "   "]) {
      const e = evenementQuizTermine(vide);
      assert.equal(
        Object.prototype.hasOwnProperty.call(e.params, "profil"),
        false,
        `un profil ${JSON.stringify(vide)} ne doit pas partir`,
      );
    }
    const avec = evenementQuizTermine("  Team   Capture  ");
    assert.equal(avec.params.profil, "Team Capture");
  });

  test("un profil est borné, et un profil blanc rend null", () => {
    assert.equal(profilNettoye("   "), null);
    assert.equal(profilNettoye(null), null);
    const long = profilNettoye("x".repeat(400));
    assert.equal(long?.length, 60);
  });

  test("la source retombe sur \"direct\", jamais sur null", () => {
    // Une génération sans source rétrécirait le dénominateur du seul
    // ratio qu'elle lit chaque semaine, donc le flatterait.
    assert.equal(sourceDeLaGeneration("hero"), "hero");
    assert.equal(sourceDeLaGeneration("MODELES"), "modeles");
    assert.equal(sourceDeLaGeneration(" direct "), "direct");
    for (const brut of [null, undefined, "", "n-importe-quoi", "Hero!"]) {
      assert.equal(
        sourceDeLaGeneration(brut),
        "direct",
        `${JSON.stringify(brut)} doit retomber sur direct`,
      );
    }
  });

  test("`generation_lancee` porte TOUJOURS sa source", () => {
    const e = evenementGenerationLancee({ source: "modeles" });
    assert.equal(e.params.source, "modeles");
    assert.equal(Object.prototype.hasOwnProperty.call(e.params, "profil"), false);
  });

  test("une durée absurde ne part pas", () => {
    // `Date.now()` peut RECULER (mise à l'heure du système), et un
    // onglet resté ouvert donne des heures : les deux déplacent une
    // médiane sans que rien ne le dise.
    assert.equal(dureeEnMs(1234), 1234);
    assert.equal(dureeEnMs("1234"), 1234);
    assert.equal(dureeEnMs(1234.6), 1235);
    assert.equal(dureeEnMs(0), 0);
    assert.equal(dureeEnMs(DUREE_MAX_MS), DUREE_MAX_MS);
    // `Number(null)` vaut ZÉRO, et `Number("")` aussi : sans garde, "je
    // n'ai pas mesuré" devenait "génération instantanée", donc un faux
    // zéro au milieu de sa médiane.
    const mauvaises: unknown[] = [
      -1,
      -5000,
      DUREE_MAX_MS + 1,
      NaN,
      Infinity,
      null,
      undefined,
      "",
      "   ",
      "abc",
      true,
      false,
      [],
      {},
    ];
    for (const mauvais of mauvaises) {
      assert.equal(
        dureeEnMs(mauvais),
        null,
        `${JSON.stringify(mauvais)} n'est pas une durée`,
      );
    }
    const sansDuree = evenementGenerationReussie({ dureeMs: -3 });
    assert.equal(
      Object.prototype.hasOwnProperty.call(sansDuree.params, "duree_ms"),
      false,
      "une durée refusée ne doit pas partir à zéro",
    );
  });

  test("la réponse Systeme.io est facultative, et elle n'invente rien", () => {
    // La question posée pendant l'attente ne bloque rien : la plupart
    // des générations partiront sans réponse. Le paramètre est alors
    // OMIS, pour que GA4 ne mélange pas un "pas répondu" avec un "non".
    assert.equal(reponseSystemeIo("oui"), "oui");
    assert.equal(reponseSystemeIo("PAS-ENCORE"), "pas-encore");
    for (const brut of [null, undefined, "", "peut-etre", "yes"]) {
      assert.equal(reponseSystemeIo(brut), null);
    }
    const sans = evenementGenerationReussie({ dureeMs: 900 });
    assert.equal(Object.prototype.hasOwnProperty.call(sans.params, "systemeio"), false);
    const avec = evenementGenerationReussie({ dureeMs: 900, systemeio: "non" });
    assert.equal(avec.params.systemeio, "non");
  });

  test("`avait_quiz` est TOUJOURS présent, même à false", () => {
    // C'est le numérateur du seul ratio qu'elle lit. Omis quand il vaut
    // faux, il ferait croire que toutes les inscriptions sauvent un
    // quiz déjà écrit.
    for (const valeur of [true, false]) {
      const e = evenementCompteCree({ avaitQuiz: valeur });
      assert.equal(
        Object.prototype.hasOwnProperty.call(e.params, "avait_quiz"),
        true,
        `avait_quiz doit partir même à ${valeur}`,
      );
      assert.equal(e.params.avait_quiz, valeur);
    }
  });

  test("l'hôte de vente se lit dans la table de `salesHosts`, pas dans une deuxième liste", () => {
    assert.equal(estHoteDeVenteClient("tiquiz.fr"), true);
    assert.equal(estHoteDeVenteClient("TIQUIZ.FR"), true);
    assert.equal(estHoteDeVenteClient("tiquiz.fr:3001"), true);
    assert.equal(estHoteDeVenteClient("quiz.tipote.com"), false);
    assert.equal(estHoteDeVenteClient(null), false);
  });
});

describe("la durée médiane de la génération", () => {
  function gen(dureeMs: number | null): LigneGeneration {
    return {
      source: "page-generateur",
      compte: null,
      plan: null,
      modele: null,
      jetonsEntree: null,
      jetonsSortie: null,
      dureeMs,
    };
  }

  test("la médiane, sur un compte impair et sur un compte pair", () => {
    // Une MÉDIANE, pas une moyenne : un seul appel parti en délai
    // d'attente déplace une moyenne de plusieurs secondes et une
    // médiane de rien.
    const impair = Array.from({ length: 11 }, (_, i) => gen((i + 1) * 1000));
    assert.equal(mesureDeDuree(impair).medianeMs, 6000);

    const pair = Array.from({ length: 12 }, (_, i) => gen((i + 1) * 1000));
    assert.equal(mesureDeDuree(pair).medianeMs, 6500);
  });

  test("un délai d'attente ne déplace pas la médiane", () => {
    const dix = Array.from({ length: 10 }, () => gen(20_000));
    const avec = [...dix, gen(600_000)];
    assert.equal(mesureDeDuree(avec).medianeMs, 20_000);
  });

  test("sous le seuil, la médiane est `null` et l'écran doit le dire", () => {
    const juste = Array.from({ length: MIN_POUR_UNE_MEDIANE - 1 }, () => gen(5000));
    const m = mesureDeDuree(juste);
    assert.equal(m.medianeMs, null, "pas de médiane sur trop peu de générations");
    assert.equal(m.mesurees, MIN_POUR_UNE_MEDIANE - 1);

    const assez = Array.from({ length: MIN_POUR_UNE_MEDIANE }, () => gen(5000));
    assert.equal(mesureDeDuree(assez).medianeMs, 5000);
  });

  test("une génération sans mesure est COMPTÉE, jamais lue comme instantanée", () => {
    // Aucune ligne d'avant le 9 septembre ne porte de durée : les
    // compter à zéro écraserait la médiane vers le bas, et l'écran
    // annoncerait un générateur deux fois plus rapide qu'il n'est.
    const lignes = [
      ...Array.from({ length: 10 }, () => gen(30_000)),
      ...Array.from({ length: 5 }, () => gen(null)),
      gen(0),
    ];
    const m = mesureDeDuree(lignes);
    assert.equal(m.mesurees, 10);
    assert.equal(m.sansMesure, 6, "les `null` ET les zéros sont comptés à part");
    assert.equal(m.medianeMs, 30_000);
  });

  test("aucune génération du tout ne rend ni médiane ni faux zéro", () => {
    const m = mesureDeDuree([]);
    assert.equal(m.medianeMs, null);
    assert.equal(m.mesurees, 0);
    assert.equal(m.sansMesure, 0);
  });
});

describe("ce qui écrit la durée en base", () => {
  test("la migration ajoute `duree_ms` et recharge le schéma", () => {
    const sql = source("supabase/migrations/20260909_generateur_duree.sql");
    assert.match(sql, /add column if not exists duree_ms/i);
    assert.match(sql, /embed_quiz_sessions/);
    assert.match(sql, /notify pgrst/i);
  });

  test("le chrono démarre à l'ENTRÉE du POST, avant tout `await`", () => {
    // "Entrée de la requête -> réponse lue" : posé après la lecture du
    // corps ou après la limite par IP, il cacherait tout ce qui
    // l'entoure et dirait le générateur plus rapide qu'il n'est.
    const code = sansCommentaires(source("app/api/embed/quiz/generate/route.ts"));
    const posPost = code.indexOf("export async function POST");
    assert.ok(posPost > -1, "la route doit exporter POST");
    const posDebut = code.indexOf("const debut = Date.now()", posPost);
    assert.ok(posDebut > -1, "le chrono doit démarrer dans POST");
    const posAwait = code.indexOf("await", posPost);
    assert.ok(posAwait > -1, "la route attend forcément quelque chose");
    assert.ok(
      posDebut < posAwait,
      "le chrono doit démarrer avant le premier `await` de la route",
    );
  });

  test("la durée est écrite MÊME quand l'usage est illisible", () => {
    // Une réponse tronquée ou refusée a coûté exactement le même temps
    // qu'une réponse complète, et c'est précisément le genre de réponse
    // qui traîne le plus : l'exclure ferait une médiane trop flatteuse.
    const code = sansCommentaires(source("app/api/embed/quiz/generate/route.ts"));
    const posFn = code.indexOf("async function enregistrerUsage");
    assert.ok(posFn > -1, "la route doit porter `enregistrerUsage`");
    const corps = code.slice(posFn);
    const posDuree = corps.indexOf("duree_ms");
    const posSi = corps.indexOf("if (");
    assert.ok(posDuree > -1, "`enregistrerUsage` doit écrire `duree_ms`");
    assert.ok(posSi > -1, "l'usage reste conditionnel, lui");
    assert.ok(
      posDuree < posSi,
      "`duree_ms` doit être écrit avant toute condition, donc toujours",
    );

    const posAppel = code.indexOf("await enregistrerUsage(");
    assert.ok(posAppel > -1, "`enregistrerUsage` doit être appelée");
    assert.match(
      code.slice(posAppel, posAppel + 120),
      /Date\.now\(\)\s*-\s*debut/,
      "l'appel doit passer la durée écoulée depuis l'entrée du POST",
    );
  });

  test("l'écran du pilotage AFFICHE la médiane, et dit ce qu'elle couvre", () => {
    // Une médiane calculée et jamais montrée ne justifie rien : c'est le
    // chiffre qu'elle doit comparer avant et après le chantier du flux.
    // Et elle couvre TOUTES les portes, contrairement aux quatre marches
    // de l'entonnoir juste au dessus : l'écran doit le dire, sinon on
    // compare deux chiffres qui ne parlent pas de la même population.
    const code = sansCommentaires(source("components/pilotage/TraficPilotage.tsx"));
    assert.match(code, /e\.duree\.medianeMs/, "la médiane doit être rendue");
    assert.match(code, /e\.duree\.sansMesure/, "les générations sans mesure doivent être dites");
    assert.match(
      code,
      /MIN_POUR_UNE_MEDIANE/,
      "le seuil doit être lu dans le module, pas recopié",
    );
    const affiche = code.replace(/\s+/g, " ");
    assert.match(
      affiche,
      /toutes les portes/i,
      "l'écran doit dire que la durée couvre la page dédiée ET l'iframe",
    );
    assert.match(
      affiche,
      /appel au mod(è|e)le/i,
      "l'écran doit dire que la colonne mesure l'appel au modèle, pas le vécu du visiteur",
    );
    assert.match(
      affiche,
      /generation_reussie/,
      "l'écran doit renvoyer vers GA4 pour le temps vécu",
    );
  });

  test("le lecteur du pilotage NOMME `duree_ms` dans son select", () => {
    // Un `select("*")` rendrait des lignes sans coût ET sans durée le
    // jour où une colonne bouge, sans qu'une erreur s'écrive.
    const code = sansCommentaires(source("lib/pilotage/generateurEntree.ts"));
    const selects = code.match(/\.select\([^)]*\)/g) ?? [];
    assert.ok(selects.length > 0, "le lecteur doit faire un select");
    assert.ok(
      selects.some((s) => s.includes("duree_ms")),
      "le select doit nommer `duree_ms`",
    );
    assert.ok(
      !selects.some((s) => s.includes('"*"')),
      "pas de select(*) sur cette table",
    );
    assert.match(code, /dureeMs\s*:/, "la ligne lue doit porter `dureeMs`");
  });
});

describe("les événements sont branchés là où le geste a lieu", () => {
  test("personne n'écrit un nom d'événement à la main", () => {
    // Deux portes qui décideraient chacune de leur côté finiraient par
    // ne plus dire la même chose (le défaut sorti six fois dans ce
    // dépôt), et ici la divergence coûterait une mesure envoyée après un
    // "refuser". Un composant qui écrirait `"generation_reussie"` en dur
    // aurait forcément fabriqué son propre envoi.
    //
    // ON VISE LES CINQ NOMS, PAS `dataLayer`, et c'est ce qui rend ce
    // garde honnête. Un premier jet balayait `dataLayer` : il rougissait
    // sur `components/analytics/GoogleAnalytics.tsx` (qui EST le shim
    // documenté de Google) et sur `components/tracking/TrackingPixels.tsx`
    // plus `lib/clientPixels.ts`, c'est à dire les pixels DES CRÉATRICES
    // sur leurs pages publiques. Ceux là ne sont pas notre mesure : les
    // faire passer par notre porte les gaterait sur nos domaines de
    // vente, et ils vivent chez leurs clientes.
    const noms = [
      "quiz_demarre",
      "quiz_termine",
      "generation_lancee",
      "generation_reussie",
      "compte_cree",
    ];
    const sortie = execSync(
      `grep -rlnE '"(${noms.join("|")})"' --include='*.ts' --include='*.tsx' app components lib || true`,
      { cwd: RACINE, encoding: "utf8" },
    );
    const fichiers = sortie.split("\n").map((l) => l.trim()).filter(Boolean);
    const dehors = fichiers.filter((f) => !f.startsWith("lib/analytics/"));
    assert.deepEqual(
      dehors,
      [],
      `ces fichiers écrivent un nom d'événement à la main : ${dehors.join(", ")}`,
    );
    assert.ok(
      fichiers.length > 0,
      "les cinq noms doivent bien vivre quelque part, sinon ce garde ne mesure plus rien",
    );
  });

  test("le générateur envoie `generation_lancee` puis `generation_reussie`", () => {
    const code = sansCommentaires(source("components/embed/EmbedPreviewClient.tsx"));
    assert.match(code, /envoyerEvenement\(/, "l'écran doit passer par la porte unique");
    const posLancee = code.indexOf("evenementGenerationLancee(");
    const posFetch = code.indexOf('fetch("/api/embed/quiz/generate"');
    const posReussie = code.indexOf("evenementGenerationReussie(");
    const posChrono = code.indexOf("departGeneration.current = Date.now()");
    assert.ok(posLancee > -1, "`generation_lancee` doit partir du générateur");
    assert.ok(posReussie > -1, "`generation_reussie` doit partir du générateur");
    assert.ok(posFetch > -1, "l'écran doit appeler la route de génération");
    assert.ok(
      posChrono > -1 && posChrono < posFetch,
      "le chrono doit démarrer AVANT l'appel : la durée vécue comprend le réseau",
    );
    assert.ok(
      posLancee < posReussie,
      "le dénominateur part avant le numérateur, jamais l'inverse",
    );
  });

  test("la source du parcours se lit sur l'ADRESSE, pas devinée dans l'écran", () => {
    // "direct" veut dire "arrivée sans paramètres" : ça ne peut se
    // savoir que sur la page du générateur.
    const code = sansCommentaires(source("components/embed/EmbedPreviewClient.tsx"));
    assert.match(code, /parcoursDeLAdresse\(/, "l'écran doit lire l'adresse");
    assert.match(code, /window\.location\.search/, "et il lit la vraie chaîne de recherche");
    assert.equal(parcoursDeLAdresse("").source, "direct");
    assert.equal(parcoursDeLAdresse("?source=hero").source, "hero");
    assert.equal(parcoursDeLAdresse("?source=modeles&profil=Team%20Capture").profil, "Team Capture");
    assert.equal(parcoursDeLAdresse(null).source, "direct");
    assert.equal(parcoursDeLAdresse("?source=n-importe-quoi").source, "direct");
  });

  test("une inscription REFUSÉE ne compte pas", () => {
    // Adresse déjà prise, mot de passe trop court : ce n'est pas une
    // inscription, et la compter gonflerait le numérateur d'un ratio
    // dont le dénominateur ne bouge pas.
    const code = sansCommentaires(source("components/auth/SignupForm.tsx"));
    const posTest = code.indexOf("data.ok");
    const posEnvoi = code.indexOf("evenementCompteCree(");
    assert.ok(posTest > -1, "le formulaire doit tester la réponse");
    assert.ok(posEnvoi > -1, "`compte_cree` doit partir du formulaire");
    assert.ok(posEnvoi > posTest, "l'envoi doit venir APRÈS le test de la réponse");
    assert.match(
      code,
      /avaitQuiz:\s*Boolean\(jetonQuiz\)/,
      "`avait_quiz` distingue les deux entrées",
    );
  });

  test("le chemin Google ne compte QUE une première entrée", () => {
    // Une reconnexion d'un compte existant n'est pas une inscription :
    // seule la route d'accueil sait la différence, et elle le dit.
    const code = sansCommentaires(source("app/auth/callback/CallbackClient.tsx"));
    assert.match(code, /evenementCompteCree\(/, "`compte_cree` doit partir du callback");
    assert.match(
      code,
      /accueilli\s*===\s*true/,
      "seule une première entrée compte comme une inscription",
    );
    const route = sansCommentaires(source("app/api/auth/accueil/route.ts"));
    assert.match(
      route,
      /avaitQuiz/,
      "la route doit dire si un quiz attendait : le cookie est retiré dans la même réponse",
    );
  });
});

describe("la file d'attente de l'envoi", () => {
  interface FauxWindow {
    localStorage: { getItem(cle: string): string | null };
    location: { hostname: string; pathname: string };
    dataLayer?: unknown[];
  }
  type Ecouteur = () => void;
  interface FauxDocument {
    addEventListener(type: string, e: Ecouteur, capture?: boolean): void;
    removeEventListener(type: string, e: Ecouteur, capture?: boolean): void;
  }

  function accord(): string {
    return JSON.stringify({ mesure: true, pub: false, video: false, t: Date.now() });
  }
  function refus(): string {
    return JSON.stringify({ mesure: false, pub: false, video: false, t: Date.now() });
  }

  /** Un navigateur minimal : la seule chose qu'`envoi.ts` touche. */
  function poserNavigateur(consentement: string | null) {
    const ecouteurs: Ecouteur[] = [];
    const fw: FauxWindow = {
      localStorage: { getItem: (cle) => (cle === CLE_CONSENTEMENT ? consentement : null) },
      location: { hostname: "tiquiz.fr", pathname: "/generateur-de-quiz" },
    };
    const fd: FauxDocument = {
      addEventListener: (_t, e) => {
        ecouteurs.push(e);
      },
      removeEventListener: (_t, e) => {
        const i = ecouteurs.indexOf(e);
        if (i > -1) ecouteurs.splice(i, 1);
      },
    };
    Reflect.set(globalThis, "window", fw);
    Reflect.set(globalThis, "document", fd);
    return {
      fw,
      nbEcouteurs: () => ecouteurs.length,
      cliquer: () => {
        for (const e of [...ecouteurs]) e();
      },
      accorder: () => {
        fw.localStorage.getItem = (cle) => (cle === CLE_CONSENTEMENT ? accord() : null);
      },
      retirer: () => {
        Reflect.deleteProperty(globalThis, "window");
        Reflect.deleteProperty(globalThis, "document");
      },
    };
  }

  async function tic() {
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  }

  function envoyes(fw: FauxWindow): string[] {
    return (fw.dataLayer ?? []).map((e) => {
      const args = Array.from(e as ArrayLike<unknown>);
      return String(args[1]);
    });
  }

  test("avec l'accord déjà donné, l'événement part tout de suite", async () => {
    const { envoyerEvenement, __reinitialiserPourTest } = await import("@/lib/analytics/envoi");
    __reinitialiserPourTest();
    const nav = poserNavigateur(accord());
    try {
      envoyerEvenement(evenementQuizDemarre());
      assert.deepEqual(envoyes(nav.fw), ["quiz_demarre"]);
      assert.equal(nav.nbEcouteurs(), 0, "rien à attendre quand l'accord est là");
    } finally {
      nav.retirer();
      __reinitialiserPourTest();
    }
  });

  test("sans accord, la file garde l'ORDRE et se vide au clic du bandeau", async () => {
    // Le cas qui rend la file nécessaire : le bandeau s'affiche, le
    // visiteur ne répond pas, il joue au quiz, PUIS il accepte. Sans
    // file, `quiz_demarre` est perdu et `quiz_termine` envoyé : un
    // entonnoir avec plus d'arrivées que de départs.
    const { envoyerEvenement, __reinitialiserPourTest } = await import("@/lib/analytics/envoi");
    __reinitialiserPourTest();
    const nav = poserNavigateur(null);
    try {
      envoyerEvenement(evenementQuizDemarre());
      envoyerEvenement(evenementQuizTermine("Team Capture"));
      assert.deepEqual(envoyes(nav.fw), [], "rien ne part avant l'accord");
      assert.equal(nav.nbEcouteurs(), 1, "un seul écouteur, pas un par événement");

      nav.accorder();
      nav.cliquer();
      await tic();

      assert.deepEqual(envoyes(nav.fw), ["quiz_demarre", "quiz_termine"]);
      assert.equal(nav.nbEcouteurs(), 0, "l'écouteur se retire dès qu'il a sa réponse");
    } finally {
      nav.retirer();
      __reinitialiserPourTest();
    }
  });

  test("un REFUS ne vide rien, jamais", async () => {
    const { envoyerEvenement, __reinitialiserPourTest } = await import("@/lib/analytics/envoi");
    __reinitialiserPourTest();
    const nav = poserNavigateur(refus());
    try {
      envoyerEvenement(evenementQuizDemarre());
      nav.cliquer();
      await tic();
      assert.deepEqual(envoyes(nav.fw), [], "un refus ne mesure rien");
    } finally {
      nav.retirer();
      __reinitialiserPourTest();
    }
  });

  test("la file est BORNÉE, et elle garde les plus ANCIENS", async () => {
    // Jeter le premier pour faire de la place recréerait exactement
    // l'inversion que cette file existe pour empêcher.
    const { envoyerEvenement, __reinitialiserPourTest } = await import("@/lib/analytics/envoi");
    __reinitialiserPourTest();
    const nav = poserNavigateur(null);
    const combien = 60;
    try {
      envoyerEvenement(evenementQuizDemarre());
      for (let i = 1; i < combien; i += 1) {
        envoyerEvenement(evenementCompteCree({ avaitQuiz: true }));
      }
      nav.accorder();
      nav.cliquer();
      await tic();

      const partis = envoyes(nav.fw);
      assert.ok(partis.length > 0, "la file doit se vider");
      assert.ok(
        partis.length < combien,
        `la file doit être bornée, ${partis.length} événements sont partis`,
      );
      assert.equal(
        partis[0],
        "quiz_demarre",
        "le PREMIER événement doit survivre : on arrête d'empiler, on ne jette pas l'ancien",
      );
    } finally {
      nav.retirer();
      __reinitialiserPourTest();
    }
  });

  test("sans navigateur, rien ne part et rien ne s'empile", async () => {
    const { envoyerEvenement, __reinitialiserPourTest } = await import("@/lib/analytics/envoi");
    __reinitialiserPourTest();
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "document");
    envoyerEvenement(evenementQuizDemarre());
    const nav = poserNavigateur(accord());
    try {
      envoyerEvenement(evenementQuizTermine("Team Capture"));
      assert.deepEqual(
        envoyes(nav.fw),
        ["quiz_termine"],
        "l'événement émis sans navigateur ne doit pas ressortir plus tard",
      );
    } finally {
      nav.retirer();
      __reinitialiserPourTest();
    }
  });
});
