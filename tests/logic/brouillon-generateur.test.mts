// tests/logic/brouillon-generateur.test.mts
//
// CHANTIER 5 : LE QUIZ GARDÉ 7 JOURS (Béné, 9 septembre 2026)
//
// « Aujourd'hui, quelqu'un qui génère un quiz et ferme l'onglet est
// perdu pour toujours. »
//
// Ce que ce filet tient : la fenêtre de 7 jours, le fait qu'aucun accès
// au navigateur ne peut faire tomber l'écran (navigation privée), et les
// quatre gestes du bandeau.

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

import {
  CLE_BROUILLON, CLE_SORTIE_VUE, FENETRE_JOURS,
  chargerBrouillon, ecrireBrouillon, enregistrerBrouillon,
  ligneDeSortieDejaVue, lireBrouillon, marquerLigneDeSortieVue,
  oublierBrouillon, sortieParLeHaut,
} from "@/lib/generateur/brouillon";

const lire = (p: string) => readFileSync(p, "utf8");
const CLIENT = "components/embed/EmbedPreviewClient.tsx";
const CLAIM = "components/dashboard/EmbedAutoClaim.tsx";

const JOUR = 24 * 60 * 60 * 1000;
const T0 = 1_757_000_000_000;

// ── 1. LA FENÊTRE ────────────────────────────────────────────────────

test("sa fenêtre est de sept jours, et elle est nommée", () => {
  assert.equal(FENETRE_JOURS, 7);
  assert.equal(CLE_BROUILLON, "tiquiz.brouillon", "sa clé, ses mots");
});

test("un brouillon de six jours se rouvre, un de huit jours non", () => {
  const ecrit = (le: number) => ecrireBrouillon({ jeton: "jeton-x", titre: "Mon quiz", le });
  assert.ok(lireBrouillon(ecrit(T0 - 6 * JOUR), T0), "six jours doit vivre");
  assert.equal(lireBrouillon(ecrit(T0 - 8 * JOUR), T0), null, "huit jours doit être purgé");
  // Et la bordure elle même : à 7 jours pile, il vit encore.
  assert.ok(lireBrouillon(ecrit(T0 - 7 * JOUR), T0));
});

test("une horloge qui recule ne jette PAS le travail de quelqu'un", () => {
  // Un changement d'heure, une machine remise à l'heure : l'horodatage
  // se retrouve dans le futur. Le périmer perdrait un brouillon
  // parfaitement vivant, et personne ne saurait pourquoi.
  //
  // Et l'écart doit DÉPASSER la fenêtre, sinon le cas ne distingue rien :
  // un brouillon à trois jours dans le futur passerait aussi bien avec
  // une valeur absolue, qui elle jetterait celui d'un mois.
  for (const ecart of [3 * JOUR, 30 * JOUR]) {
    const futur = ecrireBrouillon({ jeton: "jeton-x", titre: null, le: T0 + ecart });
    assert.ok(lireBrouillon(futur, T0), `un brouillon ${ecart / JOUR} jours dans le futur doit vivre`);
  }
});

test("l'heure est un PARAMÈTRE : le test ne dépend pas de l'horloge", () => {
  const src = sansCommentaires(lire("lib/generateur/brouillon.ts"));
  assert.ok(
    /export function lireBrouillon\(\s*brut[^)]*maintenant: number/.test(src),
    "lireBrouillon doit recevoir l'heure, sinon le test clignote",
  );
});

// ── 2. RIEN NE PEUT FAIRE TOMBER L'ÉCRAN ─────────────────────────────

test("une valeur abîmée rend null, elle ne lève jamais", () => {
  for (const brut of [
    null, undefined, "", "pas du json", "[]", "null", "42",
    '{"titre":"sans jeton","le":1}',
    `{"jeton":"x"}`,
    `{"jeton":"x","le":"hier"}`,
    `{"jeton":"x","le":0}`,
    `{"jeton":"   ","le":${T0}}`,
  ]) {
    assert.equal(lireBrouillon(brut, T0), null, `${String(brut)} devrait rendre null`);
  }
});

