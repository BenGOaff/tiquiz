// tests/logic/connexions-crm.test.mts
//
// LES LEADS D'UN QUIZ PARTENT VERS L'OUTIL CHOISI, SYSTEME.IO OU
// GOHIGHLEVEL, ET LA VENTE NE BOUGE PAS (14 septembre 2026).
//
// Bene : "aujourd'hui j'ai un gros client FR et US qui veut tester, du
// coup je dois connecter gohighlevel pour les automatisations des leads
// comme systemeio. [...] Moi je reste sur systeme io pour les ventes, on
// ne touche surtout pas a ca." Puis : "on doit lui laisser le choix de
// synchroniser ses leads avec l'outil de son choix comme Quizify [...]
// activer ou desactiver synchro + alerte mail si deconnecte + pages
// d'aide", "une agence et des sous comptes, la totale".
//
// CE QUE CE FICHIER TIENT, et les moities comptent ENSEMBLE :
//
//  1. la DECISION est pure (`decision.ts` n'importe ni base ni reseau) :
//     la connexion du quiz, sinon le defaut du projet, sinon Systeme.io ;
//     une PAUSE ne retombe sur rien ; un 401 est "deconnecte", un 5xx
//     est "temporaire", et l'alerte ne part qu'UNE fois ;
//  2. l'adaptateur GoHighLevel n'envoie JAMAIS `tags` dans l'upsert
//     (leur API ECRASE les tags existants) et les AJOUTE par
//     `/contacts/{id}/tags` ; l'en-tete `Version` est la ;
//  3. la route de capture ET la route de partage passent par
//     `resoudreDestination` puis `envoyerLead`, et ne portent plus leur
//     propre client Systeme.io ;
//  4. les ecrans et l'API acceptent `connexion_id` avec controle de
//     propriete, et le picker ecrit les DEUX colonnes ;
//  5. l'alerte "connexion coupee" existe en 7 langues, sans tiret
//     cadratin ni chevron ;
//  6. la migration porte tout ce que le code lit.
//
// Verifie en rejouant des versions fautives : elles rougissent.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  choisirDestination,
  classerEchecEnvoi,
  derniersCaracteres,
  doitAlerterDeconnexion,
  type ConnexionPourDecision,
} from "@/lib/integrations/decision";
import { fusionnerTags } from "@/lib/integrations/charge";
import { FOURNISSEURS, FOURNISSEURS_CRM, estFournisseurCrm, ficheFournisseur } from "@/lib/integrations/fournisseurs";
import { contenuAlerteConnexion } from "@/lib/integrations/alerteContenu";
import { PAGES_PUBLIQUES } from "@/lib/site/pagesPubliques";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const lire = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const source = (rel: string) => sansCommentaires(lire(rel));

const cx = (p: Partial<ConnexionPourDecision> & { id: string }): ConnexionPourDecision => ({
  fournisseur: "gohighlevel",
  actif: true,
  est_defaut: false,
  etat: "ok",
  alerte_deconnexion_le: null,
  ...p,
});

// ── 1. LE CATALOGUE ────────────────────────────────────────────────────

