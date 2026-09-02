import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { privacy } from "@/lib/legal/privacy";

/**
 * Google a REFUSE la validation du branding le 2 septembre 2026 :
 * "La page de vos règles de confidentialité à l'adresse
 *  https://tiquiz.fr/privacy ne contient pas suffisamment de contenu."
 *
 * Leur exigence (support.google.com/cloud/answer/13806988) est que la
 * politique divulgue COMMENT l'app accede aux donnees utilisateur Google,
 * les utilise, les stocke, les protege, les partage et les conserve, plus
 * la clause d'usage limite. Une section de cinq phrases ne suffit pas.
 *
 * Ce test empeche qu'on la raccourcisse sans le savoir : la prochaine
 * personne qui allege cette section fera rougir le filet avant que Google
 * ne refuse une deuxieme fois.
 */

const LANGUES = ["fr", "en", "es", "it", "ar"] as const;

function sectionGoogle(langue: string) {
  const page = privacy[langue];
  assert.ok(page, `la politique existe en ${langue}`);
  const s = page.sections.find((x) => x.h.startsWith("12."));
  assert.ok(s, `la section 12 existe en ${langue}`);
  return s!;
}

function texte(langue: string): string {
  return sectionGoogle(langue)
    .body.flatMap((b) => (Array.isArray(b) ? b : [b]))
    .join("\n");
}

describe("la politique dit ce que Google exige", () => {
  for (const langue of LANGUES) {
    test(`${langue} : la section Google couvre les six axes`, () => {
      const t = texte(langue);

      // Les trois donnees recues, nommees une par une. Ecrire moins serait
      // vague (donc refuse), ecrire plus serait faux : c'est exactement ce
      // que rend le scope "openid email profile", le seul demande.
      assert.match(t, /openid/, "les scopes demandes sont nommes");
      assert.match(t, /profile/, "le scope profile est nomme");

      // Ce a quoi on n'accede PAS. Google lit cette liste.
      for (const service of ["Gmail", "Drive", "YouTube"]) {
        assert.ok(t.includes(service), `${service} est nomme comme non accessible`);
      }

      // La revocation, avec l'adresse exacte.
      assert.match(t, /myaccount\.google\.com\/permissions/);

      // La clause d'usage limite, que Google attend mot pour mot.
      assert.match(t, /Limited Use/, "la clause d'usage limite est citee");

      // Et le VOLUME : c'est le reproche nomme par Google. Une section qui
      // retombe sous ce seuil est une section qui a reperdu un des axes.
      assert.ok(
        t.length > 1500,
        `la section ${langue} fait ${t.length} caracteres, c'est trop court pour couvrir les six axes`,
      );
    });
  }

  test("la section porte les six axes dans son titre ou son corps (fr)", () => {
    const t = texte("fr");
    for (const axe of ["accéd", "utilis", "stock", "protég", "partage", "conserv"]) {
      assert.ok(t.includes(axe), `l'axe "${axe}" est traite`);
    }
  });

  test("aucun tiret cadratin dans la politique", () => {
    for (const langue of LANGUES) {
      const p = privacy[langue];
      const tout = [p.title, p.lastUpdated, p.intro ?? "", ...p.sections.flatMap((s) => [s.h, ...s.body.flat()])].join(" ");
      assert.ok(!/[—–]/.test(tout), `${langue} ne porte aucun tiret long`);
    }
  });
});

describe("la politique reste assez detaillee pour Google", () => {
  // Google a refuse DEUX fois avec "ne contient pas suffisamment de contenu",
  // la seconde apres que la section Google eut ete etoffee : ce n'est donc
  // pas seulement la section 12 qu'ils jugent, c'est la page entiere. Les
  // articles 3 (collecte), 4 (utilisation), 7 (partage), 11 (securite) et
  // 13 (cookies) faisaient une a trois phrases ; ils detaillent maintenant.
  //
  // Le seuil fige le volume MESURE apres cet etoffement, moins une marge :
  // un article qu'on raccourcirait plus tard ferait rougir ce test avant
  // qu'un troisieme refus n'arrive.
  const PLANCHER: Record<string, number> = { fr: 1500, en: 1300, es: 1450, it: 1350, ar: 1100 };

  for (const langue of LANGUES) {
    test(`${langue} : la page entiere reste detaillee`, () => {
      const p = privacy[langue];
      const mots = [p.intro ?? "", ...p.sections.flatMap((s) => [s.h, ...s.body.flat()])]
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length;
      assert.ok(
        mots >= PLANCHER[langue],
        `${langue} : ${mots} mots, en dessous du plancher de ${PLANCHER[langue]}`,
      );
    });
  }

  test("les sous-traitants reels sont tous nommes (fr)", () => {
    const art7 = privacy.fr.sections.find((s) => s.h.startsWith("7."));
    const t = art7!.body.flatMap((b) => (Array.isArray(b) ? b : [b])).join(" ");
    // Resend et Cloudflare manquaient : on envoie de vrais emails par l'un et
    // tous les domaines passent par l'autre. Une liste incomplete est
    // exactement ce que Google appelle un partage mal divulgue.
    for (const nom of ["Supabase", "Hostinger", "Cloudflare", "Stripe", "PayPal", "Resend", "Anthropic", "Systeme.io"]) {
      assert.ok(t.includes(nom), `${nom} est nomme a l'article 7`);
    }
  });
});

describe("l'adresse de contact reste lisible sans JavaScript", () => {
  // Cloudflare remplace toute adresse email du HTML servi par
  // "[email protected]" plus un script. Mesure du 2 septembre sur la
  // production : 4 adresses sur 4 etaient masquees, y compris celle de
  // l'article Contact. Une politique sans adresse de contact lisible est
  // une politique incomplete pour tout lecteur qui n'execute pas le JS.
  const source = readFileSync("components/legal/LegalPageView.tsx", "utf8");

  test("les marqueurs Cloudflare enveloppent le contenu legal", () => {
    assert.match(source, /<!--email_off-->/, "le marqueur d'ouverture est pose");
    assert.match(source, /<!--email_on-->/, "le marqueur de fermeture est pose");
    assert.match(source, /<SansObfuscationEmail>/, "le composant enveloppe vraiment les sections");
  });

  test("la raison est ecrite a cote, sinon le prochain passage les retire", () => {
    assert.match(source, /Cloudflare/, "le commentaire nomme la cause");
    assert.match(source, /__cf_email__/, "il nomme ce que Cloudflare injecte");
  });
});
