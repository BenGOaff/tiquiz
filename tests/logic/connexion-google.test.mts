// tests/logic/connexion-google.test.mts
//
// LA CONNEXION GOOGLE NE DOIT RIEN FAIRE PERDRE.
//
// Béné, 2 septembre 2026 : "sans rien casser ni perdre de ce qui
// existe, je ne veux pas de mauvaise surprise."
//
// La mauvaise surprise avait un nom : `signInWithOAuth` crée le compte
// DANS Supabase, sans passer par `/api/auth/signup`. Les trois effets de
// bord d'une inscription y vivaient, et les trois auraient sauté EN
// SILENCE : l'affiliée jamais rattachée (donc jamais payée), aucun
// contact chez Systeme.io (donc aucune campagne), et le quiz de la démo
// resté orphelin. Ce filet les tient.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { CANONICAL_APP_URL } from "@/lib/authLinks";
import {
  COOKIE_REPRISE,
  REPRISE_MAX_AGE,
  ligneCookieReprise,
  ligneCookieRepriseEffacee,
  tagPlanPourAccueil,
  urlRetourGoogle,
} from "@/lib/auth/google";
import { jetonDansRedirection } from "@/lib/embed/reprise";

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

// ── L'ADRESSE DE RETOUR ─────────────────────────────────────────────

test("on revient sur l'origine d'où l'on est parti, quand elle est à nous", () => {
  // Partir de tiquiz.fr et revenir sur quiz.tipote.com sont DEUX SITES :
  // le cookie posé avant de partir serait perdu, et le quiz avec.
  assert.equal(urlRetourGoogle("https://tiquiz.fr"), "https://tiquiz.fr/auth/callback");
  assert.equal(urlRetourGoogle("https://quiz.tipote.com"), "https://quiz.tipote.com/auth/callback");
});

test("une origine qui n'est pas à nous retombe sur le domaine canonique", () => {
  // Un `??` protège du MANQUANT, jamais du FAUX : ces valeurs sont
  // présentes et inutilisables.
  for (const faux of ["http://localhost:3000", "https://ailleurs.example", "", null, undefined, "pas une url"]) {
    assert.equal(urlRetourGoogle(faux), `${CANONICAL_APP_URL}/auth/callback`, String(faux));
  }
});

// ── LE COOKIE QUI PORTE LE QUIZ PENDANT L'ALLER-RETOUR ──────────────

test("le cookie est en SameSite=Lax, et il expire vite", () => {
  const l = ligneCookieReprise(UUID, true);
  assert.ok(l.startsWith(`${COOKIE_REPRISE}=${UUID}`), l);
  // MESURÉ dans Chromium sur le trajet exact d'un aller-retour OAuth :
  //   au retour de premier niveau : tq_reprise=abc123
  //   sur une requête tierce      : (aucun)
  // Lax est donc à la fois ce qui le ramène et ce qui le protège.
  assert.ok(l.includes("samesite=lax"), l);
  assert.ok(l.includes(`max-age=${REPRISE_MAX_AGE}`), l);
  assert.ok(REPRISE_MAX_AGE <= 60 * 60, "le temps d'un aller-retour, pas davantage");
});

test("Secure seulement en https : sinon le navigateur jette le cookie en silence", () => {
  assert.ok(ligneCookieReprise(UUID, true).includes("secure"));
  assert.ok(!ligneCookieReprise(UUID, false).includes("secure"));
});

test("le cookie s'efface une fois le quiz rattaché", () => {
  const l = ligneCookieRepriseEffacee(true);
  assert.ok(l.includes("max-age=0"), l);
  assert.ok(l.startsWith(`${COOKIE_REPRISE}=`), l);
});

// ── LE GARDE-FOU QUI COMPTE LE PLUS ─────────────────────────────────

test("on ne pose JAMAIS le tag gratuit sur un compte qui paie", () => {
  // Le marqueur d'accueil n'existait pas avant ce chantier : un compte
  // DÉJÀ inscrit qui se connecte par Google passe donc ici une fois.
  // Reposer `tiquiz-free` sur une abonnée la sortirait du seul segment
  // qui compte pour les relances, et ça ne se verrait sur aucun écran.
  assert.equal(tagPlanPourAccueil("free"), "free");
  assert.equal(tagPlanPourAccueil(null), "free");
  assert.equal(tagPlanPourAccueil(""), "free");
  for (const paye of ["monthly", "yearly", "monthly_plus", "yearly_plus", "lifetime", "beta", "MONTHLY"]) {
    assert.equal(tagPlanPourAccueil(paye), null, `${paye} ne doit rien reposer`);
  }
});

// ── LE JETON CACHÉ DANS LE `?redirect=` ─────────────────────────────

test("le jeton se lit dans le redirect de la connexion", () => {
  assert.equal(jetonDansRedirection(`/dashboard?tq_session=${UUID}`), UUID);
  assert.equal(jetonDansRedirection("/dashboard"), null);
  assert.equal(jetonDansRedirection(null), null);
});

