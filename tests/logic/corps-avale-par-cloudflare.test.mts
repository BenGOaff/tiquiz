// tests/logic/corps-avale-par-cloudflare.test.mts
//
// UN 5xx SUR UN CHEMIN LU PAR UN NAVIGATEUR PERD SA RAISON.
//
// Béné, 31 août 2026 : "le test d'inscription gratuite avec un ref ne
// fonctionne pas : /api/auth/signup 502. On attire du trafic et les
// gens peuvent même pas s'inscrire, ça inspire vachement confiance."
//
// MESURÉ deux fois sur la production, pas déduit : le formulaire de la
// newsletter le matin, l'inscription l'après-midi. Un 502 revient avec
// `error code: 502` en text/plain et `server: cloudflare`, alors qu'un
// 400 revient avec notre JSON intact. **Cloudflare remplace le corps.**
// Et les SIX domaines sont derrière Cloudflare (relevé le même jour).
//
// Conséquence exacte, sur l'inscription : le compte ÉTAIT créé (le
// contact `tiquiz-free` apparaissait dans Systeme.io) et l'écran
// annonçait "Erreur lors de la création du compte", parce que
// `res.json()` échouait sur du text/plain et que `reason` valait
// `undefined`. La phrase juste existait déjà et n'arrivait jamais. Un
// deuxième essai répondait "adresse déjà inscrite".
//
// **RÈGLE : un refus MÉTIER sur un chemin lu par un navigateur répond
// 200 avec `ok: false` et sa raison.** Les 4xx passent intacts et
// gardent leur sens. Un 5xx ne se justifie que là où un FOURNISSEUR
// doit réessayer, c'est à dire dans un webhook, jamais devant un
// formulaire : un navigateur ne réessaie rien tout seul.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

/** Les chemins qu'un visiteur ou un client atteint depuis son navigateur. */
const ECRANS = [
  "app/api/auth/signup/route.ts",
  "app/api/newsletter/route.ts",
  "app/api/commande/session/route.ts",
  "app/api/commande/paypal/route.ts",
  "app/api/depart/route.ts",

  // -- LES SIX CHEMINS IA, AJOUTES LE 3 SEPTEMBRE 2026 -----------------
  //
  // L'AGENTS.md les notait "a reprendre" depuis le 1er septembre : ils
  // repondaient encore en 500 / 502 / 503, donc leur raison n'atteignait
  // jamais la creatrice. Et le defaut etait pire que le statut :
  // `/api/quiz/generate` renvoyait `{ error: "Claude API key missing on
  // the server." }` et le client AFFICHAIT ce champ tel quel, donc une
  // creatrice espagnole lisait une phrase technique en anglais.
  "app/api/quiz/generate/route.ts",
  "app/api/quiz/[quizId]/rebalance/route.ts",
  "app/api/quiz/[quizId]/rewrite/route.ts",
  "app/api/quiz/gender-variants/route.ts",
  "app/api/quiz/idea-chat/route.ts",
  "app/api/embed/quiz/generate/route.ts",
];

for (const rel of ECRANS) {
  test(`${rel} : aucun 5xx, la raison doit arriver`, () => {
    const src = readFileSync(rel, "utf8");
    const code = src
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    assert.doesNotMatch(
      code,
      /status:\s*50\d/,
      "Cloudflare remplace le corps : la raison n'arriverait pas a l'ecran",
    );
  });
}

test("les refus de VALIDATION gardent leur 4xx", () => {
  // Ceux-la passent intacts (verifie en production), et un 4xx dit la
  // bonne chose a un client qui a mal rempli. Les retirer ferait perdre
  // l'information dans l'autre sens.
  const signup = readFileSync("app/api/auth/signup/route.ts", "utf8");
  assert.match(signup, /status: 400/);
  assert.match(signup, /status: 409/, "'adresse deja inscrite' est un conflit, pas une panne");
});

test("l'inscription dit que le compte EXISTE quand seul l'email a echoue", () => {
  // C'est le pire enchainement possible : annoncer un echec de creation
  // sur un compte cree, puis repondre "adresse deja inscrite" au
  // deuxieme essai.
  const fr = JSON.parse(readFileSync("messages/fr.json", "utf8")) as {
    signupPage: Record<string, string>;
  };
  assert.match(fr.signupPage.errEmailFailed, /compte est cré/i);
  const form = readFileSync("components/auth/SignupForm.tsx", "utf8");
  assert.match(form, /email_failed: t\("errEmailFailed"\)/);
});

test("les WEBHOOKS gardent leurs 5xx : eux, le reessai les sert", () => {
  // Un fournisseur de paiement REESSAIE sur un 5xx, et c'est
  // exactement ce qu'on veut quand une vente encaissee n'a pas ouvert
  // son acces. La regle ci-dessus ne les concerne pas.
  const src = readFileSync("app/api/commande/webhook/route.ts", "utf8");
  assert.match(src, /status: 502/);
});

// ── LA RAISON DOIT ETRE DISABLE DANS LES 7 LANGUES (3 septembre 2026)
//
// Le serveur rend une RAISON, jamais une phrase : l'interface existe en
// 7 langues, et une phrase ecrite dans le code y arrive forcement dans
// une seule. C'est la faute des replis "Resultat 4" du 1er septembre,
// et celle de `setRebalanceError(data?.error ?? "Une erreur est
// survenue.")`, une phrase FRANCAISE ecrite en dur dans le code.
const RAISONS = [
  "busy",
  "too_long",
  "refused",
  "unreachable",
  "empty",
  "unreadable",
  "rate_limited",
  "not_configured",
  "generic",
];

for (const loc of ["fr", "en", "es", "it", "ar", "pt", "pt-BR"]) {
  test(`${loc} : les 9 raisons d'echec IA sont traduites`, () => {
    const d = JSON.parse(readFileSync(`messages/${loc}.json`, "utf8")) as {
      erreursIa?: Record<string, string>;
    };
    const bloc = d.erreursIa ?? {};
    const manquantes = RAISONS.filter((r) => !bloc[r] || !bloc[r].trim());
    assert.deepEqual(manquantes, [], `${loc} : des raisons n'ont pas de phrase`);
  });
}

// Une raison INCONNUE ne doit jamais s'afficher telle quelle : un ecran
// reste sur une ancienne version montrerait "not_configured" en toutes
// lettres a une creatrice.
test("le hook retombe sur generic, il n'affiche jamais la cle", () => {
  const src = readFileSync("hooks/useEchecIa.ts", "utf8");
  assert.match(src, /"generic"/, "aucun repli sur generic");
  assert.match(src, /CONNUES\.has/, "la raison n'est pas verifiee avant d'etre traduite");
});

// LES CLIENTS NE RECOPIENT PLUS `error` A L'ECRAN. C'est ce qui affichait
// "Claude API key missing on the server." et "Une erreur est survenue."
test("aucun ecran de generation n'affiche le champ error brut", () => {
  const ECRANS_IA = [
    "components/quiz/QuizFormClient.tsx",
    "components/quiz/SurveyFormClient.tsx",
    "components/quiz/QuizDetailClient.tsx",
    "components/quiz/SurveyDetailClient.tsx",
  ];
  const fautifs: string[] = [];
  for (const f of ECRANS_IA) {
    const code = readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    // `data.error` / `json.error` passe DIRECTEMENT dans un toast ou un
    // setter d'erreur : c'est la forme qu'on ferme.
    if (/(toast\.error|setRebalanceError)\(\s*(data|json|err)\?\.error/.test(code)) {
      fautifs.push(f);
    }
  }
  assert.deepEqual(fautifs, [], "un ecran recopie encore le message technique du serveur");
});
