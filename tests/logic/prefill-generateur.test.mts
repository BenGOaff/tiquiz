// tests/logic/prefill-generateur.test.mts
//
// CHANTIER 4 : LE CONTRAT D'URL DU GÉNÉRATEUR (Béné, 9 septembre 2026)
//
// « /generateur-de-quiz ne lit aucun paramètre aujourd'hui. Sans ça, les
// six boutons "Générer ce quiz" de la landing et ceux du quiz du hero ne
// mènent nulle part. »
//
// Ce que ce filet tient, et pourquoi chaque cas existe :
//
// 1. le lien écrit et le lien lu emploient les MÊMES mots. Deux
//    orthographes ne casseraient rien : elles rendraient le formulaire
//    vide et la mesure aveugle, en silence ;
// 2. un lancement automatique ne peut JAMAIS se faire rejeter ;
// 3. la PORTE (`page-generateur`, qui décide de l'entonnoir) ne se lit
//    plus dans l'URL, sinon `?source=modeles` ferait disparaître les
//    générations de la landing du seul ratio qu'elle lit.

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

import {
  CLE_AUDIENCE, CLE_OBJECTIF, CLE_SUJET, MAX_TEXTE,
  OBJECTIFS_PAR_SLUG, lancementAutomatiqueAutorise, lienGenerateur, lirePrefill,
} from "@/lib/generateur/prefillUrl";
import { CLE_PROFIL, CLE_SOURCE } from "@/lib/analytics/parcours";
import { OBJECTIVE_KEYS } from "@/components/embed/embed-i18n";
import { SOURCE_GENERATEUR } from "@/lib/site/generateurQuiz";

const lire = (p: string) => readFileSync(p, "utf8");
const PAGE = "app/(site-langues)/generateur-de-quiz/page.tsx";
const CLIENT = "components/embed/EmbedPreviewClient.tsx";
const FORMULAIRE = "components/embed/EmbedForm.tsx";

// ── 1. CE QUE L'ADRESSE PORTE ────────────────────────────────────────

test("les trois clés du brief sont celles de ses liens", () => {
  // Écrites dans son `tiquiz-landing.html`, sur les six cartes et sur
  // les six boutons de résultat du quiz du hero.
  assert.equal(CLE_SUJET, "sujet");
  assert.equal(CLE_AUDIENCE, "audience");
  assert.equal(CLE_OBJECTIF, "objectif");
});

test("un lien de sa landing se relit en entier", () => {
  const b = lirePrefill(
    "?sujet=Savoir+si+je+suis+pr%C3%AAt+%C3%A0+me+faire+accompagner" +
    "&audience=Les+personnes+que+j%27accompagne&objectif=qualifier&source=modeles",
  );
  assert.equal(b.sujet, "Savoir si je suis prêt à me faire accompagner");
  assert.equal(b.audience, "Les personnes que j'accompagne");
  assert.equal(b.objectif, "qualifier");
  assert.equal(b.source, "modeles");
  assert.equal(b.pret, true);
});

test("ses quatre slugs tombent sur une clé RÉELLE du formulaire", () => {
  // Sa table visait des LIBELLÉS français ("Qualifier mes prospects").
  // Le formulaire stocke une CLÉ et traduit le libellé : viser le
  // libellé aurait donné un champ vide sur /en/.
  for (const slug of ["qualifier", "orienter", "faire-decouvrir", "capturer"]) {
    const cle = lirePrefill(`?${CLE_OBJECTIF}=${slug}`).objectif;
    assert.ok(cle, `le slug ${slug} de sa landing ne mène nulle part`);
    assert.ok(
      (OBJECTIVE_KEYS as readonly string[]).includes(cle),
      `${slug} rend ${cle}, qui n'est pas une valeur du menu déroulant`,
    );
  }
});

test("les huit clés réelles passent aussi, sans avoir à revenir ici", () => {
  for (const k of OBJECTIVE_KEYS) {
    assert.equal(lirePrefill(`?${CLE_OBJECTIF}=${k}`).objectif, k);
  }
});

test("un objectif illisible rend null, il ne REFUSE jamais", () => {
  // Un écran qui répondrait "paramètre invalide" à quelqu'un qui vient
  // de cliquer un bouton, c'est quelqu'un qui part.
  const b = lirePrefill("?sujet=Un+sujet&audience=Des+gens&objectif=nimportequoi");
  assert.equal(b.objectif, null);
  assert.equal(b.sujet, "Un sujet");
  assert.equal(b.pret, true, "le reste du brief doit survivre à un objectif inconnu");
});

