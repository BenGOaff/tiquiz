// tests/logic/plan-automatisation.test.mts
//
// CE QU'IL FAUT CRÉER DANS SYSTEME.IO POUR CE QUIZ.
//
// Béné, 1er septembre 2026 : "un onglet Automatisation qui explique le
// workflow et les tags précis à créer. Pas un truc générique, un truc
// réel qui explique selon le bonus offert, le CTA, les profils."
//
// Puis, en voyant le premier jet : "empiler les conseils qui disent la
// même chose t'es sûr que c'est le plus lisible ? Genre 1 : les profils
// et 2 : le bonus de partage. Et ensuite tu ne répètes pas."
//
// Ce test tient donc DEUX promesses :
//   - on n'annonce QUE les tags qui partent vraiment ;
//   - on rend des GROUPES, pas une carte par tag.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  construirePlanAutomatisation,
  tagsDeScorePossibles,
  tagsDuProfil,
  type GroupeAutomatisation,
  type PlanAutomatisation,
} from "@/lib/automatisation/planSysteme";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const QUIZ_OK = { mode: "quiz", sio_api_key_id: "cle-1" };
const groupe = (p: PlanAutomatisation, type: string): GroupeAutomatisation | undefined =>
  p.groupes.find((g) => g.type === type);
const tags = (g: GroupeAutomatisation | undefined) => (g?.lignes ?? []).map((l) => l.tag);

