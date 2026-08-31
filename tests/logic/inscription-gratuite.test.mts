// tests/logic/inscription-gratuite.test.mts
//
// Béné, 25 août 2026 : "inscrit gratos chez nous = contact créé chez
// systeme io et abonné à la campagne tiquiz free !"
//
// -- CE QUI MANQUAIT, ET POURQUOI ÇA NE SE VOYAIT PAS -----------------
//
// Les emails restent chez Systeme.io. Notre inscription ne creait aucun
// contact chez eux : la personne n'entrait dans AUCUNE sequence, et rien
// ne le signalait. Le probleme grossissait a chaque inscription, c'est a
// dire a mesure qu'on sort de Systeme.io.
//
// Le chemin d'ACHAT le faisait deja depuis le 22 aout. L'inscription
// gratuite avait ete oubliee : la moitie d'une decision, encore.
//
// -- LE TEST LIT LA SOURCE ------------------------------------------
//
// `poserTagPlan` importe `supabaseAdmin`, qui exige des variables
// d'environnement au chargement : aucun test ne peut importer la route.
// On lit donc le fichier, comme pour les regles du coach.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { readSioTag } from "../../lib/sio/tags.ts";

const lire = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const SIGNUP = lire("../../app/api/auth/signup/route.ts");
const TAG = lire("../../lib/sio/appliquerTag.ts");

test("le palier gratuit a bien une etiquette Systeme.io", () => {
  // Verifie dans son compte le 25 aout 2026 : le tag `tiquiz-free`
  // existe (id 1962973), et la campagne "Tiquiz free" aussi.
  assert.equal(readSioTag("free"), "tiquiz-free");
});

test("l'inscription gratuite cree le contact chez Systeme.io", () => {
  assert.ok(
    /poserTagPlan\(email, "free"/.test(SIGNUP),
    "sans cet appel, un inscrit gratuit sort de TOUTES les sequences email, en silence",
  );
});

test("le contact est cree APRES le compte, jamais avant", () => {
  // Un appel a Systeme.io qui echoue ne doit pas priver quelqu'un de son
  // inscription. Meme regle que le rattachement affilie.
  const posComptePret = SIGNUP.indexOf("actionLink = buildAuthCallbackUrl");
  const posTag = SIGNUP.indexOf('poserTagPlan(email, "free"');
  assert.ok(posComptePret > 0 && posTag > posComptePret);
});

test("l'appel ne peut pas faire echouer l'inscription", () => {
  // `poserTagPlan` ne jette JAMAIS : c'est ce qui permet de l'appeler
  // sans try/catch sans risquer un 500, et donc de ne jamais priver
  // quelqu'un de son inscription parce que Systeme.io a hoquete.
  //
  // Le 31 aout, la pose est passee d'un booleen a une RAISON (le
  // formulaire de la newsletter repondait 502 sans dire pourquoi).
  // Ce test verifiait la FORME du `return false;` : il a rougi sur une
  // correction qui ne touchait pas a l'invariant. Il porte maintenant
  // sur l'invariant lui-meme, qui est "l'exception est attrapee et la
  // fonction rend quelque chose".
  assert.match(TAG, /Promise<boolean>/, "poserTagPlan doit rester un booleen pour ses appelants");
  assert.match(
    TAG,
    /catch \(e\) \{[\s\S]*?return \{ ok: false, raison: "exception" \};/,
    "l'exception doit etre attrapee et rendue comme une raison, jamais propagee",
  );
  // Et aucun chemin ne relance : un `throw` ici ferait un 500 sur une
  // inscription qui a pourtant reussi.
  const corps = TAG.slice(TAG.indexOf("export async function poserTagParNomDetaille"));
  assert.ok(!/\bthrow\b/.test(corps), "poserTagParNomDetaille ne doit jamais relancer");
});

test("la fonction dit ce qu'elle fait : un PLAN, pas un achat", () => {
  // Elle s'appelait `poserTagAchat`, ce qui laissait croire qu'elle ne
  // concernait qu'une vente, alors que `free` est un plan comme un autre.
  // Un nom qui ment est la raison pour laquelle personne n'a pense a
  // l'appeler ici.
  assert.ok(TAG.includes("export async function poserTagPlan("));
  // La mention historique dans le commentaire est VOULUE : elle explique
  // pourquoi le nom a change. Ce qui est interdit, c'est un APPEL ou un
  // export qui porterait encore l'ancien nom.
  assert.ok(!/export .*poserTagAchat|poserTagAchat\(/.test(TAG), "l'ancien nom est encore appelable");
});

test("le tag SEUL n'abonne a aucune campagne, et le code le DIT", () => {
  // Verifie dans son compte le 25 aout 2026 : AUCUNE automatisation
  // n'ecoute `tiquiz-free`. L'API de Systeme.io n'a pas de point d'entree
  // pour abonner un contact a une campagne : c'est une automatisation
  // "tag ajoute" qui le fait, et elle se cree dans leur tableau de bord.
  //
  // Sans cette phrase dans le code, le prochain qui passe croit que
  // l'abonnement est fait, et personne ne voit que rien ne part.
  assert.ok(
    /automatisation/i.test(SIGNUP) && /campagne/i.test(SIGNUP),
    "le code doit dire que le tag ne suffit pas a abonner a la campagne",
  );
});