test("le catalogue : Systeme.io et GoHighLevel sont disponibles, les autres s'affichent sans bouton", () => {
  const ids = FOURNISSEURS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, "deux fiches pour le meme outil");
  assert.ok(ficheFournisseur("systemeio")?.disponible);
  assert.ok(ficheFournisseur("gohighlevel")?.disponible);
  for (const f of FOURNISSEURS) {
    if (f.disponible) {
      // Un outil disponible a une page d'aide, et elle EXISTE dans le
      // sitemap : Bene a demande "des pages d'aide comme Quizify".
      assert.ok(f.aide, `${f.nom} est disponible sans page d'aide`);
      assert.ok(
        PAGES_PUBLIQUES.some((p) => p.chemin === f.aide),
        `${f.nom} : sa page d'aide ${f.aide} n'est pas dans PAGES_PUBLIQUES`,
      );
    } else {
      assert.equal(f.aide, null, `${f.nom} annonce une page d'aide sans adaptateur`);
    }
  }
  // Systeme.io ne vit PAS dans `connexions_crm` : sa mecanique (cles,
  // ventes, tags d'achat) ne bouge pas d'une ligne.
  assert.ok(!FOURNISSEURS_CRM.includes("systemeio"));
  assert.ok(FOURNISSEURS_CRM.includes("gohighlevel"));
  assert.equal(estFournisseurCrm("systemeio"), false);
  assert.equal(estFournisseurCrm("brevo"), false, "un outil sans adaptateur n'entre pas en base");
  assert.equal(estFournisseurCrm("gohighlevel"), true);
  assert.equal(ficheFournisseur("zapier"), null);
});

// ── 2. LES DECISIONS PURES ─────────────────────────────────────────────

test("la decision est PURE : aucune base, aucun reseau", () => {
  const src = lire("lib/integrations/decision.ts");
  for (const interdit of ["supabaseAdmin", "fetch(", "next/headers", "process.env"]) {
    assert.ok(!src.includes(interdit), `decision.ts importe ou appelle ${interdit}`);
  }
});

test("vers ou part un lead : la connexion du quiz, sinon le defaut, sinon Systeme.io", () => {
  const duQuiz = cx({ id: "q" });
  const defaut = cx({ id: "d", est_defaut: true });
  assert.deepEqual(choisirDestination({ connexionDuQuiz: duQuiz, connexionParDefaut: defaut }), {
    type: "connexion",
    id: "q",
    fournisseur: "gohighlevel",
  });
  assert.deepEqual(choisirDestination({ connexionDuQuiz: null, connexionParDefaut: defaut }), {
    type: "connexion",
    id: "d",
    fournisseur: "gohighlevel",
  });
  assert.deepEqual(choisirDestination({ connexionDuQuiz: null, connexionParDefaut: null }), { type: "systemeio" });
});

test("une connexion en PAUSE ne retombe sur rien : ni sur le defaut, ni sur Systeme.io", () => {
  // Retomber enverrait les leads d'un client GoHighLevel dans le compte
  // Systeme.io de la creatrice, et personne ne le verrait.
  const enPause = cx({ id: "q", actif: false });
  const defaut = cx({ id: "d", est_defaut: true });
  assert.deepEqual(choisirDestination({ connexionDuQuiz: enPause, connexionParDefaut: defaut }), {
    type: "pause",
    id: "q",
    fournisseur: "gohighlevel",
  });
  assert.deepEqual(choisirDestination({ connexionDuQuiz: null, connexionParDefaut: cx({ id: "d", actif: false }) }), {
    type: "pause",
    id: "d",
    fournisseur: "gohighlevel",
  });
});

test("une connexion DECONNECTEE est quand meme visee : c'est l'envoi qui le dira", () => {
  const morte = cx({ id: "q", etat: "deconnecte", alerte_deconnexion_le: "2026-09-14" });
  assert.equal(choisirDestination({ connexionDuQuiz: morte, connexionParDefaut: null }).type, "connexion");
});

test("un 401 est 'deconnecte', un 5xx est 'temporaire', un 422 est 'refus'", () => {
  for (const s of [401, 403]) assert.equal(classerEchecEnvoi(s), "deconnecte", String(s));
  for (const s of [0, 408, 429, 500, 502, 503, 504]) assert.equal(classerEchecEnvoi(s), "temporaire", String(s));
  for (const s of [400, 404, 409, 422]) assert.equal(classerEchecEnvoi(s), "refus", String(s));
});

test("l'alerte 'connexion coupee' part UNE fois par coupure", () => {
  assert.equal(doitAlerterDeconnexion({ alerte_deconnexion_le: null }), true);
  assert.equal(doitAlerterDeconnexion({ alerte_deconnexion_le: "2026-09-14T10:00:00Z" }), false);
});