test("une valeur d'URL finit dans un prompt, donc elle est bornée", () => {
  const b = lirePrefill(`?${CLE_SUJET}=${"a".repeat(500)}`);
  assert.equal(b.sujet.length, MAX_TEXTE);
});

test("une adresse vide rend le brief vide et direct", () => {
  const b = lirePrefill("");
  assert.deepEqual(
    { ...b },
    { sujet: "", audience: "", objectif: null, pret: false, source: "direct", profil: null },
  );
});

// ── 2. LE LANCEMENT AUTOMATIQUE NE PEUT PAS SE FAIRE REJETER ─────────

test("pret est plus exigeant que la validation du formulaire", () => {
  // C'est LE cas qui compte : `handleSubmit` refuse un sujet de moins de
  // 3 caractères et une audience de moins de 2. Si `pret` devenait plus
  // permissif, le lancement automatique enverrait un formulaire que sa
  // propre validation rejetterait, et le visiteur verrait une erreur
  // rouge sans avoir rien tapé.
  const src = sansCommentaires(lire(CLIENT));
  const sujet = src.match(/inputs\.topic\.trim\(\)\.length\s*<\s*(\d+)/);
  const audience = src.match(/inputs\.audience\.trim\(\)\.length\s*<\s*(\d+)/);
  assert.ok(sujet && audience, "les deux seuils de handleSubmit ne se lisent plus : test à reprendre");
  const seuilSujet = Number(sujet[1]);
  const seuilAudience = Number(audience[1]);

  for (let n = 0; n <= 6; n++) {
    const b = lirePrefill(`?sujet=${"a".repeat(n)}&audience=${"b".repeat(n)}`);
    if (!b.pret) continue;
    assert.ok(
      b.sujet.trim().length >= seuilSujet && b.audience.trim().length >= seuilAudience,
      `pret vaut vrai à ${n} caractères, mais le formulaire refuserait`,
    );
  }
  // Et il reste atteignable : un test qui ne peut plus être vrai ment.
  assert.equal(lirePrefill("?sujet=abc&audience=def").pret, true);
});

test("le lancement automatique attend que le formulaire porte le brief", () => {
  // Lancer dans le même effet que `setInputs` enverrait le formulaire
  // VIDE : l'état ne se voit pas dans le rendu qui l'écrit. On dépend
  // donc de `inputs`, jamais d'un délai (un délai est une course).
  const src = sansCommentaires(lire(CLIENT));
  assert.ok(
    /\[\s*lancerLeBrief\s*,\s*inputs\.topic\s*,\s*inputs\.audience\s*\]/.test(src),
    "le lancement doit dépendre de l'état du formulaire, pas d'un délai",
  );
  assert.ok(
    !/setTimeout\([^)]*handleSubmit/.test(src),
    "un setTimeout avant le lancement est une course, pas un garde",
  );
});

test("un robot qui rend le JavaScript ne lance pas de génération payante", () => {
  const nous = "tiquiz.fr";
  assert.equal(
    lancementAutomatiqueAutorise({ referrer: "https://tiquiz.fr/apercu-landing-8f2c9d41", hote: nous }),
    true,
  );
  // Referrer absent : un robot qui ouvre l'adresse directement, ou un
  // lien collé à la main. Le formulaire est rempli, il reste un clic.
  assert.equal(lancementAutomatiqueAutorise({ referrer: "", hote: nous }), false);
  assert.equal(lancementAutomatiqueAutorise({ referrer: null, hote: nous }), false);
  assert.equal(lancementAutomatiqueAutorise({ referrer: "pas une url", hote: nous }), false);
  assert.equal(
    lancementAutomatiqueAutorise({ referrer: "https://www.facebook.com/", hote: nous }),
    false,
  );
  assert.equal(lancementAutomatiqueAutorise({ referrer: "https://tiquiz.fr/x", hote: "" }), false);
});

test("il revient sur un quiz existant : aucun brief, aucune génération", () => {
  const src = sansCommentaires(lire(CLIENT));
  assert.ok(
    /if\s*\(\s*initialSessionToken\s*\)\s*return;/.test(src),
    "un jeton de session doit couper le préremplissage ET le lancement",
  );
});

