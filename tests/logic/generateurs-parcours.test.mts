// tests/logic/generateurs-parcours.test.mts
//
// LE PARCOURS, LA SÉQUENCE FIXE, ET LA BIBLIOTHÈQUE.
//
// Béné, 2 septembre 2026, quatre reproches sur les générateurs :
//   - "le générateur de bonus ne fonctionne pas j'ai un message
//      d'erreur c'est relou" ;
//   - "tu n'as pas repris la belle mise en page facile de l'Atelier
//      [...] fais plutôt plusieurs étapes qui s'enchaînent qu'une longue
//      page qui empile les infos" ;
//   - "il faut que les users retrouvent leurs créations" ;
//   - "le générateur d'emails ne génère pas 'des pistes' mais des emails
//      putain t'as fait n'imp".

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { GENERATEURS, type GenerateurId } from "@/lib/generateurs/catalogue";
import {
  ETAPES,
  etapesDuParcours,
  peutAvancer,
  precedente,
  suivante,
  etapeValide,
} from "@/lib/generateurs/parcours";
import { SEQUENCE_EMAILS, SEQUENCE_PROMO, planFixe, passeParLesPistes } from "@/lib/generateurs/sequences";
import {
  classerParGenerateur,
  etiquetteContenu,
  lireContenu,
  parDateDesc,
  resumeMorceaux,
  cleLivraison,
  type ContenuGenere,
} from "@/lib/generateurs/bibliotheque";
import { cleAnthropic } from "@/lib/ai/cleAnthropic";

const RACINE = process.cwd();
const lire = (p: string) => fs.readFileSync(path.join(RACINE, p), "utf8");

// ---------------------------------------------------------------------
// LA CLÉ ANTHROPIC : le générateur était le SEUL à ne pas la trouver.
// ---------------------------------------------------------------------