test("on ne montre que les derniers caracteres d'un secret", () => {
  assert.equal(derniersCaracteres("pit-abcdef123456"), "3456");
  assert.equal(derniersCaracteres("ab"), "ab");
  assert.equal(derniersCaracteres(""), "");
});

test("fusionnerTags retire les doublons et le vide, et garde l'ordre", () => {
  assert.deepEqual(fusionnerTags(["profil-a", "profil-b"], [null], ["profil-a", "", undefined, "score-1"]), [
    "profil-a",
    "profil-b",
    "score-1",
  ]);
  assert.deepEqual(fusionnerTags([], [null, undefined]), []);
});

// ── 3. L'ADAPTATEUR GOHIGHLEVEL ────────────────────────────────────────

test("l'upsert GoHighLevel n'envoie JAMAIS `tags` : leur API les ecrase", () => {
  const src = source("lib/integrations/adaptateurs/gohighlevel.ts");
  const debut = src.indexOf("function corpsUpsert");
  const fin = src.indexOf("export async function envoyerVersGhl");
  assert.ok(debut > 0 && fin > debut, "corpsUpsert ou envoyerVersGhl introuvable");
  const corps = src.slice(debut, fin);
  assert.ok(!/\btags\b/.test(corps), "corpsUpsert ecrit `tags` : un deuxieme quiz effacerait les tags du premier");
  // Et les tags sont AJOUTES par l'appel qui n'enleve rien.
  const envoi = src.slice(fin);
  assert.match(envoi, /\/contacts\/\$\{encodeURIComponent\(contactId\)\}\/tags`/, "les tags ne passent pas par /contacts/{id}/tags");
  assert.match(envoi, /body:\s*\{\s*tags:\s*\[\.\.\.charge\.tags\]\s*\}/);
});

test("chaque appel GoHighLevel porte l'en-tete Version, sans lequel ils repondent 401", () => {
  const src = source("lib/integrations/adaptateurs/gohighlevel.ts");
  assert.match(src, /Version:\s*GHL_VERSION/);
  assert.match(src, /GHL_VERSION\s*=\s*"2021-07-28"/);
  assert.match(src, /GHL_BASE\s*=\s*"https:\/\/services\.leadconnectorhq\.com"/);
  // Le champ personnalise part A PART, apres les tags : son echec ne
  // fait que journaliser, il ne fait jamais perdre le lead.
  const tags = src.indexOf("/tags`");
  const champ = src.indexOf("customFields");
  assert.ok(tags > 0 && champ > tags, "le champ personnalise doit partir APRES les tags");
});

// ── 4. LES ROUTES PASSENT PAR LA DESTINATION ───────────────────────────

test("la route de capture ne porte plus son propre client Systeme.io", () => {
  const src = source("app/api/quiz/[quizId]/public/route.ts");
  for (const fn of ["function sioFetch", "function ensureSioContact", "function ensureSioTag", "function enrichSioContact"]) {
    assert.ok(!src.includes(fn), `${fn} vit encore dans la route : deux clients Systeme.io finiraient par diverger`);
  }
  assert.ok(src.includes("resoudreDestination("), "la route ne resout plus la destination");
  const appels = src.match(/envoyerLead\(/g) ?? [];
  assert.ok(appels.length >= 2, `envoyerLead appele ${appels.length} fois : la capture ET le partage doivent passer par lui`);
  assert.ok(src.includes("fusionnerTags("), "les tags ne sont plus fusionnes par la fonction pure");
});

test("dans la route de capture, une destination en PAUSE rend la main AVANT tout envoi", () => {
  const src = source("app/api/quiz/[quizId]/public/route.ts");
  const pause = src.indexOf('destination.type === "pause"');
  const envoi = src.indexOf("envoyerLead(");
  assert.ok(pause > 0, "le cas pause n'est plus traite");
  assert.ok(pause < envoi, "le cas pause est lu APRES l'envoi");
});

test("le renvoi depuis Mes leads et la liste des tags resolvent la MEME destination", () => {
  for (const rel of ["app/api/quiz/[quizId]/sync-systeme/route.ts", "app/api/systeme-io/tags/route.ts"]) {
    const src = source(rel);
    assert.ok(src.includes("resoudreDestination("), `${rel} ne resout pas la destination`);
  }
  // La route des tags DIT le fournisseur : c'est ce qui permet a l'onglet
  // Automatiser d'ecrire la recette GoHighLevel au lieu de celle de
  // Systeme.io.
  assert.match(source("app/api/systeme-io/tags/route.ts"), /fournisseur:\s*"gohighlevel"/);
  assert.match(source("components/quiz/AutomatisationPanel.tsx"), /fournisseur\s*===\s*"gohighlevel"/);
});

test("envoyer.ts DELEGUE la classification a la decision pure", () => {
  const src = source("lib/integrations/envoyer.ts");
  assert.ok(src.includes("classerEchecEnvoi("), "un statut relu a la main ici divergerait de decision.ts");
  assert.ok(src.includes("doitAlerterDeconnexion("));
  assert.ok(!/status\s*===\s*401/.test(src), "un 401 relu a la main dans envoyer.ts");
  // La pause rend la main AVANT d'appeler un adaptateur.
  const pause = src.indexOf('dest.type === "pause"');
  const ghl = src.indexOf("envoyerVersGhl(");
  assert.ok(pause > 0 && pause < ghl);
});

// ── 5. LES ECRANS ET L'API ─────────────────────────────────────────────

test("le PATCH du quiz accepte connexion_id, et VERIFIE qu'elle appartient a la personne", () => {
  const src = source("app/api/quiz/[quizId]/route.ts");
  assert.ok(src.includes('"connexion_id"'), "connexion_id n'est pas dans les colonnes acceptees");
  assert.ok(src.includes('"connexion_id" in patch'), "connexion_id n'est pas controle");
  assert.ok(src.includes("connexion_id not found"), "une connexion d'un autre compte passerait");
});

test("le picker ecrit les DEUX colonnes : choisir l'une vide l'autre", () => {
  const src = source("components/sio/QuizSioKeyPicker.tsx");
  assert.match(src, /connexion_id:\s*value\.slice\(3\),\s*sio_api_key_id:\s*null/);
  assert.match(src, /sio_api_key_id:\s*value\.slice\(4\),\s*connexion_id:\s*null/);
  assert.match(src, /sio_api_key_id:\s*null,\s*connexion_id:\s*null/);
});

test("l'ancien onglet ?tab=systemeio ouvre toujours les Connexions", () => {
  const src = source("components/settings/SettingsClient.tsx");
  assert.match(src, /tabDemande\s*===\s*"systemeio"\s*\?\s*"connections"/);
  assert.ok(src.includes('value="connections"'));
});

test("les cles de l'onglet Connexions existent dans les 7 langues", () => {
  const cles = (d: Record<string, unknown>, p = ""): string[] =>
    Object.entries(d).flatMap(([k, v]) =>
      v && typeof v === "object" ? cles(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`],
    );
  const fr = JSON.parse(lire("messages/fr.json"));
  const attendues = new Set(cles(fr.connexions));
  assert.ok(attendues.size >= 10, "le namespace connexions a fondu");
  const ghlAuto = cles(fr.automatisation).filter((k) => /Ghl$/.test(k));
  assert.ok(ghlAuto.length >= 5, "la recette GoHighLevel a disparu de l'onglet Automatiser");
  for (const l of SUPPORTED_LOCALES) {
    const d = JSON.parse(lire(`messages/${l}.json`));
    const presentes = new Set(cles(d.connexions ?? {}));
    for (const k of attendues) assert.ok(presentes.has(k), `${l} : connexions.${k} manque`);
    const auto = new Set(cles(d.automatisation ?? {}));
    for (const k of ghlAuto) assert.ok(auto.has(k), `${l} : automatisation.${k} manque`);
  }
});

// ── 6. L'ALERTE EMAIL ──────────────────────────────────────────────────

test("l'alerte 'connexion coupee' existe dans les 7 langues, sans tiret cadratin ni chevron", () => {
  const vus = new Set<string>();
  for (const l of SUPPORTED_LOCALES) {
    const c = contenuAlerteConnexion({ locale: l, outil: "GoHighLevel", nom: "Agence Dupont", lien: "https://quiz.tipote.com/settings?tab=connections" });
    const tout = [c.subject, c.heading, ...c.paragraphes, c.footer].join("\n");
    assert.ok(tout.includes("GoHighLevel"), `${l} : l'outil n'est pas nomme`);
    assert.ok(tout.includes("Agence Dupont"), `${l} : la connexion n'est pas nommee`);
    assert.ok(tout.includes("https://quiz.tipote.com/settings?tab=connections"), `${l} : pas de lien`);
    assert.ok(!/[—–«»]/.test(tout), `${l} : tiret cadratin ou chevron dans l'email`);
    assert.ok(!vus.has(c.subject), `${l} : le meme objet qu'une autre langue`);
    vus.add(c.subject);
  }
  // Une langue inconnue retombe sur l'ANGLAIS, jamais sur le francais
  // (lecon du robot d'aide, 31 aout).
  const inconnue = contenuAlerteConnexion({ locale: "ja", outil: "X", nom: "Y", lien: "Z" });
  assert.equal(inconnue.subject, contenuAlerteConnexion({ locale: "en", outil: "X", nom: "Y", lien: "Z" }).subject);
  // Et pt-BR a sa propre voix.
  assert.notEqual(
    contenuAlerteConnexion({ locale: "pt-BR", outil: "X", nom: "Y", lien: "Z" }).paragraphes[0],
    contenuAlerteConnexion({ locale: "pt", outil: "X", nom: "Y", lien: "Z" }).paragraphes[0],
  );
});

// ── 7. LA MIGRATION ────────────────────────────────────────────────────

test("la migration porte tout ce que le code lit", () => {
  const rel = "supabase/migrations/20260914_connexions_crm.sql";
  assert.ok(existsSync(path.join(process.cwd(), rel)), `${rel} manque`);
  const sql = lire(rel);
  for (const attendu of [
    "create table if not exists public.connexions_crm",
    "add column if not exists connexion_id uuid references public.connexions_crm(id) on delete set null",
    "add column if not exists sync_fournisseur text",
    "add column if not exists actif boolean",
    "alerte_deconnexion_le",
    "notify pgrst, 'reload schema'",
  ]) {
    assert.ok(sql.includes(attendu), `la migration ne porte pas : ${attendu}`);
  }
  // Un seul defaut par (personne, projet) : deux defauts, et c'est le
  // hasard de la requete qui choisit ou partent les leads.
  assert.match(sql, /create unique index if not exists[^;]*est_defaut/);
});

// ── 8. LA VENTE NE BOUGE PAS ───────────────────────────────────────────

test("la chaine de VENTE Systeme.io n'est pas touchee par les connexions", () => {
  // Bene : "je reste sur systeme io pour les ventes, on ne touche
  // surtout pas a ca". Ces fichiers n'ont rien a savoir des connexions.
  for (const rel of ["lib/sio/tags.ts", "app/api/commande/webhook/route.ts", "app/api/commande/paypal/webhook/route.ts"]) {
    if (!existsSync(path.join(process.cwd(), rel))) continue;
    const src = source(rel);
    assert.ok(!src.includes("lib/integrations/"), `${rel} importe les connexions CRM`);
    assert.ok(!src.includes("connexions_crm"), `${rel} lit connexions_crm`);
  }
});
