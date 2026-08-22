// tests/logic/auth-links.test.mts
//
// Véronique, 2 août 2026 : "je demande un nouveau mot de passe, je clique
// sur le bouton, et j'arrive sur : localhost n'autorise pas la connexion.
// Bref, je tourne en rond. PS : je n'ai pas de proxy et pas de pare-feu."
//
// Elle avait raison : le lien lui demandait vraiment d'ouvrir un serveur
// sur SA machine. Ce test interdit qu'un lien d'email reparte un jour
// vers une adresse locale, quelle que soit la configuration.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  resolveAppUrl,
  resolvePublicUrl,
  buildAuthCallbackUrl,
  CANONICAL_APP_URL,
} from "../../lib/authLinks.ts";

describe("Véronique : jamais de localhost dans un email", () => {
  test("LE BUG : une variable d'env sur localhost est ignorée", () => {
    assert.equal(
      resolveAppUrl("http://localhost:3000", "https://quiz.tipote.com"),
      "https://quiz.tipote.com",
    );
  });

  test("les autres adresses locales aussi", () => {
    for (const local of ["http://127.0.0.1:3000", "http://[::1]:3000", "http://mac.local"]) {
      assert.equal(resolveAppUrl(local, null), CANONICAL_APP_URL, local);
    }
  });

  test("variable absente : on prend le domaine par lequel la demande arrive", () => {
    assert.equal(resolveAppUrl(null, "https://quiz.tipote.com"), "https://quiz.tipote.com");
    assert.equal(resolveAppUrl("", "https://quiz.tipote.com"), "https://quiz.tipote.com");
    assert.equal(resolveAppUrl("   ", "https://quiz.tipote.com"), "https://quiz.tipote.com");
  });

  // ── DRAME BÉNÉ, 22 AOÛT ──
  //
  // "Je suis là : https://quiz.tipote.com/auth/forgot-password. Je reçois
  // le bon email mais il me renvoie sur Tipote putain !!"
  //
  // `NEXT_PUBLIC_APP_URL` vaut `https://app.tipote.com` sur le serveur
  // Tiquiz. Ces tests manquaient : ils ne couvraient QUE les adresses
  // locales. Une adresse valide qui designe UNE AUTRE APP traversait
  // tout, et plus personne ne pouvait se connecter.

  test("une variable qui nomme une AUTRE app est ignoree", () => {
    // Elle est parfaitement valide, joignable, en https. Elle est juste
    // fausse : on valide l'IDENTITE, pas seulement la FORME.
    assert.equal(
      resolveAppUrl("https://app.tipote.com", "https://quiz.tipote.com"),
      "https://quiz.tipote.com",
    );
    // Meme sans origine de requete (un cron, par exemple) : on retombe
    // sur le domaine canonique, jamais sur l'autre app.
    assert.equal(resolveAppUrl("https://app.tipote.com", null), CANONICAL_APP_URL);
    for (const etranger of [
      "https://quizing.tipote.com",
      "https://n8n.tipote.com",
      "https://www.tipote.fr",
      "https://example.com",
    ]) {
      assert.equal(resolveAppUrl(etranger, null), CANONICAL_APP_URL, etranger);
    }
  });

  test("la VRAIE valeur du serveur, le 22 aout : http:https://quiz.tipote.com", () => {
    // Copiee telle quelle du .env de production. `new URL()` la lit comme
    // protocole "http:" + hostname "https" : une adresse qui ne mene
    // nulle part. L'ancien code ne refusait que les adresses LOCALES,
    // donc cette bouillie passait et partait dans les emails.
    const cassee = "http:https://quiz.tipote.com";
    assert.equal(resolveAppUrl(cassee, "https://quiz.tipote.com"), "https://quiz.tipote.com");
    assert.equal(resolveAppUrl(cassee, null), CANONICAL_APP_URL);
  });

  test("le domaine ou elle navigue gagne sur la variable", () => {
    // La seule source qui ne peut pas se tromper.
    assert.equal(
      resolveAppUrl("https://quiz.tipote.com", "https://tiquiz.fr"),
      "https://tiquiz.fr",
    );
  });

  test("nos domaines de vente sont acceptes, pas ceux d'une creatrice", () => {
    assert.equal(resolveAppUrl(null, "https://tiquiz.fr"), "https://tiquiz.fr");
    assert.equal(resolveAppUrl(null, "https://www.tiquiz.fr"), "https://www.tiquiz.fr");
    // Le domaine personnalise d'une creatrice ne sert PAS nos pages de
    // compte : un lien de connexion qui y pointerait serait un cul-de-sac.
    assert.equal(resolveAppUrl(null, "https://lequizdemartine.fr"), CANONICAL_APP_URL);
  });

  test("rien d'exploitable : le domaine canonique, jamais une impasse", () => {
    assert.equal(resolveAppUrl(null, null), CANONICAL_APP_URL);
    assert.equal(resolveAppUrl("pas une url", "non plus"), CANONICAL_APP_URL);
    assert.equal(resolveAppUrl("javascript:alert(1)", null), CANONICAL_APP_URL);
  });

  test("une configuration correcte est respectée", () => {
    assert.equal(resolveAppUrl("https://quiz.tipote.com", null), "https://quiz.tipote.com");
    // La barre finale ne doit pas produire un double slash dans le lien.
    assert.equal(resolveAppUrl("https://quiz.tipote.com/", null), "https://quiz.tipote.com");
  });
});