describe("La clé Anthropic se lit à un seul endroit", () => {
  test("les deux noms sont essayés, dans l'ordre des neuf autres fonctions", () => {
    const avant = { a: process.env.ANTHROPIC_API_KEY, b: process.env.CLAUDE_API_KEY_OWNER };
    try {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.CLAUDE_API_KEY_OWNER = "  cle-du-serveur  ";
      // C'EST LE CAS RÉEL : sur son serveur, la valeur vit sous le
      // second nom. La route des générateurs ne lisait que le premier.
      assert.equal(cleAnthropic(), "cle-du-serveur");

      process.env.ANTHROPIC_API_KEY = "cle-directe";
      assert.equal(cleAnthropic(), "cle-directe", "l'ordre a changé sans qu'on le demande");

      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY_OWNER;
      assert.equal(cleAnthropic(), "");
    } finally {
      if (avant.a === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = avant.a;
      if (avant.b === undefined) delete process.env.CLAUDE_API_KEY_OWNER;
      else process.env.CLAUDE_API_KEY_OWNER = avant.b;
    }
  });

  test("plus personne ne lit la variable à la main", () => {
    // Neuf copies de la même résolution, et la dixième était fausse.
    // Une règle recopiée finit toujours par en oublier un.
    const fichiers = [
      "app/api/generateurs/route.ts",
      "app/api/quiz/generate/route.ts",
      "app/api/quiz/[quizId]/rewrite/route.ts",
      "app/api/quiz/[quizId]/rebalance/route.ts",
      "app/api/quiz/idea-chat/route.ts",
      "app/api/quiz/gender-variants/route.ts",
      "app/api/embed/quiz/generate/route.ts",
      "lib/quiz/insights.ts",
      "lib/survey/analysis.ts",
      "lib/insights/global.ts",
    ];
    for (const f of fichiers) {
      const src = lire(f);
      assert.ok(src.includes("cleAnthropic"), `${f} ne passe pas par le module`);
      assert.ok(
        !/process\.env\.CLAUDE_API_KEY_OWNER/.test(src),
        `${f} relit la variable à la main`,
      );
    }
  });
});

// ---------------------------------------------------------------------
// LE PARCOURS : des étapes, pas une page qui empile.
// ---------------------------------------------------------------------

describe("Le parcours d'un générateur", () => {
  test("chaque générateur a son propre chemin", () => {
    assert.deepEqual(etapesDuParcours("bonus"), ["projet", "reglages", "pistes", "contenus"]);
    // Les emails n'ont pas de pistes, la promo n'a ni pistes ni réglages :
    // traverser une étape vide est un clic pour rien.
    assert.deepEqual(etapesDuParcours("emails"), ["projet", "reglages", "contenus"]);
    assert.deepEqual(etapesDuParcours("promo"), ["projet", "contenus"]);
  });

  test("tout parcours commence par le projet et finit par les contenus", () => {
    for (const id of GENERATEURS) {
      const l = etapesDuParcours(id);
      assert.equal(l[0], "projet", `${id} ne commence pas par le projet`);
      assert.equal(l[l.length - 1], "contenus", `${id} ne finit pas par les contenus`);
      assert.equal(new Set(l).size, l.length, `${id} répète une étape`);
      for (const e of l) assert.ok(ETAPES.includes(e), `${id} porte une étape inconnue`);
    }
  });

  test("on n'avance pas vers un écran qui ne peut rien produire", () => {
    const rien = { projetPret: false, profilPret: false, offrePrete: false, pistesPretes: false };
    assert.equal(peutAvancer("projet", rien), false);
    assert.equal(peutAvancer("projet", { ...rien, projetPret: true }), true);
    // Les réglages exigent les DEUX : un profil choisi et une offre
    // décrite. Sans offre, le modèle en inventerait une, et elle
    // publierait une promesse qu'elle ne tient pas.
    assert.equal(peutAvancer("reglages", { ...rien, profilPret: true }), false);
    assert.equal(peutAvancer("reglages", { ...rien, profilPret: true, offrePrete: true }), true);
    assert.equal(peutAvancer("contenus", { ...rien, projetPret: true }), false);
  });

  test("on peut revenir en arrière, et le retour s'arrête", () => {
    for (const id of GENERATEURS) {
      const l = etapesDuParcours(id);
      assert.equal(precedente(id, l[0]!), null, `${id} remonte au dessus de la première étape`);
      assert.equal(suivante(id, l[l.length - 1]!), null, `${id} continue après la dernière`);
      for (let i = 1; i < l.length; i++) {
        assert.equal(precedente(id, l[i]!), l[i - 1]);
        assert.equal(suivante(id, l[i - 1]!), l[i]);
      }
    }
  });

  test("une étape qui n'existe pas retombe sur la PREMIÈRE", () => {
    // Jamais sur la dernière : arriver sur "contenus" sans projet
    // montrerait un écran vide sans dire pourquoi.
    assert.equal(etapeValide("promo", "pistes"), "projet");
    assert.equal(etapeValide("emails", "n'importe quoi"), "projet");
    assert.equal(etapeValide("bonus", "pistes"), "pistes");
  });
});

// ---------------------------------------------------------------------
// L'ÉCRAN N'AFFICHE PLUS TOUT EN MÊME TEMPS.
// ---------------------------------------------------------------------

describe("L'écran suit le parcours", () => {
  const src = lire("app/generateurs/[generateur]/GenerateurClient.tsx");

  test("chaque section est gatée sur son étape", () => {
    for (const e of ["projet", "reglages", "pistes", "contenus"]) {
      assert.ok(src.includes(`etape === "${e}"`), `la section ${e} n'est pas gatée`);
    }
  });

  test("l'écran ne recalcule pas la liste des étapes", () => {
    assert.ok(src.includes("etapesDuParcours(generateur)"), "l'écran n'appelle pas le module");
    assert.ok(src.includes("passeParLesPistes(generateur)"), "l'écran devine s'il y a des pistes");
  });

  test("l'intention du modèle n'est JAMAIS affichée telle quelle", () => {
    // Sur un plan fixe, `resume` porte la consigne envoyée au modèle,
    // en français, dans un écran qui existe en 7 langues.
    assert.ok(
      src.includes('resume={piece.cle ? "" : piece.resume}'),
      "l'écran affiche l'intention brute",
    );
    assert.ok(src.includes("t(`temps.${piece.cle}`)"), "le rôle n'est pas traduit");
  });

  test("la bibliothèque et les générateurs sont deux entrées distinctes", () => {
    const accueil = lire("app/generateurs/GenerateursClient.tsx");
    assert.ok(accueil.includes('href="/generateurs/nouveau"'), "on ne peut plus générer");
    assert.ok(accueil.includes('href="/generateurs/mes-contenus"'), "on ne retrouve rien");
    // L'accueil ne montre PLUS les trois cartes : c'est l'étape qu'elle
    // a demandé d'ajouter.
    // Sur le RENDU, pas sur le fichier : l'accueil importe le bandeau
    // de verrou depuis ce module, donc son nom apparaît dans un chemin
    // d'import. Troisième fois dans ces dépôts qu'un contrôle mesure
    // autre chose que ce qu'il croit.
    assert.ok(!accueil.includes("<CartesGenerateurs"), "l'accueil saute l'étape du choix");
  });

  test("la grille des trois cartes n'existe qu'à UN endroit", () => {
    // Recopier la grille dans le nouvel écran aurait donné deux versions
    // à tenir : c'est ce qui a répandu le bandeau bleu en doublon.
    const nouveau = lire("app/generateurs/nouveau/NouveauClient.tsx");
    assert.ok(nouveau.includes("<CartesGenerateurs"), "l'écran redessine les cartes");
    assert.ok(!/gap-4 sm:grid-cols-2 lg:grid-cols-3/.test(nouveau), "la grille est recopiée");
  });
});

// ---------------------------------------------------------------------
// LA BIBLIOTHÈQUE.
// ---------------------------------------------------------------------

const CONTENU = (o: Partial<Record<string, unknown>> = {}) =>
  lireContenu({
    id: "abc",
    generateur: "emails",
    quiz_id: "q1",
    quiz_titre: "Mon quiz",
    titre: "",
    profil_index: 2,
    profil_titre: "La perfectionniste",
    pieces: [{ bloc: "email", index: 1, cle: "sonResultat", markdown: "coucou" }],
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T11:00:00Z",
    ...o,
  })!;

describe("Mes contenus générés", () => {
  test("une ligne inexploitable ne casse pas l'écran", () => {
    assert.equal(lireContenu(null), null);
    assert.equal(lireContenu({ id: "x", generateur: "n'importe quoi" }), null);
    assert.equal(lireContenu({ generateur: "emails" }), null, "une ligne sans id passe");
  });

  test("un morceau vide est écarté, il ne fait pas croire à un trou", () => {
    const c = CONTENU({ pieces: [{ bloc: "email", index: 1, markdown: "   " }] });
    assert.equal(c.morceaux.length, 0);
  });

  test("les trois blocs sont TOUJOURS là, même vides", () => {
    // Un bloc vide dit que le générateur existe : le masquer ferait
    // croire qu'il n'y en a que deux (leçon du vide muet, 24 août).
    const blocs = classerParGenerateur([CONTENU()]);
    assert.deepEqual(blocs.map((b) => b.generateur), [...GENERATEURS]);
    assert.equal(blocs.find((b) => b.generateur === "bonus")!.contenus.length, 0);
  });

  test("le plus récent en premier : c'est celui qu'on vient d'écrire", () => {
    const vieux = CONTENU({ id: "v", updated_at: "2026-08-01T10:00:00Z" });
    const neuf = CONTENU({ id: "n", updated_at: "2026-09-02T10:00:00Z" });
    assert.deepEqual([vieux, neuf].sort(parDateDesc).map((c) => c.id), ["n", "v"]);
  });

  test("l'étiquette nomme le PROFIL avant le quiz", () => {
    // Sinon cinq séquences écrites pour cinq profils du même quiz
    // donnent cinq lignes identiques.
    const { principale, secondaire } = etiquetteContenu(CONTENU());
    assert.equal(principale, "La perfectionniste");
    assert.equal(secondaire, "Mon quiz");
    // Et le titre de la piste passe devant le profil quand il existe.
    const avecTitre = etiquetteContenu(CONTENU({ titre: "La checklist des 7 jours" }));
    assert.equal(avecTitre.principale, "La checklist des 7 jours");
  });

  test("un morceau coupé est COMPTÉ, donc affichable", () => {
    const c = CONTENU({
      pieces: [
        { bloc: "email", index: 1, markdown: "ok" },
        { bloc: "email", index: 2, markdown: "coupe", tronque: true },
      ],
    });
    assert.deepEqual(resumeMorceaux(c), { total: 2, tronques: 1 });
  });

  test("deux profils du même quiz sont deux livraisons", () => {
    const base = { generateur: "emails" as GenerateurId, quizId: "q1", titre: "" };
    assert.notEqual(
      cleLivraison({ ...base, profilIndex: 0 }),
      cleLivraison({ ...base, profilIndex: 1 }),
    );
  });

  test("un quiz supprimé n'emporte pas ce qu'on a écrit pour lui", () => {
    // Le titre est RECOPIÉ à l'enregistrement, et `quiz_id` est en
    // ON DELETE SET NULL : les emails ont peut-être déjà été programmés.
    const migration = lire("supabase/migrations/20260902_generateurs_contenus.sql");
    assert.match(migration, /quiz_id[\s\S]*on delete set null/i);
    assert.match(migration, /quiz_titre/);
    const c = CONTENU({ quiz_id: null });
    assert.equal(c.quizId, null);
    assert.equal(c.quizTitre, "Mon quiz");
  });

  test("le morceau est rangé au fur et à mesure, pas à la fin", () => {
    // Une génération dure une minute et demie : l'onglet fermé au
    // septième morceau ne doit pas tout emporter.
    const route = lire("app/api/generateurs/route.ts");
    assert.ok(route.includes("await rangerMorceau("), "rien n'est enregistré");
    assert.ok(
      route.indexOf("await rangerMorceau(") < route.lastIndexOf("NextResponse.json({\n    ok: true,"),
      "l'enregistrement passe après la réponse",
    );
  });

  test("le store ne prend AUCUNE décision", () => {
    // Il importe `supabaseAdmin`, donc aucun test ne peut le charger :
    // c'est exactement là que les bugs s'installent (24 août).
    const store = lire("lib/generateurs/contenusStore.ts");
    assert.ok(store.includes("supabaseAdmin"), "le store ne parle plus à la base");
    assert.ok(store.includes("lireContenu"), "le store relit les lignes à sa façon");
    const pur = lire("lib/generateurs/bibliotheque.ts");
    // Sur le CODE : l'en-tête du module PARLE du store qui, lui,
    // importe `supabaseAdmin`.
    const codePur = pur.split("\nimport ").slice(1).join("\nimport ");
    assert.ok(!codePur.includes("supabaseAdmin"), "le module pur touche à la base");
  });

  test("la suppression filtre par personne DANS la requête", () => {
    const store = lire("lib/generateurs/contenusStore.ts");
    const bloc = store.slice(store.indexOf("export async function supprimerContenu"));
    assert.ok(bloc.includes('.eq("user_id", userId)'), "on peut supprimer le travail d'un autre");
  });
});

// ---------------------------------------------------------------------
// LA SÉQUENCE FIXE, VUE DE L'ÉCRAN.
// ---------------------------------------------------------------------

describe("Les séquences fixes", () => {
  test("le nombre de morceaux est connu AVANT de lancer", () => {
    // Le coût se dit avant, jamais après : l'écran doit donc savoir
    // combien de morceaux il va écrire sans appeler le serveur.
    assert.equal(planFixe("emails")!.length, SEQUENCE_EMAILS.length);
    assert.equal(planFixe("promo")!.length, SEQUENCE_PROMO.length);
    assert.equal(planFixe("bonus"), null);
  });

  test("chaque temps porte une clé i18n, et elles sont toutes distinctes", () => {
    for (const plan of [SEQUENCE_EMAILS, SEQUENCE_PROMO]) {
      const cles = plan.map((t) => t.cle);
      assert.equal(new Set(cles).size, cles.length, "deux temps partagent une clé");
      for (const c of cles) assert.match(c, /^[a-zA-Z]+$/, `clé i18n douteuse : ${c}`);
    }
  });

  test("les clés existent dans les 7 langues", () => {
    const locales = ["fr", "en", "es", "it", "ar", "pt", "pt-BR"];
    const cles = [...SEQUENCE_EMAILS, ...SEQUENCE_PROMO].map((t) => t.cle);
    for (const l of locales) {
      const d = JSON.parse(lire(`messages/${l}.json`)) as Record<string, any>;
      const temps = d.generateurs?.temps ?? {};
      for (const c of cles) {
        assert.ok(String(temps[c] ?? "").trim(), `${l} n'a pas de libellé pour « ${c} »`);
      }
      for (const e of ETAPES) {
        assert.ok(
          String(d.generateurs?.parcours?.[e] ?? "").trim(),
          `${l} n'a pas de libellé pour l'étape « ${e} »`,
        );
      }
    }
  });

  test("aucun tiret cadratin dans ce qui s'affiche", () => {
    for (const l of ["fr", "en", "es", "it", "ar", "pt", "pt-BR"]) {
      const d = JSON.parse(lire(`messages/${l}.json`)) as Record<string, any>;
      const texte = JSON.stringify({
        temps: d.generateurs?.temps,
        parcours: d.generateurs?.parcours,
        accueil: d.generateurs?.accueil,
        bibliotheque: d.generateurs?.bibliotheque,
      });
      assert.ok(!/[—–]/.test(texte), `${l} porte un tiret cadratin`);
    }
  });

  test("la route refuse l'étape des pistes là où elle n'existe pas", () => {
    // Un écran resté sur l'ancienne version dépenserait des jetons pour
    // rien et afficherait trois "pistes d'emails" que personne n'a
    // demandées.
    const route = lire("app/api/generateurs/route.ts");
    assert.ok(route.includes('if (!passeParLesPistes(id)) return refus("pas_de_pistes")'));
  });

  test("les trois générateurs sont d'accord sur qui a des pistes", () => {
    for (const id of GENERATEURS) {
      assert.equal(
        passeParLesPistes(id),
        planFixe(id) === null,
        `${id} : plan fixe et pistes disent le contraire`,
      );
    }
  });
});
