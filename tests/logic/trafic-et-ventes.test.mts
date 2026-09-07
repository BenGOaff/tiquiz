// tests/logic/trafic-et-ventes.test.mts
//
// TRAFIC ET VENTES SUR LE MÊME ÉCRAN (Béné, 4 septembre 2026, point 3).
//
// Ce que ce filet tient, et pourquoi chaque cas existe :
//
//   - un robot n'est pas du trafic (sinon le taux s'effondre sans
//     qu'aucune vente ait manqué) ;
//   - un taux sur un dénominateur maigre n'est pas un taux (leçon du
//     funnel de Jocelyne, 4 août) ;
//   - "je n'ai pas pu regarder" n'est pas "il n'y a rien" (23 août) ;
//   - les décisions vivent dans le module PUR, jamais dans le composant
//     ni dans la route (1er août).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  construireEntonnoir,
  estUnBonDeCommande,
  MIN_VUES_POUR_UN_TAUX,
  pagesLesPlusVues,
  sourcesDuTrafic,
  vuesParJour,
  type LigneTrafic,
} from "../../lib/trafic/entonnoir.ts";
import {
  cheminPourStats,
  estUnRobot,
  sourceDeLaVue,
  vueASignaler,
} from "../../lib/trafic/vueASignaler.ts";

const lire = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/** Le fichier sans ses commentaires : un test qui mesure une présence ne doit pas tomber sur sa propre explication. */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
}

// ---------------------------------------------------------------- vues

test("on ne compte que le site public, jamais l'app ni une API ni un fichier", () => {
  const base = { accept: "text/html", userAgent: "Mozilla/5.0 (Macintosh) Safari/605" };
  assert.equal(vueASignaler({ ...base, host: "tiquiz.fr", pathname: "/" }), true);
  assert.equal(vueASignaler({ ...base, host: "www.tiquiz.fr", pathname: "/tarifs" }), true);
  // L'app derrière connexion n'est pas du trafic de vente.
  assert.equal(vueASignaler({ ...base, host: "quiz.tipote.com", pathname: "/" }), false);
  assert.equal(vueASignaler({ ...base, host: "tiquiz.fr", pathname: "/api/quiz" }), false);
  assert.equal(vueASignaler({ ...base, host: "tiquiz.fr", pathname: "/logo.webp" }), false);
  // Une requête qui ne demande pas une page (un fetch, une image).
  assert.equal(
    vueASignaler({ ...base, accept: "application/json", host: "tiquiz.fr", pathname: "/" }),
    false,
  );
});

test("un robot n'est pas du trafic, et un agent vide non plus", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "curl/8.4.0",
    "facebookexternalhit/1.1",
    "python-requests/2.31",
    "",
    null,
  ]) {
    assert.equal(estUnRobot(ua), true, `${ua} devrait être écarté`);
  }
  assert.equal(
    estUnRobot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1"),
    false,
  );
});

test("le chemin est borné, mais jamais jeté", () => {
  assert.equal(cheminPourStats("/Tarifs/"), "/tarifs");
  assert.equal(cheminPourStats(""), "/");
  assert.equal(cheminPourStats("/blog/mon-article"), "/blog/mon-article");
  // Un chemin trop profond est TRONQUÉ et marqué, pas perdu.
  const profond = cheminPourStats("/a/b/c/d/e/f");
  assert.equal(profond, "/a/b/c/…");
  assert.ok(profond.length <= 120);
});

test("la source : le canal explicite gagne, l'interne ne se confond pas avec le direct", () => {
  const nous = "tiquiz.fr";
  assert.equal(
    sourceDeLaVue({ referrer: "https://www.google.fr/", canal: "youtube", utmSource: null, host: nous }),
    "youtube",
  );
  assert.equal(
    sourceDeLaVue({ referrer: null, canal: null, utmSource: "newsletter", host: nous }),
    "newsletter",
  );
  assert.equal(sourceDeLaVue({ referrer: null, canal: null, utmSource: null, host: nous }), "direct");
  // Le sous-domaine ne fait pas une autre source.
  assert.equal(
    sourceDeLaVue({ referrer: "https://www.google.com/search?q=x", canal: null, utmSource: null, host: nous }),
    "google",
  );
  // Une navigation interne n'a amené personne.
  assert.equal(
    sourceDeLaVue({ referrer: "https://tiquiz.fr/blog", canal: null, utmSource: null, host: nous }),
    "interne",
  );
  // Un referrer illisible ne se devine pas.
  assert.equal(
    sourceDeLaVue({ referrer: "pas une url", canal: null, utmSource: null, host: nous }),
    "direct",
  );
});