test("une redirection externe ne peut pas glisser un jeton", () => {
  // `redirectionSure` a déjà écarté la destination : rien à en tirer.
  assert.equal(jetonDansRedirection(`https://ailleurs.example/?tq_session=${UUID}`), null);
  assert.equal(jetonDansRedirection(`//ailleurs.example/?tq_session=${UUID}`), null);
});

// ── LA ROUTE D'ACCUEIL FAIT LES TROIS CHOSES ────────────────────────

test("l'accueil rattache l'affiliée, crée le contact, et récupère le quiz", () => {
  const src = lire("app/api/auth/accueil/route.ts");
  for (const [quoi, jeton] of [
    ["l'affiliée à vie", "rattacherInscrit"],
    ["le contact chez Systeme.io", "poserTagPlan"],
    ["le quiz de la démo", "rattacherQuizAnonyme"],
  ] as const) {
    assert.ok(src.includes(jeton), `${quoi} : sans ça, ça saute EN SILENCE`);
  }
});

test("l'accueil ne tourne qu'une fois, et le marqueur est posé AVANT les appels", () => {
  const src = sansCommentaires(lire("app/api/auth/accueil/route.ts"));
  assert.ok(src.includes("if (meta[MARQUEUR])"), "un compte déjà accueilli ressort tout de suite");
  const marqueur = src.indexOf("updateUserById");
  const rattachement = src.indexOf("rattacherInscrit({");
  assert.ok(marqueur > 0 && rattachement > marqueur,
    "deux onglets feraient sinon deux accueils, sur un chemin qui décide QUI est payé");
});

test("l'accueil lit le plan avant de poser quoi que ce soit", () => {
  const src = sansCommentaires(lire("app/api/auth/accueil/route.ts"));
  const lecture = src.indexOf("tagPlanPourAccueil");
  const pose = src.indexOf("poserTagPlan(");
  assert.ok(lecture > 0 && pose > lecture, "le plan décide, la pose suit");
});

// ── ET SURTOUT : RIEN DE CE QUI EXISTE NE BOUGE ─────────────────────

test("l'accueil n'est branché QUE sur le retour d'un fournisseur", () => {
  const src = sansCommentaires(lire("app/auth/callback/CallbackClient.tsx"));
  // ON COMPTE LES APPELS, PAS LA DÉCLARATION. Le premier jet cherchait
  // `accueillir()` et tombait sur `async function accueillir()` : il
  // comptait deux appels là où il n'y en a qu'un, et sortait rouge sur
  // un fichier correct. Sixième fois qu'un contrôle de ce dépôt mesure
  // autre chose que ce qu'il croit.
  assert.equal((src.match(/await accueillir\(\)/g) ?? []).length, 1,
    "un seul appel : les chemins email existants ne bougent pas d'une ligne");

  const otp = src.indexOf("verifyOtp");
  const appel = src.indexOf("await accueillir()");
  assert.ok(otp > 0 && appel > otp,
    "l'appel vit APRÈS la branche des liens email, pas dedans");
});

test("l'accueil ne bloque jamais l'ouverture de session", () => {
  const src = lire("app/auth/callback/CallbackClient.tsx");
  assert.ok(/async function accueillir[\s\S]{0,400}try \{[\s\S]{0,200}catch/.test(src),
    "un accueil qui échoue ne doit pas laisser quelqu'un devant un écran de connexion");
});

test("l'inscription par formulaire garde SES effets de bord", () => {
  // Ils vivent toujours dans /api/auth/signup : l'accueil s'ajoute pour
  // Google, il ne remplace rien.
  const src = lire("app/api/auth/signup/route.ts");
  for (const jeton of ["rattacherInscrit", "poserTagPlan", "rattacherQuizAnonyme", "sendSignupEmail"]) {
    assert.ok(src.includes(jeton), `${jeton} doit rester dans l'inscription par formulaire`);
  }
});

// ── LE BOUTON ───────────────────────────────────────────────────────

test("le bouton pose le cookie AVANT de partir chez Google", () => {
  const src = sansCommentaires(lire("components/auth/BoutonGoogle.tsx"));
  const cookie = src.indexOf("ligneCookieReprise(");
  const depart = src.indexOf("signInWithOAuth");
  assert.ok(cookie > 0 && depart > cookie,
    "au retour on n'a plus que ce que le navigateur a bien voulu garder");
});

test("le bouton ne fabrique pas son adresse de retour à la main", () => {
  const src = sansCommentaires(lire("components/auth/BoutonGoogle.tsx"));
  assert.ok(src.includes("urlRetourGoogle(window.location.origin)"), "une seule règle, testée");
  assert.ok(!/redirectTo:\s*`?https?:/.test(src), "aucune adresse écrite en dur");
});

test("un échec Google produit quelque chose à l'écran", () => {
  const src = lire("components/auth/BoutonGoogle.tsx");
  assert.ok(src.includes('t("googleErreur")'),
    "un echec silencieux envoie chercher au mauvais endroit");
});

test("le bouton est monté sur la connexion ET sur l'inscription", () => {
  for (const p of ["components/auth/LoginForm.tsx", "components/auth/SignupForm.tsx"]) {
    assert.ok(lire(p).includes("<BoutonGoogle"), `${p} porte le bouton`);
  }
});