describe("On n'annonce que les tags qui partent vraiment", () => {
  test("SANS CLÉ, le manque est BLOQUANT et passe devant", () => {
    // Sans clé, aucun contact n'est créé et aucun tag n'est posé : tout
    // le reste de l'écran serait un plan pour rien.
    const plan = construirePlanAutomatisation({ mode: "quiz" }, [
      { title: "A", sio_tag_names: ["a"] },
    ]);
    const cle = plan.manques.find((m) => m.type === "cle-api");
    assert.ok(cle, "le manque de clé doit être signalé");
    assert.equal(cle!.bloquant, true);
  });

  test("un QUIZ annonce ses profils, jamais le tag de capture", () => {
    // `sio_capture_tag` n'est appliqué que sur un SONDAGE. L'annoncer
    // ici enverrait créer un workflow sur un tag jamais posé.
    const plan = construirePlanAutomatisation(
      { ...QUIZ_OK, sio_capture_tag: "capture-quiz" },
      [{ title: "Team Capture", sio_tag_names: ["team-capture"] }],
    );
    assert.deepEqual(tags(groupe(plan, "profils")), ["team-capture"]);
    assert.equal(groupe(plan, "capture-sondage"), undefined);
  });

  test("un SONDAGE annonce sa capture et ses réponses, jamais de profil", () => {
    const plan = construirePlanAutomatisation(
      { mode: "survey", sio_api_key_id: "cle-1", sio_capture_tag: "repondu" },
      [{ title: "Ignoré", sio_tag_names: ["jamais"] }],
      [{ options: [{ sio_tag_name: "pas-de-liste", text: "Je n'ai pas de liste" }] }],
    );
    assert.deepEqual(tags(groupe(plan, "capture-sondage")), ["repondu"]);
    assert.deepEqual(tags(groupe(plan, "reponses-sondage")), ["pas-de-liste"]);
    assert.equal(groupe(plan, "profils"), undefined);
  });

  test("UN SEUL groupe par tag de réponse, même répété sur dix questions", () => {
    // La même règle sert toutes les questions qui portent ce tag. En
    // créer une par question ferait partir la campagne plusieurs fois.
    const q = { options: [{ sio_tag_name: "chaud", text: "Oui" }] };
    const plan = construirePlanAutomatisation(
      { mode: "survey", sio_api_key_id: "cle-1" },
      [],
      [q, q, q],
    );
    assert.deepEqual(tags(groupe(plan, "reponses-sondage")), ["chaud"]);
  });

  test("les tags de SCORE n'existent que si la case est cochée", () => {
    const sans = construirePlanAutomatisation(QUIZ_OK, []);
    assert.equal(groupe(sans, "score"), undefined);

    const avec = construirePlanAutomatisation({ ...QUIZ_OK, sio_score_tags: true }, []);
    const g = groupe(avec, "score");
    assert.ok(g, "les tranches de score doivent être annoncées");
    // UNE LIGNE PAR VALEUR POSSIBLE : le tag n'est pas un nom fixe, et
    // annoncer un motif obligeait à le déplier de tête.
    assert.equal(g!.lignes.length, 3, "les 3 tranches globales");
    for (const t of g!.lignes) assert.match(t.tag, /^score-/);
  });

  test("UN SOULIGNÉ, PAS UN TIRET, dans un tag d'axe", () => {
    // `slugifyAxisLabel` n'accepte que [a-z0-9_] : "En route" donne
    // `en_route`. Deviner un tiret ferait créer une règle sur un tag
    // qui n'arrive jamais.
    const { parAxe } = tagsDeScorePossibles({
      sio_score_tags: true,
      scoring_axes: [{ label: "En route", key: "En route" }],
      locale: "fr",
    });
    assert.ok(parAxe.length > 0);
    assert.ok(
      parAxe[0].valeurs.every((v) => v.startsWith("en_route-")),
      parAxe[0].valeurs.join(","),
    );
  });

  test("le tag de PARTAGE est annoncé dès qu'il est renseigné", () => {
    // MESURÉ dans la route de partage : il part sans regarder
    // `virality_enabled`.
    const plan = construirePlanAutomatisation(
      { ...QUIZ_OK, sio_share_tag_name: "a-partage", virality_enabled: false },
      [],
    );
    assert.deepEqual(tags(groupe(plan, "partage")), ["a-partage"]);
  });

  test("SANS BONUS DE PARTAGE, aucun groupe et aucune alerte", () => {
    // Béné : "ne pas montrer si pas de partage activé". Et on ne
    // réclame le tag que si un bonus est réellement promis : crier là
    // dessus ferait rougir l'écran de presque tout le monde.
    const plan = construirePlanAutomatisation({ ...QUIZ_OK, show_result_share: true }, []);
    assert.equal(groupe(plan, "partage"), undefined);
    assert.equal(plan.manques.some((m) => m.type === "tag-partage"), false);

    const promis = construirePlanAutomatisation({ ...QUIZ_OK, virality_enabled: true }, []);
    assert.ok(promis.manques.some((m) => m.type === "tag-partage"));
  });

  test("UNE FORMATION RELIÉE : rien à créer, et c'est le piège inverse", () => {
    // Tiquiz ouvre l'accès lui même. Une règle de plus l'ouvrirait deux
    // fois, et ça ne se voit qu'en recevant deux emails.
    const plan = construirePlanAutomatisation(QUIZ_OK, [
      { title: "Pro", sio_tag_names: ["pro"], sio_course_id: "form-1" },
    ]);
    const g = groupe(plan, "acces-automatique");
    assert.ok(g, "le cas doit être dit");
    assert.equal(g!.action, "rien");
    // Et il passe en DERNIER : c'est une note, pas une tâche.
    assert.equal(plan.groupes[plan.groupes.length - 1].type, "acces-automatique");
  });

  test("un profil SANS tag est un manque, pas une étape muette", () => {
    const plan = construirePlanAutomatisation(QUIZ_OK, [
      { title: "Sans tag" },
      { title: "Avec", sio_tag_names: ["avec"] },
    ]);
    assert.deepEqual(tags(groupe(plan, "profils")), ["avec"]);
    const m = plan.manques.find((x) => x.type === "tag-profil");
    assert.ok(m);
    assert.equal(m!.contexte, "Sans tag");
  });

  test("l'ancien champ de tag unique sert de repli", () => {
    assert.deepEqual(tagsDuProfil({ sio_tag_name: "vieux" }), ["vieux"]);
    assert.deepEqual(tagsDuProfil({ sio_tag_name: "vieux", sio_tag_names: ["neuf"] }), ["neuf"]);
    assert.deepEqual(tagsDuProfil({}), []);
  });
});

