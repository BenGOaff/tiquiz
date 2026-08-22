// tests/logic/auth-emails.test.mts
//
// UN EMAIL TIQUIZ DIT TIQUIZ.
//
// Béné, 22 août : "je demande un lien magique ou une réinitialisation de
// mdp sur Tiquiz et je reçois les trucs Tipote, c'est pas pro du tout."
//
// Elle recevait "Connexion Tipote", signé "Béné - Tipote", après avoir
// cliqué sur un bouton Tiquiz. Ce n'était pas notre email : c'était
// Supabase qui l'écrivait, avec le gabarit de son tableau de bord.
//
// Le mot de passe oublié avait été repris en email maison le 31 juillet,
// le lien magique était resté derrière. Une moitié corrigée, encore.
// Ces tests existent pour qu'aucune moitié ne reste derrière.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildMagicLinkContent } from "../../lib/email/magicLinkContent.ts";
import { buildPasswordResetContent } from "../../lib/email/passwordResetContent.ts";
import { renderTiquizEmail, tiquizFrom } from "../../lib/email/tiquizShell.ts";

const LIEN = "https://quiz.tipote.com/auth/callback?token_hash=abc123&type=magiclink";

/** Les 7 langues de l'interface. */
const LOCALES = ["fr", "en", "es", "it", "pt", "pt-BR", "ar"];

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

/** Le fichier SANS ses commentaires : ils PARLENT de signInWithOtp,
 *  c'est voulu, et une assertion qui les compte rougirait pour la
 *  mauvaise raison, donc finirait desactivee. */