// ── 3. LE LIEN QUE POSE LA LANDING ───────────────────────────────────

test("un lien porte toujours sa source, et jamais un profil vide", () => {
  const avec = lienGenerateur({
    sujet: "Un sujet", audience: "Des gens", objectif: "orienter",
    source: "hero", profil: "L'accompagnateur",
  });
  assert.ok(avec.includes(`${CLE_SOURCE}=hero`));
  assert.ok(avec.includes(`${CLE_PROFIL}=`));

  const sans = lienGenerateur({
    sujet: "Un sujet", audience: "Des gens", objectif: "qualifier", source: "modeles",
  });
  assert.ok(sans.includes(`${CLE_SOURCE}=modeles`));
  assert.ok(
    !sans.includes(`${CLE_PROFIL}=`),
    "un profil vide rangerait une septième catégorie à côté des six vrais profils",
  );
});

test("ce que le lien écrit, la lecture le retrouve", () => {
  const url = lienGenerateur({
    sujet: "Découvrir quel type de créateur je suis",
    audience: "Les créateurs qui publient en ligne",
    objectif: "faire-decouvrir",
    source: "modeles",
    absolu: true,
  });
  assert.ok(url.startsWith("https://tiquiz.fr/generateur-de-quiz?"));
  const b = lirePrefill(url.slice(url.indexOf("?")));
  assert.equal(b.sujet, "Découvrir quel type de créateur je suis");
  assert.equal(b.audience, "Les créateurs qui publient en ligne");
  assert.equal(b.objectif, "decouvrir");
  assert.equal(b.source, "modeles");
  assert.equal(b.pret, true);
});

// ── 4. LA PORTE NE SE LIT PLUS DANS L'URL ────────────────────────────

test("la porte est décidée par la route, jamais par un paramètre", () => {
  // `?source=modeles` sur les six cartes de sa landing aurait écrit
  // "modeles" dans `embed_quiz_sessions.source`, et
  // `construireEntonnoirGenerateur` ne compte QUE `page-generateur` :
  // ces générations auraient disparu de son entonnoir pendant que les
  // vues de la page, elles, restaient.
  const src = sansCommentaires(lire(PAGE));
  assert.ok(
    /source=\{\s*SOURCE_GENERATEUR\s*\}/.test(src),
    "la page doit poser la porte elle-même",
  );
  assert.ok(
    !/source=\{[^}]*sp\?\./.test(src),
    "la porte ne doit plus venir de l'URL",
  );
});

test("la porte et le parcours ne portent pas les mêmes mots", () => {
  // Les deux vocabulaires vivent dans la même colonne d'idée ("source")
  // et ne veulent pas dire la même chose. S'ils se croisaient, une
  // valeur de parcours passerait pour une porte.
  for (const parcours of ["hero", "modeles", "direct"]) {
    assert.notEqual(SOURCE_GENERATEUR, parcours);
  }
});

// ── 5. LES DEUX CHAMPS OBLIGATOIRES SONT ANNONCÉS ────────────────────

test("le sujet et l'audience disent qu'ils sont obligatoires", () => {
  // « Le champ "À qui s'adresse-t-il ?" est obligatoire sans que rien ne
  // le dise. […] Un clic rejeté sur "Générer" fait partir des gens. »
  const src = sansCommentaires(lire(FORMULAIRE));
  assert.ok(src.includes("t.reqLegend"), "la légende des champs requis doit être rendue");
  const marques = src.match(/aria-required/g) ?? [];
  assert.equal(marques.length, 2, "le sujet ET l'audience portent la marque");
  for (const cle of ["lblTopic", "lblAudience"]) {
    const i = src.indexOf(`t.${cle}`);
    assert.ok(i > 0, `${cle} n'est plus rendu`);
    assert.ok(
      src.slice(i, i + 120).includes("text-destructive"),
      `${cle} doit porter l'étoile qui annonce l'obligation`,
    );
  }
});

test("la légende existe dans les deux langues et ne dit pas la même phrase", () => {
  const src = lire("components/embed/embed-i18n.ts");
  const trouvees = [...src.matchAll(/reqLegend:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(trouvees.length, 2, "le générateur est servi en français ET en anglais");
  assert.notEqual(trouvees[0], trouvees[1], "une des deux langues n'a pas été traduite");
  for (const p of trouvees) assert.ok(!/[—–]/.test(p), "aucun tiret cadratin dans le contenu visible");
});