test("en navigation privée, les quatre accès ne cassent rien", () => {
  // Node n'a ni `localStorage` ni `sessionStorage` : l'accès LÈVE, donc
  // cet environnement EST le cas de la navigation privée. C'est la seule
  // fixture honnête qu'on puisse écrire ici.
  assert.equal(typeof (globalThis as Record<string, unknown>).localStorage, "undefined");
  assert.equal(chargerBrouillon(T0), null);
  assert.doesNotThrow(() => enregistrerBrouillon({ jeton: "x", titre: "y" }));
  assert.doesNotThrow(() => oublierBrouillon());
  assert.doesNotThrow(() => marquerLigneDeSortieVue());
  // Et le repli SÛR est "déjà vue" : une ligne qui se réafficherait à
  // chaque mouvement de souris serait pire que pas de ligne du tout.
  assert.equal(ligneDeSortieDejaVue(), true);
  assert.equal(CLE_SORTIE_VUE.startsWith("tiquiz."), true);
});

test("le tour complet se retrouve, titre compris", () => {
  const b = lireBrouillon(
    ecrireBrouillon({ jeton: "  jeton-y  ", titre: "  Mon   quiz  ", le: T0 }),
    T0,
  );
  assert.deepEqual(b, { jeton: "jeton-y", titre: "Mon quiz", le: T0 });
});

test("un titre absent ou vide rend null, jamais une chaîne vide", () => {
  const b = lireBrouillon(ecrireBrouillon({ jeton: "j", titre: "   ", le: T0 }), T0);
  assert.equal(b?.titre, null);
  const long = lireBrouillon(ecrireBrouillon({ jeton: "j", titre: "a".repeat(300), le: T0 }), T0);
  assert.equal(long?.titre?.length, 120);
});

// ── 3. LA LIGNE DE SORTIE ────────────────────────────────────────────

test("la ligne ne part que par le HAUT de la fenêtre", () => {
  assert.equal(sortieParLeHaut({ clientY: -5, relatedTarget: null }), true);
  assert.equal(sortieParLeHaut({ clientY: 0, relatedTarget: null }), true);
  // Le bas, c'est la barre des tâches ; le côté, un deuxième écran.
  assert.equal(sortieParLeHaut({ clientY: 800, relatedTarget: null }), false);
  // La souris est passée sur un autre élément : elle n'a rien quitté.
  assert.equal(sortieParLeHaut({ clientY: -5, relatedTarget: {} }), false);
});

test("JAMAIS une fenêtre modale", () => {
  // C'est sa consigne, en majuscules dans son brief.
  const src = sansCommentaires(lire(CLIENT));
  const i = src.indexOf("t.brouillonSortie");
  assert.ok(i > 0, "la ligne de sortie n'est plus rendue");
  const autour = src.slice(Math.max(0, i - 400), i + 200);
  for (const interdit of ["Dialog", "AlertDialog", "role=\"dialog\"", "Modal"]) {
    assert.ok(!autour.includes(interdit), `la ligne de sortie ne doit pas être ${interdit}`);
  }
  assert.ok(/<p[^>]*>\{t\.brouillonSortie\}<\/p>/.test(src), "c'est une ligne, pas un écran");
});

// ── 4. LES GESTES DU BANDEAU ─────────────────────────────────────────

test("le bandeau ne s'affiche que sur le formulaire", () => {
  // Par dessus l'éditeur, il proposerait de rouvrir le quiz qui est
  // déjà à l'écran.
  const src = sansCommentaires(lire(CLIENT));
  assert.ok(
    /phase === "form" && brouillon &&/.test(src),
    "le bandeau doit être gaté sur la phase formulaire",
  );
});

test("« En créer un nouveau » OUBLIE le brouillon, il ne le masque pas", () => {
  // Un bandeau simplement caché reviendrait au rechargement suivant, et
  // elle aurait à refuser la même proposition pendant une semaine.
  const src = sansCommentaires(lire(CLIENT));
  const i = src.indexOf("function repartirDeZero");
  assert.ok(i > 0, "le geste n'existe plus");
  const corps = src.slice(i, i + 300);
  assert.ok(corps.includes("oublierBrouillon()"), "il doit effacer, pas masquer");
});