function codeSeul(rel: string): string {
  return lire(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
}

// ── CE QUE LA CLIENTE LIT ──

test("l'email de connexion se presente comme Tiquiz, dans les 7 langues", () => {
  for (const loc of LOCALES) {
    const { subject, html } = buildMagicLinkContent(LIEN, loc);
    assert.ok(subject.includes("Tiquiz"), `${loc} : le sujet ne dit pas Tiquiz`);
    // "Connexion Tipote" etait le titre exact de l'email qu'elle a recu.
    assert.ok(!/Connexion Tipote/i.test(subject), `${loc} : le sujet dit encore Connexion Tipote`);
    assert.ok(html.includes("Tiquiz"), `${loc} : le corps ne dit pas Tiquiz`);
  }
});

test("le mot de passe oublie aussi, et c'est le meme cadre", () => {
  for (const loc of LOCALES) {
    const { subject, html } = buildPasswordResetContent(LIEN, loc);
    assert.ok(subject.includes("Tiquiz"), `${loc} : le sujet ne dit pas Tiquiz`);
    assert.ok(html.includes("Tiquiz"), `${loc} : le corps ne dit pas Tiquiz`);
  }
  // MEME cadre : c'est ce qui empeche les deux de rediverger. Le
  // bandeau, le bouton et le pied de page sortent de renderTiquizEmail.
  const a = buildMagicLinkContent(LIEN, "fr").html;
  const b = buildPasswordResetContent(LIEN, "fr").html;
  const cadre = (h: string) => h.slice(0, h.indexOf("font-size:22px"));
  assert.equal(cadre(a), cadre(b), "les deux emails n'ont plus le meme cadre");
});

test("l'expediteur affiche Tiquiz, jamais Tipote", () => {
  // C'est la ligne qu'elle lit AVANT d'ouvrir. "Bene - Tipote" sur un
  // email Tiquiz a l'air d'une erreur, au mieux.
  const from = tiquizFrom({ SUPPORT_FROM_EMAIL: "hello@tipote.com" });
  assert.ok(from.startsWith("Tiquiz <"), from);
  assert.ok(!/^Tipote|Béné - Tipote/.test(from), from);
  // L'ADRESSE reste le domaine verifie chez Resend : en changer sans
  // l'avoir verifie ferait tomber tous les emails en spam.
  assert.ok(from.includes("hello@tipote.com"), from);
});

test("le lien est repris en toutes lettres sous le bouton", () => {
  // Beaucoup de messageries d'entreprise reecrivent ou cassent les
  // boutons. Sans cette ligne, l'email devient un cul-de-sac.
  const { html, text } = buildMagicLinkContent(LIEN, "fr");
  assert.ok(html.split(LIEN).length - 1 >= 2, "le lien n'apparait qu'une fois");
  assert.ok(text.includes(LIEN), "la version texte n'a pas le lien");
});

test("une langue inconnue retombe sur le francais, jamais sur du vide", () => {
  assert.deepEqual(buildMagicLinkContent(LIEN, "kl"), buildMagicLinkContent(LIEN, "fr"));
  assert.deepEqual(buildMagicLinkContent(LIEN, null), buildMagicLinkContent(LIEN, "fr"));
  // Une variante regionale retombe sur sa racine.
  assert.equal(buildMagicLinkContent(LIEN, "fr-CA").subject, buildMagicLinkContent(LIEN, "fr").subject);
});

test("aucun tiret cadratin dans ce que la cliente lit", () => {
  for (const loc of LOCALES) {
    for (const build of [buildMagicLinkContent, buildPasswordResetContent]) {
      const { subject, text } = build(LIEN, loc);
      assert.ok(!/[—–]/.test(subject), `${loc} : tiret cadratin dans le sujet`);
      assert.ok(!/[—–]/.test(text), `${loc} : tiret cadratin dans le corps`);
    }
  }
});

test("le cadre ne se casse pas sur une entree vide", () => {
  const out = renderTiquizEmail("", {
    subject: "s",
    heading: "h",
    intro: "i",
    cta: "c",
    ignore: "g",
    linkFallback: "l",
    footer: "f",
  });
  assert.ok(out.html.includes("Tiquiz"));
  assert.ok(out.text.length > 0);
});

// ── PLUS AUCUN ENVOI CONFIÉ À SUPABASE ──

test("le bouton lien magique passe par NOTRE route", () => {
  // C'est LA correction. Avec `signInWithOtp`, c'est Supabase qui ecrit
  // l'email, et aucun code ne peut changer son gabarit.
  const src = codeSeul("components/auth/LoginForm.tsx");
  assert.ok(src.includes("/api/auth/magic-link"), "le formulaire n'appelle plus notre route");
  assert.ok(
    !src.includes("signInWithOtp"),
    "signInWithOtp est revenu : l'email repartira au nom de Tipote",
  );
});

test("le renvoi de lien depuis la page de retour aussi", () => {
  // Deux boutons qui envoient deux emails differents, c'est exactement
  // la moitie de correction qu'on repete depuis trois semaines.
  const src = codeSeul("app/auth/callback/CallbackClient.tsx");
  assert.ok(src.includes("/api/auth/magic-link"), "le renvoi n'appelle pas notre route");
  assert.ok(!src.includes("signInWithOtp"), "signInWithOtp est revenu sur le renvoi");
});

test("la route ne dit jamais si une adresse a un compte", () => {
  const src = lire("app/api/auth/magic-link/route.ts");
  // Toutes les sorties sont `ok: true`. Une reponse differente ferait de
  // ce formulaire un outil pour savoir qui est client.
  const sorties = src.match(/NextResponse\.json\([^)]*\)/g) ?? [];
  assert.ok(sorties.length >= 3, "trop peu de sorties trouvees, le test ne verifie rien");
  for (const s of sorties) {
    assert.ok(s.includes("ok: true"), `une sortie revele quelque chose : ${s}`);
  }
});

test("la route envoie NOTRE lien, pas celui de Supabase", () => {
  // Le lien Supabase repasse par /auth/v1/verify puis redirige vers le
  // "Site URL" du projet : c'est ce qui envoyait Veronique sur localhost
  // (2 aout). Avec le hashed_token, /auth/callback consomme le jeton
  // lui-meme et rien ne peut s'interposer.
  const src = codeSeul("app/api/auth/magic-link/route.ts");
  assert.ok(src.includes("hashed_token"), "la route n'utilise plus le hashed_token");
  assert.ok(src.includes("buildAuthCallbackUrl"), "le lien n'est plus construit par nous");
  assert.ok(
    !src.includes("action_link"),
    "la route retombe sur le lien Supabase : il repasse par leur redirection",
  );
  assert.ok(src.includes("resolveAppUrl"), "le domaine du lien n'est plus valide");
});

test("un envoi rate se voit dans le journal", () => {
  // La personne attend devant sa boite. Un echec silencieux ferait
  // chercher au mauvais endroit pendant une heure.
  const src = lire("app/api/auth/magic-link/route.ts");
  const i = src.indexOf("sendMagicLinkEmail(");
  assert.ok(i > 0, "la route n'envoie plus rien");
  assert.ok(
    src.slice(i, i + 500).includes("console.error"),
    "un email non parti passe en silence",
  );
});