// ----------------------------------------------------------- entonnoir

const vue = (chemin: string, vues: number, source = "google", jour = "2026-09-07"): LigneTrafic => ({
  jour,
  chemin,
  source,
  vues,
});

test("la page de retour n'est PAS une entrée dans le tunnel", () => {
  assert.equal(estUnBonDeCommande("/commande/mensuel"), true);
  assert.equal(estUnBonDeCommande("/commande/annuel-plus"), true);
  // Elle n'est atteinte qu'APRÈS avoir payé : la compter ferait un taux
  // de passage artificiellement haut, et elle compte déjà comme vente.
  assert.equal(estUnBonDeCommande("/commande/mensuel/retour"), false);
  assert.equal(estUnBonDeCommande("/tarifs"), false);
});

test("les trois marches se comptent sur les mêmes lignes", () => {
  const e = construireEntonnoir({
    lignes: [vue("/", 800), vue("/tarifs", 150), vue("/commande/mensuel", 50)],
    ventes: 5,
  });
  assert.equal(e.vues, 1000);
  assert.equal(e.vuesCommande, 50);
  assert.equal(e.ventes, 5);
  assert.equal(e.tauxVersCommande, 5);
  assert.equal(e.tauxCommandeVersVente, 10);
  assert.equal(e.tauxGlobal, 0.5);
});

test("un taux sur un dénominateur maigre n'est PAS affiché, mais les comptes le sont", () => {
  const e = construireEntonnoir({ lignes: [vue("/", 12), vue("/commande/mensuel", 3)], ventes: 1 });
  // Les comptes sont exacts dès la première vue : les cacher serait
  // cacher la seule chose qu'on sait.
  assert.equal(e.vues, 15);
  assert.equal(e.vuesCommande, 3);
  assert.equal(e.ventes, 1);
  // Les taux, eux, ne veulent rien dire à ce niveau.
  assert.equal(e.tauxVersCommande, null);
  assert.equal(e.tauxGlobal, null);
  assert.equal(e.tauxCommandeVersVente, null);
  assert.ok(MIN_VUES_POUR_UN_TAUX >= 100, "le seuil ne descend pas sans raison écrite");
});

test("aucun taux ne divise par zéro", () => {
  const e = construireEntonnoir({ lignes: [], ventes: 0 });
  assert.equal(e.vues, 0);
  assert.equal(e.tauxVersCommande, null);
  assert.equal(e.tauxCommandeVersVente, null);
  assert.equal(e.tauxGlobal, null);
});

test("les navigations internes sortent du classement des sources", () => {
  const lignes = [vue("/", 100, "interne"), vue("/", 40, "google"), vue("/", 10, "pinterest")];
  const s = sourcesDuTrafic(lignes);
  assert.deepEqual(
    s.map((x) => x.cle),
    ["google", "pinterest"],
  );
  // Les pages, elles, comptent TOUTES les vues : une lecture interne
  // reste une lecture.
  assert.equal(pagesLesPlusVues(lignes)[0].vues, 150);
});

test("les jours sortent dans l'ordre, additionnés", () => {
  const j = vuesParJour([
    vue("/", 3, "google", "2026-09-08"),
    vue("/tarifs", 2, "google", "2026-09-07"),
    vue("/", 5, "direct", "2026-09-07"),
  ]);
  assert.deepEqual(j, [
    { jour: "2026-09-07", vues: 7 },
    { jour: "2026-09-08", vues: 3 },
  ]);
});

// -------------------------------------------------- où vivent les règles

