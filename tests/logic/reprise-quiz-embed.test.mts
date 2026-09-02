// tests/logic/reprise-quiz-embed.test.mts
//
// LE QUIZ FABRIQUÉ SUR LA PAGE DE VENTE SE RETROUVE DANS LE COMPTE.
//
// Béné, 2 septembre 2026 : "il faut qu'ils génèrent un beau quiz [...] et
// qu'ils le retrouvent derrière, comme la plupart des saas le font : un
// aperçu gratuit alléchant qui demande de créer un compte pour
// continuer."
//
// Ce que ce filet fige, c'est la MESURE qui a motivé le chantier. Dans
// Chromium 141, deux domaines distincts, l'iframe qui écrit et le
// premier plan qui lit :
//
//   réglages par défaut     écrit "abc123"        relu "abc123"
//   cookies tiers bloqués   écrit SecurityError   relu null
//
// Donc : sur Safari et Firefox (leur défaut), l'iframe n'a PAS le droit
// d'écrire, et le `try/catch` autour avale l'erreur. Le seul chemin qui
// traverse tous les navigateurs est une navigation de PREMIER NIVEAU sur
// NOTRE domaine, suivie d'un rattachement CÔTÉ SERVEUR.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  PARAM_REPRISE,
  lireJetonReprise,
  redirectionSure,
  urlConnexionReprise,
  urlInscriptionReprise,
} from "@/lib/embed/reprise";

const lire = (p: string) => readFileSync(p, "utf8");

