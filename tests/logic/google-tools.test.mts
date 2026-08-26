// tests/logic/google-tools.test.mts
//
// LES OUTILS GOOGLE : LÀ OÙ ILS SE CHARGENT, ET SURTOUT PAS AILLEURS.
//
// Béné, 26 août 2026 : "tu peux ajouter ça pour que je puisse suivre les
// performances sur les outils Google ?"
//
// Ce que ces tests protègent, et aucun de ces trois défauts ne se serait
// vu à l'écran :
//
// 1. LA PAGE QUI COMPTE NE PASSE PAS PAR LE LAYOUT. `tiquiz.fr` est
//    servi par un route handler qui renvoie le HTML capturé. Poser la
//    balise dans `app/layout.tsx` seulement, le réflexe évident, ne
//    l'aurait JAMAIS mise sur la page de vente. Search Console aurait
//    répondu "balise introuvable" sur une page où on croit l'avoir mise.
// 2. LE DOMAINE D'UNE CRÉATRICE N'EST PAS LE NÔTRE. Le jeton de
//    propriété servi sur `example.com` permettrait de revendiquer CE
//    domaine dans notre Search Console, donc d'y voir les données de
//    recherche de quelqu'un d'autre.
// 3. L'AUDIENCE DES QUIZ N'EST PAS LA NÔTRE. `/q`, `/s` et surtout
//    `/embed` (un iframe servi par notre domaine mais affiché sur le
//    site de la cliente) mélangeraient son trafic à elle avec le nôtre,
//    et rendraient illisibles les chiffres de Béné.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  baliseVerificationGoogle,
  chargerAnalytics,
  GA_ATTEND_CONSENTEMENT,
  GA_MEASUREMENT_ID,
  GOOGLE_SITE_VERIFICATION,
  hoteNormalise,
  scriptAnalyticsGoogle,
  servirVerification,
} from "@/lib/analytics/google";
import { isOwnHost } from "@/lib/customDomains";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

// ── 1. Les identifiants, écrits une seule fois ──

test("l'identifiant de mesure et le jeton ont la bonne forme", () => {
  assert.match(GA_MEASUREMENT_ID, /^G-[A-Z0-9]{6,}$/);
  assert.ok(GOOGLE_SITE_VERIFICATION.length >= 20, "jeton trop court pour etre valide");
  // Ils sont écrits UNE fois : deux endroits qui portent le même
  // identifiant finissent par en porter deux différents, et la moitié
  // des pages cesse d'être mesurée sans que rien ne le dise.
  assert.ok(baliseVerificationGoogle().includes(GOOGLE_SITE_VERIFICATION));
  assert.ok(scriptAnalyticsGoogle().includes(GA_MEASUREMENT_ID));
});