test("le middleware ne décide rien : il appelle le module pur", () => {
  const mw = sansCommentaires(lire("middleware.ts"));
  assert.ok(mw.includes("vueASignaler("), "le middleware doit appeler la décision, pas la refaire");
  assert.ok(mw.includes("cheminPourStats("), "le chemin vient du module pur");
  assert.ok(mw.includes("sourceDeLaVue("), "la source vient du module pur");
  // waitUntil : une statistique ne fait JAMAIS attendre une page de vente.
  const i = mw.indexOf("signalerVue(");
  assert.ok(i > 0, "le middleware envoie la vue");
  assert.ok(
    mw.slice(Math.max(0, i - 400), i).includes("waitUntil"),
    "l'envoi doit être dans un waitUntil, hors du chemin de la réponse",
  );
});

test("l'écrivain en base ne porte aucune décision", () => {
  const src = sansCommentaires(lire("lib/trafic/compterVue.ts"));
  // Il importe supabaseAdmin, donc aucun test ne peut le charger : c'est
  // exactement pour ça qu'il ne doit rien décider.
  assert.ok(src.includes("supabaseAdmin"), "c'est bien lui qui écrit");
  assert.ok(!src.includes("robot"), "le filtre robot vit dans le module pur");
  assert.ok(!src.includes("referrer"), "la source vit dans le module pur");
  // L'incrément se fait DANS Postgres : lire puis réécrire ici perdrait
  // une vue sur deux quand deux visiteurs arrivent en même temps.
  assert.ok(src.includes("compter_vue_trafic"), "l'incrément passe par la fonction SQL");
});

test("la migration pose bien l'incrément atomique et ferme la porte", () => {
  const sql = lire("supabase/migrations/20260907_trafic_pages_publiques.sql");
  assert.ok(sql.includes("create table if not exists public.trafic_jour"));
  assert.ok(/on conflict[\s\S]*do update set vues/.test(sql), "l'incrément est atomique");
  assert.ok(sql.includes("enable row level security"), "aucune lecture publique");
  assert.ok(/revoke all on function[\s\S]*from anon/.test(sql), "anon ne peut pas gonfler le compteur");
  assert.ok(sql.includes("notify pgrst"), "PostgREST doit recharger son schéma");
});

test("l'écran distingue 'je n'ai pas pu regarder' de 'il n'y a rien'", () => {
  const src = lire("components/pilotage/TraficPilotage.tsx");
  assert.ok(
    src.includes("Le comptage du trafic n&apos;a pas pu être lu."),
    "une lecture qui échoue doit le DIRE",
  );
  assert.ok(
    src.includes("Ce n&apos;est pas un site sans visite"),
    "et dire que ce n'est pas zéro visite",
  );
  // On compte des vues, pas des visiteurs : nommer autrement serait
  // mentir sur ce qu'on mesure.
  assert.ok(src.includes("vues de page"), "l'écran dit ce qu'il compte");
  assert.ok(!/\bvisiteurs uniques\b/.test(src), "on ne promet pas ce qu'on ne mesure pas");
});

test("le trafic et les ventes viennent du MÊME appel", () => {
  const route = sansCommentaires(lire("app/api/admin/pilotage/route.ts"));
  assert.ok(route.includes("lireTrafic("), "le trafic est dans la réponse du pilotage");
  assert.ok(
    /lireTrafic\(\{\s*debutJour: periode\.debut, finJour: periode\.fin \}\)/.test(route),
    "il doit porter la MÊME période que les ventes, sinon l'écran divise des pommes par des poires",
  );
  const ecran = lire("components/pilotage/TraficPilotage.tsx");
  assert.ok(
    !ecran.includes("buildSales") && !ecran.includes("/api/admin/ventes"),
    "les ventes ne se recomptent pas ici : elles viennent de resumePeriode",
  );
});

// ---------------------------------------------------------------------
// LE COMPTEUR DE L'ATELIER (Béné, 7 septembre 2026)
//
// "il me faut aussi le compteur de l'Atelier."
//
// En le branchant, un défaut introduit la veille est apparu :
// `resumePeriode` reçoit `[...sales, ...atelier.sales]`, donc
// `resume.ventes` additionne les DEUX sites. L'entonnoir divisait les
// vues de tiquiz.fr par les ventes de Tiquiz ET de l'Atelier : le
// numérateur et le dénominateur ne parlaient pas de la même population,
// et rien ne le disait. C'est exactement le chiffre qui fait dépenser.
// ---------------------------------------------------------------------

