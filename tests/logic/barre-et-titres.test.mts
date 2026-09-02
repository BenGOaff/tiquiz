// tests/logic/barre-et-titres.test.mts
//
// LA BARRE DU HAUT, LES TITRES EN DOUBLE, ET LE N+1 DE MES PROJETS.
//
// Béné, 2 septembre 2026, quatre remarques d'un coup :
//   - "sur Tiquiz il y a trop de trucs dans la sidebar : aide + contact
//      c'est au même endroit = un seul item" ;
//   - "réactiver le tour guidé : mets le dans la head bar à côté de
//      'mon espace'" ;
//   - "y'a trop de titres sur une même page c'est tout en doublon : à
//      quoi ça sert ?? Il faut uniformiser ça" ;
//   - "la page 'mes projets' est très longue à charger : il n'y aurait
//      pas un souci ?"
//
// Les trois premières régressent en silence : personne ne remarque un
// titre qui revient, ni une entrée de menu qui repousse. La quatrième
// coûte des secondes à chaque ouverture.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const lire = (p: string) => fs.readFileSync(path.join(RACINE, p), "utf8");

/** Les cinq écrans qui portaient le bandeau bleu copié-collé. */
const ECRANS_A_BANDEAU = [
  "app/quizzes/QuizzesClient.tsx",
  "app/stats/StatsShell.tsx",
  "app/leads/LeadsShell.tsx",
  "app/popquizzes/PopquizzesClient.tsx",
  "components/settings/SettingsClient.tsx",
];

// ---------------------------------------------------------------------
// LE TITRE S'ÉCRIT UNE FOIS, DANS LA BARRE.
// ---------------------------------------------------------------------

test("aucun écran ne recopie le bandeau à la main", () => {
  // C'est la copie qui a répandu le doublon sur cinq pages d'un coup :
  // un gabarit recopié cinq fois, ce sont cinq occasions de diverger.
  for (const f of ECRANS_A_BANDEAU) {
    assert.ok(
      !lire(f).includes("gradient-primary rounded-xl"),
      `${f} redessine le bandeau au lieu d'appeler PageBanner`,
    );
    assert.ok(lire(f).includes("<PageBanner"), `${f} n'utilise pas PageBanner`);
  }
});

test("le bandeau ne PEUT plus porter de titre", () => {
  // La seule protection qui survit au prochain qui touchera au fichier :
  // le composant n'expose aucune prop de titre, donc on ne peut pas en
  // remettre un sans le décider explicitement.
  const src = lire("components/ui/page-banner.tsx");
  // Sur le CODE, pas sur le fichier : les commentaires du composant
  // racontent le doublon qu'il supprime, donc ils écrivent `<h2>`.
  // Quatrième fois dans ce chantier qu'un contrôle mesure autre chose
  // que ce qu'il croit.
  const code = src.slice(src.indexOf("type PageBannerProps"));
  assert.ok(!/\btitle\s*[:?]/.test(code), "PageBanner accepte un titre");
  assert.ok(!/<h[1-6]/.test(code), "PageBanner rend un titre");
  assert.ok(/INTERDIT/.test(src), "la règle n'est pas écrite à côté du composant");
});

test("le titre de la barre reste, lui", () => {
  // On a retiré le doublon, pas le titre : c'est la barre qui dit où on
  // est quand on a fait défiler la page.
  const shell = lire("components/AppShell.tsx");
  assert.ok(/<h1[^>]*>\{headerTitle\}<\/h1>/.test(shell), "la barre ne porte plus le titre de la page");
  // Le titre est passé par l'écran lui même, ou par la page serveur qui
  // le monte (le cas des Popquiz).
  const PAGE_QUI_TITRE: Record<string, string> = {
    "app/popquizzes/PopquizzesClient.tsx": "app/popquizzes/page.tsx",
    "components/settings/SettingsClient.tsx": "app/settings/SettingsShell.tsx",
  };
  for (const f of ECRANS_A_BANDEAU) {
    const ou = PAGE_QUI_TITRE[f] ?? f;
    assert.ok(/headerTitle=/.test(lire(ou)), `${ou} ne donne plus de titre à la barre`);
  }
});