test("les deux balises sont bien formées", () => {
  assert.match(baliseVerificationGoogle(), /^<meta name="google-site-verification" content="[^"]+">$/);
  const script = scriptAnalyticsGoogle();
  assert.match(script, /googletagmanager\.com\/gtag\/js\?id=G-/);
  assert.match(script, /gtag\('config', 'G-/);
  // Un `</script>` manquant avalerait tout le reste de la page.
  assert.equal((script.match(/<script/g) ?? []).length, 2);
  assert.equal((script.match(/<\/script>/g) ?? []).length, 2);
});

// ── 2. Le domaine d'une créatrice ne reçoit RIEN ──

test("rien n'est servi sur le domaine d'une créatrice", () => {
  assert.equal(isOwnHost("example.com"), false, "la fixture n'est plus un domaine tiers");
  assert.equal(servirVerification(false), false, "le jeton fuiterait sur son domaine");
  for (const p of ["/", "/commande/mensuel", "/q/mon-quiz"]) {
    assert.equal(chargerAnalytics({ estNotreHote: false, pathname: p }), false, p);
  }
});

test("nos domaines, eux, sont bien reconnus", () => {
  for (const h of ["tiquiz.fr", "www.tiquiz.fr", "quiz.tipote.com"]) {
    assert.equal(isOwnHost(h), true, h);
  }
  assert.equal(hoteNormalise("Tiquiz.FR:443"), "tiquiz.fr");
  assert.equal(hoteNormalise(null), "");
});

// ── 3. L'audience des quiz de nos clientes reste la leur ──

test("la mesure ne se charge PAS sur les quiz publics ni dans un iframe", () => {
  for (const p of ["/q/mon-quiz", "/s/mon-quiz", "/embed/abc", "/q", "/embed"]) {
    assert.equal(
      chargerAnalytics({ estNotreHote: true, pathname: p }),
      false,
      `${p} : le trafic d'une cliente entrerait dans les chiffres de Béné`,
    );
  }
});

test("elle se charge sur NOS pages", () => {
  for (const p of ["/", "/commande/mensuel", "/signup", "/quizzes", "/questions"]) {
    assert.equal(chargerAnalytics({ estNotreHote: true, pathname: p }), true, p);
  }
  // Un chemin qui COMMENCE par les mêmes lettres n'est pas un quiz.
  assert.equal(chargerAnalytics({ estNotreHote: true, pathname: "/questions" }), true);
  assert.equal(chargerAnalytics({ estNotreHote: true, pathname: "/support" }), true);
});

test("le jeton de propriété, lui, ne dépend PAS du chemin", () => {
  // Google vient le lire à la racine du domaine qu'il vérifie. Le gater
  // sur un chemin ferait échouer la vérification sans qu'on comprenne
  // pourquoi. Ce n'est pas un oubli, c'est la différence entre une
  // balise inerte et une mesure qui dépose des cookies.
  assert.equal(servirVerification(true), true);
});

// ── 4. La page de vente porte les DEUX, sinon rien de tout ça ne sert ──

test("la page de vente pose le jeton, alors qu'elle ignore le layout", () => {
  const src = lire("lib/sales/servePage.ts");
  assert.match(src, /baliseVerificationGoogle\(\)/, "tiquiz.fr n'aurait aucune balise de propriété");
  assert.match(src, /opts\.analytics \? scriptAnalyticsGoogle\(\) : ""/);
});

test("mesurer et indexer sont deux décisions SÉPARÉES", () => {
  const src = lire("lib/sales/servePage.ts");
  // Déduire l'une de l'autre marcherait aujourd'hui (les deux valent
  // `true` sur le domaine public) et casserait au premier cas où on veut
  // mesurer sans indexer, ou l'inverse.
  assert.match(src, /analytics: boolean;/);
  assert.doesNotMatch(src, /analytics = opts\.indexable|analytics: opts\.indexable/);
  const route = lire("app/apercu/vente/[slug]/route.ts");
  assert.match(route, /analytics: publique/, "l'aperçu derrière la clé compterait nos propres relectures");
});

// ── 5. Le layout ne décide pas seul, et il ne triche pas ──

test("le layout gate le jeton sur l'hôte, et délègue la mesure au client", () => {
  const src = lire("app/layout.tsx");
  assert.match(src, /servirVerification\(notreHote\)/);
  assert.match(src, /<GoogleAnalytics estNotreHote=\{notreHote\}/);
  // Le middleware ne pose AUCUN en-tête de chemin : un repli côté
  // serveur chargerait la mesure sur tous les quiz publics.
  assert.doesNotMatch(src, /x-pathname|x-invoke-path/);
  assert.doesNotMatch(lire("middleware.ts"), /x-pathname/);
});

test("le composant de mesure lit le chemin du NAVIGATEUR", () => {
  const src = lire("components/analytics/GoogleAnalytics.tsx");
  assert.match(src, /"use client"/);
  assert.match(src, /usePathname\(\)/);
  assert.match(src, /chargerAnalytics\(/);
});

// ── 6. Le consentement : ce qui est fait, et ce qui ne l'est pas ──

test("l'interrupteur de consentement existe et il est nommé", () => {
  // Il n'y a AUCUN bandeau cookies dans cette app aujourd'hui, et la
  // mesure Google dépose des cookies. Ce test ne prétend pas que c'est
  // conforme : il garantit qu'il n'y a qu'UN endroit à changer le jour
  // où le bandeau existe, au lieu d'une condition recopiée partout.
  assert.equal(typeof GA_ATTEND_CONSENTEMENT, "boolean");
  const src = lire("lib/analytics/google.ts");
  assert.match(src, /GA_ATTEND_CONSENTEMENT/);
  assert.match(src, /consentementDonne/);
});