/** Le CODE seul : une règle écrite en commentaire n'est pas une règle. */
const sansCommentaires = (src: string) =>
  src
    .split("\n")
    .filter((l) => {
      const t = l.trimStart();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

// ── Le jeton : on VALIDE, on ne fait pas confiance ──────────────────

test("un jeton bien formé est accepté, et normalisé en minuscules", () => {
  assert.equal(lireJetonReprise(UUID), UUID);
  assert.equal(lireJetonReprise(`  ${UUID.toUpperCase()}  `), UUID);
});

test("tout ce qui n'est pas un UUID est refusé, jamais transmis à la base", () => {
  // Ces valeurs arrivent d'une URL publique et finissent dans un `.eq()`.
  for (const brut of ["", "   ", "abc", "%", "' or 1=1", "3f2504e0", null, undefined, 42, {}]) {
    assert.equal(lireJetonReprise(brut), null, `refusé : ${JSON.stringify(brut)}`);
  }
});

// ── Où l'on envoie quelqu'un qui veut garder son quiz ───────────────

test("l'inscription est une adresse RELATIVE, donc juste sur les deux domaines", () => {
  const url = urlInscriptionReprise(UUID);
  assert.ok(url.startsWith("/signup?"), url);
  assert.ok(url.includes(`${PARAM_REPRISE}=${UUID}`), url);
  // La page de vente est servie sur tiquiz.fr en public ET sur le domaine
  // de l'app quand on relit un chantier avec la clé d'aperçu : une
  // adresse absolue serait juste dans un cas et fausse dans l'autre.
  assert.ok(!url.includes("http"), url);
});

test("sans jeton, l'inscription reste l'inscription nue", () => {
  assert.equal(urlInscriptionReprise(null), "/signup");
  assert.equal(urlInscriptionReprise("pas-un-uuid"), "/signup");
});

test("la connexion vise le domaine de l'APP, et ramène au tableau de bord avec le jeton", () => {
  const url = urlConnexionReprise("https://quiz.tipote.com", UUID);
  assert.ok(url.startsWith("https://quiz.tipote.com/login?redirect="), url);
  // Le tableau de bord n'existe pas sur le domaine de vente : y renvoyer
  // après la connexion mènerait nulle part.
  const apres = decodeURIComponent(url.split("redirect=")[1]);
  assert.equal(apres, `/dashboard?${PARAM_REPRISE}=${UUID}`);
});

// ── La redirection de la connexion, qui vient de l'extérieur ────────

test("le `?redirect=` n'accepte qu'un chemin interne", () => {
  assert.equal(redirectionSure("/dashboard?x=1"), "/dashboard?x=1");
  assert.equal(redirectionSure(null), "/dashboard");
  assert.equal(redirectionSure(""), "/dashboard");
  assert.equal(redirectionSure("https://ailleurs.example"), "/dashboard");
  // LE CAS QU'ON RATE TOUJOURS : `//ailleurs.example` est une adresse
  // ABSOLUE pour le navigateur, et elle commence bien par `/`. Sans cette
  // ligne, une fausse page de connexion se sert juste après le mot de
  // passe. Vérifié en rejouant la version d'avant (`|| "/dashboard"`
  // seul) : ce cas passait.
  assert.equal(redirectionSure("//ailleurs.example"), "/dashboard");
  assert.equal(redirectionSure("/\\ailleurs.example"), "/dashboard");
});

// ── UN SEUL TRANSFERT, appelé par les deux chemins ──────────────────

test("l'inscription rattache le quiz, APRÈS la création du compte", () => {
  const src = lire("app/api/auth/signup/route.ts");
  assert.ok(src.includes("lireJetonReprise(body?.sessionEmbed)"), "le jeton est validé, pas cru");
  assert.ok(src.includes("rattacherQuizAnonyme"), "le rattachement est branché");

  const creation = src.indexOf("generateLink");
  const rattachement = src.indexOf("rattacherQuizAnonyme");
  assert.ok(creation > 0 && rattachement > creation,
    "le rattachement passe APRÈS la création : un transfert qui échoue ne doit pas priver quelqu'un de son inscription");
});

test("le formulaire transmet le jeton au serveur", () => {
  const src = lire("components/auth/SignupForm.tsx");
  assert.ok(src.includes("sessionEmbed: jetonQuiz"), "sinon le serveur n'a rien à rattacher");
});

test("la route de réclamation et l'inscription partagent LE MÊME transfert", () => {
  const claim = lire("app/api/embed/quiz/claim/route.ts");
  assert.ok(claim.includes("rattacherQuizAnonyme"), "la route appelle le module");
  // Deux endroits qui transféreraient chacun de leur côté finiraient par
  // se contredire : c'est le défaut sorti six fois dans ce dépôt, et ici
  // la contradiction se compte en quiz perdus.
  assert.ok(!/\.update\(\{\s*user_id:\s*userId/.test(claim),
    "la route ne refait plus le transfert à la main");
});

test("le transfert pose le propriétaire AVANT de marquer la session", () => {
  const src = lire("lib/embed/rattacherQuiz.ts");
  const transfert = src.indexOf('.update({ user_id: args.userId');
  const marquage = src.indexOf("marquerSessionReclamee({ sessionId: args.sessionId");
  assert.ok(transfert > 0 && marquage > transfert,
    "marquer en premier laisserait une session réclamée dont le quiz n'a pas de propriétaire, donc un quiz que plus aucun appel ne rattrape");
});

test("le module qui décide est PUR : il n'importe pas supabaseAdmin", () => {
  const src = lire("lib/embed/reprise.ts");
  const code = src.split("\n").filter((l) => !l.trimStart().startsWith("//") && !l.trimStart().startsWith("*")).join("\n");
  assert.ok(!code.includes("supabaseAdmin"),
    "un module qui importe le client d'administration est un module qu'aucun test ne peut charger");
});

// ── La démo de la page de vente ─────────────────────────────────────

test("l'iframe de la démo est SUR NOTRE DOMAINE, et sa sortie est notre inscription", () => {
  const html = lire("content/sales/tiquiz-v2.html");
  const src = html.match(/<iframe src="([^"]*embed\/preview[^"]*)"/)?.[1];
  assert.ok(src, "la démo est toujours là");
  // Un iframe TIERS n'a pas le droit d'écrire dans le stockage dès que
  // les cookies tiers sont bloqués : mesuré, SecurityError.
  assert.ok(src!.startsWith("/embed/preview"), `adresse relative attendue, reçu : ${src}`);

  const checkout = html.match(/data-checkout="([^"]*)"/)?.[1];
  assert.equal(checkout, "/signup",
    "un tunnel Systeme.io ne transmet pas la query : le jeton y mourait");
  assert.ok(!/data-checkout="[^"]*tipote\.fr/.test(html), "plus aucune sortie vers un tunnel Systeme.io");
});

test("le pont colle le jeton sur l'adresse, et son repli n'est plus Systeme.io", () => {
  const src = lire("public/embed/bridge.js");
  // `bridge.js` est servi TEL QUEL à des pages tierces : il ne peut pas
  // importer le module, donc il réécrit le nom du paramètre. C'est la
  // seule exception, et elle est nommée ici pour que le prochain passage
  // ne la prenne pas pour un oubli.
  assert.ok(src.includes(`"${PARAM_REPRISE}="`) || src.includes(`"${PARAM_REPRISE}=" +`),
    "le pont colle bien le paramètre attendu");
  assert.ok(!src.includes("www.tipote.fr/tiquiz"), "le repli ne renvoie plus chez Systeme.io");
  assert.ok(src.includes("tiquiz.fr/signup"), "le repli est notre inscription");
});

test("le tableau de bord lit le paramètre depuis le module, pas en dur", () => {
  const src = lire("components/dashboard/EmbedAutoClaim.tsx");
  assert.ok(src.includes("PARAM_REPRISE"), "sinon deux endroits nomment la même chose");
  assert.ok(!src.includes('= "tq_session"'), "le nom n'est plus réécrit ici");
});

// ── LE QUIZ DE LA DÉMO EST ÉCRIT AUSSI BIEN QUE CELUI DE L'APP ──────

test("la démo et l'app écrivent avec le MÊME budget de sortie", () => {
  const embed = lire("app/api/embed/quiz/generate/route.ts");
  const app = lire("app/api/quiz/generate/route.ts");
  // Il valait 6000 ici et 8000 là bas, alors que l'embed laisse demander
  // jusqu'à 10 questions et 5 profils : un quiz qui touchait le plafond
  // revenait TRONQUÉ, donc `JSON.parse` échouait, donc le visiteur lisait
  // "JSON IA invalide" sur l'écran qui doit lui donner envie.
  for (const [nom, src] of [["l'embed", embed], ["l'app", app]] as const) {
    assert.ok(src.includes("max_tokens: QUIZ_GENERATION_MAX_TOKENS"),
      `${nom} doit lire le budget partagé, jamais un nombre écrit à la main`);
  }
  assert.ok(!/max_tokens:\s*\d/.test(embed), "aucun budget en dur côté embed");
});

test("une sortie tronquée DIT quoi faire, elle n'accuse pas le format", () => {
  // ON MESURE LE CODE, PAS LES COMMENTAIRES. Le premier jet de ce test
  // cherchait "JSON.parse" dans le fichier ENTIER, et tombait sur ma
  // propre explication écrite juste au dessus du contrôle : il sortait
  // rouge sur un fichier parfaitement correct. Un contrôle qui ne
  // distingue pas ce qu'il est censé distinguer est pire qu'un contrôle
  // absent, et c'est la cinquième fois de la semaine.
  const src = sansCommentaires(lire("app/api/embed/quiz/generate/route.ts"));
  const troncature = src.indexOf('json?.stop_reason === "max_tokens"');
  const parse = src.indexOf("JSON.parse");
  assert.ok(troncature > 0, "le cas tronqué est traité");
  assert.ok(troncature < parse,
    "et AVANT la lecture du JSON : après, on ne voit plus qu'un format invalide");
});

test("la démo utilise le prompt de l'app, pas un prompt au rabais", () => {
  const src = lire("app/api/embed/quiz/generate/route.ts");
  assert.ok(src.includes("buildQuizGenerationPrompt"),
    "deux qualités d'écriture pour deux écrans du même produit finissent par se voir");
});