test("la page d'aide ne porte son titre que hors session", () => {
  // Connectée, la barre le porte. Déconnectée, il n'y a pas de barre :
  // sans titre, le formulaire arrive sans dire ce qu'il est.
  const s = lire("app/support/page.tsx");
  assert.ok(s.includes("enveloppe(true)"), "la page publique a perdu son titre");
  assert.ok(s.includes("enveloppe(false)"), "la page connectée réécrit le titre de la barre");
});

// ---------------------------------------------------------------------
// LA SIDEBAR : UNE SEULE ENTRÉE D'AIDE, ET LE TOUR EN HAUT.
// ---------------------------------------------------------------------

test("aide et contact ne font plus qu'une entrée", () => {
  const side = lire("components/AppSidebar.tsx");
  const versSupport = (side.match(/href="\/support"/g) ?? []).length;
  assert.equal(versSupport, 1, "il y a plusieurs entrées vers l'aide");
  assert.ok(!side.includes("supportForm"), "la deuxième entrée d'aide est encore là");
});

test("le tour guidé se relance depuis la barre du haut, toujours", () => {
  const side = lire("components/AppSidebar.tsx");
  assert.ok(!side.includes("RestartTourItem"), "le tour est encore au pied de la sidebar");

  const shell = lire("components/AppShell.tsx");
  assert.ok(shell.includes("<RestartTourButton />"), "le tour n'est pas dans la barre du haut");
  // À CÔTÉ de "Mon espace", c'est à dire du sélecteur de projet : c'est
  // la place qu'elle a demandée, et elle se retient parce qu'elle ne
  // bouge pas.
  assert.ok(
    shell.indexOf("<ProjectSwitcher />") < shell.indexOf("<RestartTourButton />"),
    "le bouton du tour n'est pas posé à côté du sélecteur de projet",
  );

  const bouton = lire("components/tutorial/RestartTourButton.tsx");
  // Il ne dépend plus de la carte d'invitation : un raccourci qui
  // apparaît et disparaît selon un état qu'on ne contrôle pas ne se
  // mémorise jamais.
  assert.ok(!bouton.includes("nudgeDismissed"), "le bouton du tour se cache encore tout seul");
  assert.ok(/aria-label=/.test(bouton), "le bouton n'a pas de nom accessible");
});

// ---------------------------------------------------------------------
// MES PROJETS : PLUS D'APPEL PAR PROJET.
// ---------------------------------------------------------------------

test("la liste des projets ne demande plus chaque projet un par un", () => {
  const s = lire("app/quizzes/QuizzesClient.tsx");
  // C'était un aller-retour par projet, EN SÉRIE, chacun ramenant le
  // quiz entier pour n'en garder qu'un nombre de leads.
  assert.ok(
    !/await fetch\(`\/api\/quiz\/\$\{row\.id\}`\)/.test(s),
    "la boucle qui demande chaque quiz est revenue",
  );
  assert.ok(s.includes("Number(row.leads_count ?? 0)"), "le compteur ne vient pas de la liste");
});

test("et la liste, elle, agrège vraiment les leads en un seul appel", () => {
  // Sans ça, le correctif ci dessus afficherait zéro lead partout : le
  // test doit tenir les DEUX moitiés, pas seulement celle du client.
  const route = lire("app/api/quiz/route.ts");
  assert.ok(route.includes("quiz_leads_summary"), "la route de liste n'agrège plus les leads");
  assert.ok(route.includes("q.leads_count ="), "la route ne pose plus leads_count sur chaque ligne");
  const migrations = fs
    .readdirSync(path.join(RACINE, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .some((f) => lire(`supabase/migrations/${f}`).includes("FUNCTION quiz_leads_summary"));
  assert.ok(migrations, "la fonction SQL quiz_leads_summary n'existe nulle part");
});