test("le brouillon est écrit quand le quiz EXISTE, pas au démarrage", () => {
  // L'écrire au clic promettrait un quiz qui n'existe pas, et le
  // bandeau de retour rouvrirait un jeton mort.
  const src = sansCommentaires(lire(CLIENT));
  const iEcriture = src.indexOf("enregistrerBrouillon(");
  const iResultat = src.indexOf('ev === "result"');
  const iLancement = src.indexOf("setPhase(\"generating\")");
  assert.ok(iEcriture > 0 && iResultat > 0 && iLancement > 0);
  assert.ok(iEcriture > iResultat, "l'écriture doit vivre dans la branche du résultat");
  assert.ok(iEcriture > iLancement, "elle ne doit pas partir au démarrage de la génération");
});

test("un brouillon coupe le lancement automatique du brief", () => {
  // Écrire un deuxième quiz (donc payer) pendant qu'un bandeau annonce
  // que le premier attend, c'est retirer une décision à quelqu'un qui
  // l'a sous les yeux.
  const src = sansCommentaires(lire(CLIENT));
  const i = src.indexOf("lancementAutomatiqueAutorise({");
  assert.ok(i > 0);
  const avant = src.slice(Math.max(0, i - 400), i);
  assert.ok(
    avant.includes("if (chargerBrouillon()) return;"),
    "le brouillon doit être testé AVANT d'autoriser le lancement",
  );
});

test("le jeton repris passe par le MÊME chemin que celui de l'URL", () => {
  // Deux hydratations écrites séparément finiraient par ne plus rendre
  // le même écran selon la porte empruntée.
  const src = sansCommentaires(lire(CLIENT));
  assert.ok(/const jetonAHydrater = initialSessionToken \|\| jetonRepris;/.test(src));
  assert.ok(/}, \[jetonAHydrater\]\);/.test(src), "l'effet doit suivre le jeton repris");
  const fetchs = src.match(/fetch\(`\/api\/embed\/quiz\/\$\{encodeURIComponent/g) ?? [];
  assert.equal(fetchs.length, 1, "une seule hydratation, pas deux");
});

test("une inscription emporte le brouillon avec le jeton", () => {
  // Le quiz est dans son compte : le laisser ferait réapparaître
  // « Ton quiz t'attend. » pendant une semaine, pour un quiz qu'elle a.
  const src = sansCommentaires(lire(CLAIM));
  const i = src.indexOf("localStorage.removeItem(STORAGE_KEY)");
  assert.ok(i > 0, "le jeton n'est plus effacé");
  assert.ok(
    src.slice(i, i + 200).includes("oublierBrouillon()"),
    "le brouillon doit partir avec le jeton",
  );
});

// ── 5. LES MOTS ──────────────────────────────────────────────────────

test("ses quatre phrases existent dans les deux langues", () => {
  const src = lire("components/embed/embed-i18n.ts");
  for (const cle of ["brouillonTitre", "brouillonQuel", "brouillonReprendre",
                     "brouillonNouveau", "brouillonSortie"]) {
    const trouvees = [...src.matchAll(new RegExp(`${cle}:\\s*"([^"]+)"`, "g"))].map((m) => m[1]);
    assert.equal(trouvees.length, 2, `${cle} : le générateur est servi en français ET en anglais`);
    assert.notEqual(trouvees[0], trouvees[1], `${cle} n'a pas été traduit`);
    for (const p of trouvees) assert.ok(!/[—–]/.test(p), "aucun tiret cadratin");
  }
  // Ses mots, repris tels quels.
  assert.ok(src.includes(`brouillonTitre: "Ton quiz t'attend."`));
  assert.ok(src.includes(`brouillonReprendre: "Le reprendre"`));
  assert.ok(src.includes(`brouillonNouveau: "En créer un nouveau"`));
});

test("la phrase de sortie porte l'espace insécable avant le point d'interrogation", () => {
  // Sa règle du 9 septembre. Le reste du fichier est antérieur.
  const src = lire("components/embed/embed-i18n.ts");
  const m = src.match(/brouillonSortie: "(Tu pars[^"]+)"/);
  assert.ok(m, "la phrase française a changé de forme");
  assert.ok(m[1].includes(" ?"), "espace insécable attendue devant le ?");
});