test("chaque site divise ses vues par SES ventes, jamais par le total", () => {
  const ecran = lire("components/pilotage/TraficPilotage.tsx");

  // L'entonnoir de Tiquiz prend `ventesParSite.tiquiz`, celui de
  // l'Atelier `ventesParSite.atelier`. Un seul des deux qui lirait
  // `resume.ventes` gonflerait son taux en silence.
  assert.match(
    ecran,
    /ventesParSite\?\.tiquiz/,
    "l'entonnoir de Tiquiz doit prendre les ventes de Tiquiz, pas le total des deux sites",
  );
  assert.match(
    ecran,
    /ventesParSite\?\.atelier/,
    "l'entonnoir de l'Atelier doit prendre les ventes de l'Atelier",
  );

  // Et l'écran DIT de quel site parle chaque bloc : deux entonnoirs sans
  // titre se lisent comme un seul chiffre coupé en deux.
  assert.ok(ecran.includes("tiquiz.fr"), "le bloc Tiquiz doit nommer son site");
  assert.ok(ecran.includes("atelierduquiz.fr"), "le bloc Atelier doit nommer son site");
});

test("il n'y a qu'UNE définition de 'une vente comptée dans cette période'", () => {
  const resume = lire("lib/pilotage/resumePeriode.ts");
  assert.match(
    resume,
    /export function compterVentes\(/,
    "compterVentes doit être exporté : l'écran Trafic en a besoin par site",
  );
  // `resumePeriode` DOIT l'appeler lui aussi. Sinon il reste deux règles
  // de comptage, et c'est le défaut que ce dépôt paie en boucle.
  assert.match(
    resume,
    /ventes:\s*compterVentes\(/,
    "resumePeriode doit appeler compterVentes, sinon il y a deux règles de comptage",
  );

  const route = lire("app/api/admin/pilotage/route.ts");
  assert.match(route, /compterVentes\(sales, periode\)/, "les ventes Tiquiz passent par compterVentes");
  assert.match(
    route,
    /compterVentes\(atelier\.sales, periode\)/,
    "les ventes de l'Atelier passent par la MÊME fonction",
  );
});

test("le trafic de l'Atelier voyage dans le MÊME appel que ses ventes", () => {
  const atelier = lire("lib/admin/atelier.ts");
  // Une deuxième porte voudrait dire un deuxième secret, un deuxième
  // délai maximum et un deuxième `reachable` : le pilotage pourrait
  // alors montrer les ventes de l'Atelier sans son trafic, donc un taux
  // calculé sur un dénominateur absent.
  const portes = atelier.match(/\/api\/partner\//g) ?? [];
  assert.equal(portes.length, 1, "l'Atelier ne doit être appelé que par UNE porte partenaire");

  // Et la période est un PARAMÈTRE : deux périodes différentes sur un
  // écran qui les divise l'une par l'autre donneraient un taux faux.
  assert.match(
    atelier,
    /periode\?:\s*\{\s*debut/,
    "fetchAtelier doit recevoir la période, jamais la deviner",
  );
  assert.match(atelier, /q\.set\("debut"/, "la période doit partir dans l'appel");
});

test("un Atelier muet n'est jamais affiché comme un site sans visite", () => {
  const ecran = lire("components/pilotage/TraficPilotage.tsx");
  const bloc = ecran.slice(ecran.indexOf("function AtelierBloc"));
  assert.ok(bloc.length > 0, "le bloc de l'Atelier a disparu");

  // Les DEUX cas muets (pas de champ du tout, champ illisible) doivent
  // produire une phrase, jamais un zéro : "je n'ai pas pu regarder" et
  // "il n'y a rien" sont deux réponses différentes (règle du 23 août).
  assert.match(bloc, /!trafic \?/, "le cas 'champ absent' doit être traité à part");
  assert.match(bloc, /trafic\.lisible === false \?/, "le cas 'illisible' doit être traité à part");
  assert.ok(
    (bloc.match(/pas un site sans visite|pas encore lisible|pas pu être lu/g) ?? []).length >= 2,
    "les deux cas muets doivent DIRE qu'ils n'ont pas pu regarder",
  );
});