describe("Le nom d'un profil ne sort JAMAIS en HTML brut", () => {
  test("le titre riche est nettoyé avant d'atteindre l'écran", () => {
    // Ce qu'elle a vu, mot pour mot :
    // Le profil "<div class="rt-field-fs" style="--rt-fs-m&nbsp;: 24px">Team Capture..."
    const brut =
      '<div class="rt-field-fs" style="--rt-fs-m: 24px">Team Capture : ton tunnel perd tes clients</div>';
    const plan = construirePlanAutomatisation(QUIZ_OK, [
      { title: brut, sio_tag_names: ["team-capture"] },
    ]);
    const ligne = groupe(plan, "profils")!.lignes[0];
    assert.ok(ligne.contexte, "le nom doit être là");
    assert.ok(!ligne.contexte!.includes("<"), ligne.contexte);
    assert.ok(!ligne.contexte!.includes("rt-field-fs"), ligne.contexte);
    assert.match(ligne.contexte!, /Team Capture/);
  });

  test("un placeholder est interpolé à VIDE, pas affiché", () => {
    const plan = construirePlanAutomatisation(QUIZ_OK, [
      { title: "Bonjour {name}, tu es le Solopreneur", sio_tag_names: ["solo"] },
    ]);
    const nom = groupe(plan, "profils")!.lignes[0].contexte ?? "";
    assert.ok(!nom.includes("{name}"), nom);
  });

  test("un profil SANS titre porte son RANG, l'écran le traduit", () => {
    // Le module pur ne parle aucune langue : il donne la position, et
    // l'écran écrit "Profil 2" dans la langue de la créatrice.
    const plan = construirePlanAutomatisation(QUIZ_OK, [
      { title: "A", sio_tag_names: ["a"] },
      { title: "", sio_tag_names: ["b"] },
    ]);
    const lignes = groupe(plan, "profils")!.lignes;
    assert.equal(lignes[1].contexte, undefined);
    assert.equal(lignes[1].rang, 2);
  });

  test("il APPELLE resultChoiceLabel, il ne recompose pas", () => {
    // La règle du matin même (retour Christian). Une composition
    // recopiée à la main finit toujours par en oublier une.
    const src = lire("lib/automatisation/planSysteme.ts");
    assert.match(src, /import \{ resultChoiceLabel \}/);
    assert.ok(
      !/stripHtml\(extractResultLabel\(/.test(src),
      "aucune recomposition à la main",
    );
  });
});

describe("La recette est dite UNE fois, pas une fois par tag", () => {
  const PANEL = lire("components/quiz/AutomatisationPanel.tsx");

  test("l'écran rend des GROUPES", () => {
    assert.match(PANEL, /plan\.groupes\.map/);
    assert.ok(!/plan\.etapes/.test(PANEL), "plus d'étapes à plat");
  });

  test("les trois clics sont écrits UNE seule fois", () => {
    // Un quiz à six profils affichait dix-huit lignes de marche à
    // suivre pour six informations.
    for (const cle of ["recette1", "recette2", "recette3"]) {
      const n = PANEL.split(`"${cle}"`).length - 1;
      assert.ok(n <= 1, `${cle} apparaît ${n} fois`);
    }
    assert.match(PANEL, /\["recette1", "recette2", "recette3"\]/);
  });

  test("LA PAGE DÉFILE", () => {
    // L'éditeur est en `h-screen ... overflow-hidden` : sans conteneur
    // défilant, tout ce qui dépasse est inatteignable, et c'est
    // exactement ce que Béné a vu.
    assert.match(PANEL, /flex-1 overflow-y-auto/);
  });

  test("la phrase qui justifie tout l'écran est là", () => {
    // Poser un tag ne déclenche rien tant qu'aucune règle ne l'écoute.
    assert.match(PANEL, /t\("pourquoi"\)/);
  });
});

describe("Les 7 langues sont servies", () => {
  const LOCALES = ["fr", "en", "es", "it", "pt", "pt-BR", "ar"];
  const CLES = [
    "titre", "intro", "pourquoi", "ouvrirSysteme",
    "recetteTitre", "recetteAide", "recette1", "recette2", "recette3",
    "actionAutre", "profilSansNom", "tagSansContexte",
    "manqueCle", "manqueTagProfil", "manqueTagCapture", "manqueTagPartage",
    "videTitre", "videTexte", "noteFin", "copyTag", "copyError",
  ];
  const GROUPES = [
    "profils", "partage", "capture-sondage",
    "reponses-sondage", "score", "acces-automatique",
  ];

  for (const loc of LOCALES) {
    test(`${loc} : aucune clé manquante`, () => {
      const ns = JSON.parse(lire(`messages/${loc}.json`)).automatisation;
      assert.ok(ns, `pas de namespace automatisation en ${loc}`);
      for (const c of CLES) assert.ok(ns[c], `${loc} : ${c} manquante`);
      for (const g of GROUPES) {
        assert.ok(ns.groupe?.[g]?.titre, `${loc} : groupe.${g}.titre manquante`);
        assert.ok(ns.groupe?.[g]?.aide, `${loc} : groupe.${g}.aide manquante`);
      }
    });
  }

  test("AUCUN tiret cadratin dans les textes visibles", () => {
    for (const loc of LOCALES) {
      const ns = JSON.stringify(JSON.parse(lire(`messages/${loc}.json`)).automatisation);
      assert.ok(!/[—–]/.test(ns), `${loc} porte un tiret cadratin`);
    }
  });
});