describe("Le lien de l'email pointe sur NOTRE page", () => {
  test("il porte le jeton et le type, sur notre domaine", () => {
    const url = buildAuthCallbackUrl("https://quiz.tipote.com", {
      tokenHash: "abc123",
      type: "recovery",
    });
    assert.ok(url.startsWith("https://quiz.tipote.com/auth/callback?"), url);
    const q = new URL(url).searchParams;
    assert.equal(q.get("token_hash"), "abc123");
    assert.equal(q.get("type"), "recovery");
  });

  test("aucun rebond par Supabase : c'est ce rebond qui menait sur localhost", () => {
    const url = buildAuthCallbackUrl("https://quiz.tipote.com", {
      tokenHash: "abc",
      type: "recovery",
    });
    assert.ok(!url.includes("supabase"), "le lien ne doit pas passer par Supabase");
    assert.ok(!url.includes("redirect_to"), "plus de redirection a autoriser");
  });

  test("un jeton exotique reste lisible une fois encodé", () => {
    const url = buildAuthCallbackUrl("https://quiz.tipote.com", {
      tokenHash: "a+b/c=d&e",
      type: "recovery",
    });
    assert.equal(new URL(url).searchParams.get("token_hash"), "a+b/c=d&e");
  });

  test("une barre finale ne double pas le slash", () => {
    assert.ok(
      buildAuthCallbackUrl("https://quiz.tipote.com/", { tokenHash: "x", type: "magiclink" })
        .startsWith("https://quiz.tipote.com/auth/callback?"),
    );
  });
});

describe("Tout ce qui sort de l'app est protégé, pas seulement les emails", () => {
  test("la variable de prod pointait VRAIMENT sur localhost", () => {
    // Le lien reçu par Véronique portait
    // redirect_to=http://localhost:3000/auth/callback : ce n'était pas un
    // repli de Supabase, c'est nous qui l'avions écrit. Tout ce qui se
    // construit sur cette variable partait donc faux : retours de
    // paiement, emails de notification, liens revendeur, sitemap.
    assert.equal(
      resolvePublicUrl("http://localhost:3000", "https://tiquiz.com"),
      "https://tiquiz.com",
    );
  });

  test("le domaine de repli dépend du contexte", () => {
    assert.equal(resolvePublicUrl(null, "https://tiquiz.com"), "https://tiquiz.com");
    assert.equal(resolvePublicUrl(null, "https://app.tipote.com"), "https://app.tipote.com");
  });

  test("une origine de requête valable passe avant le repli", () => {
    assert.equal(
      resolvePublicUrl("http://localhost:3000", "https://tiquiz.com", "https://quiz.tipote.com"),
      "https://quiz.tipote.com",
    );
  });
});
