// tests/logic/support-ticketing.test.mts
//
// UNE SEULE FILE, POUR TOUTES LES APPS.
//
// Béné, 23 août 2026 : "s'il n'a pas reçu ses accès, comment il accède à
// quiz.tipote.com/support ? Pas con hein ??? Je veux un service de
// ticketing dans le centre d'aide commun à toutes les app,
// essentiellement pour Tiquiz et L'Atelier qui sont vendus en ce moment,
// avec ticket relié à la fiche client si elle existe."
//
// Ce qu'on a trouvé en allant le faire : il y avait DEUX files, dans
// deux bases. `support_tickets` chez Tipote depuis le 12 mars (les
// escalades du robot d'aide) et `support_tickets` ici depuis le 22 août
// (le formulaire). Deux écrans d'admin, et une demande pouvait attendre
// des jours dans celle qu'on ne regardait pas.
//
// La porte est maintenant commune (le centre d'aide), la file est
// unique et vit ICI, parce que c'est ici que vit la fiche client.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { preparerTicket } from "../../lib/support/ticketEntrant.ts";
import { nomProduit, normaliserProduit } from "../../lib/support/produit.ts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ── DE QUEL PRODUIT PARLE LA DEMANDE ──

test("le produit est valide, jamais ecrit tel quel", () => {
  assert.equal(normaliserProduit("atelier"), "atelier");
  assert.equal(normaliserProduit("ATELIER"), "atelier");
  // Les alias que quelqu'un ecrira forcement un jour : le nom du depot
  // et l'ancien sous-domaine.
  assert.equal(normaliserProduit("formaquiz"), "atelier");
  assert.equal(normaliserProduit("quizing"), "atelier");
  assert.equal(normaliserProduit("tipote"), "tipote");
  // Une valeur inconnue retombe sur tiquiz, le defaut de la colonne :
  // un ticket mal etiquete reste lisible, un ticket refuse est une
  // cliente sans reponse.
  assert.equal(normaliserProduit("<script>"), "tiquiz");
  assert.equal(normaliserProduit(null), "tiquiz");
  assert.equal(normaliserProduit(""), "tiquiz");
  assert.equal(nomProduit("atelier"), "L'Atelier du Quiz");
});

// ── CE QU'ON ACCEPTE D'ECRIRE ──

test("une adresse invalide est refusee, avec sa raison", () => {
  const r = preparerTicket({ email: "pas-une-adresse", message: "Bonjour, j'ai un souci." });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, "invalid_email");
});

test("un message vide est refuse, une vraie question courte ne l'est pas", () => {
  const vide = preparerTicket({ email: "a@b.fr", message: "aide" });
  assert.equal(vide.ok, false);
  assert.equal(vide.ok === false && vide.reason, "message_trop_court");

  const courte = preparerTicket({ email: "a@b.fr", message: "Ou est ma facture ?" });
  assert.equal(courte.ok, true);
});

test("l'adresse est normalisee : c'est elle qui relie a la fiche client", () => {
  const r = preparerTicket({ email: "  Bene@Tipote.FR ", message: "Je n'ai pas mes acces." });
  assert.ok(r.ok);
  // La fiche client cherche en minuscules. Une majuscule ici, et le
  // ticket n'apparait sur aucune fiche.
  assert.equal(r.ok && r.ticket.email, "bene@tipote.fr");
});

test("la conversation du robot est reprise, bornee et nettoyee", () => {
  const r = preparerTicket({
    email: "a@b.fr",
    message: "Je n'arrive pas a me connecter.",
    conversation: [
      { role: "user", content: "salut" },
      { role: "assistant", content: "bonjour" },
      { role: "bizarre", content: "  " },
      null,
    ],
  });
  assert.ok(r.ok);
  const conv = r.ok ? r.ticket.conversation : [];
  assert.equal(conv.length, 2, "les entrees vides doivent disparaitre");
  assert.equal(conv[0].role, "user");
  assert.equal(conv[1].role, "assistant");
});

test("un role inconnu devient 'user', jamais autre chose", () => {
  const r = preparerTicket({
    email: "a@b.fr",
    message: "Une question sur mon abonnement.",
    conversation: [{ role: "system", content: "consigne interne" }],
  });
  assert.ok(r.ok);
  assert.equal(r.ok && r.ticket.conversation[0].role, "user");
});

// ── LE CODE, LA OU AUCUN TEST UNITAIRE NE VOIT ──

test("l'ecriture retombe sur l'ancienne forme si la migration n'est pas passee", () => {
  // PostgREST rejette l'ecriture ENTIERE sur une colonne inconnue.
  // Sans ce repli, un deploiement en avance sur la migration perdrait
  // TOUS les tickets, en silence : c'est le drame de quiz_events.meta
  // (15 jours de statistiques perdues).
  const src = lire("lib/support/creerTicket.ts");
  assert.ok(
    /colonneInconnue|does not exist|schema cache/.test(src),
    "le repli sur l'ancienne forme a disparu",
  );
  assert.ok(src.includes("sansNouveautes"), "on n'ecrit plus sans les colonnes recentes");
});

test("les trois portes ecrivent par la MEME fonction", () => {
  // Le formulaire de Tiquiz, le centre d'aide commun et le robot. Si
  // chacune ecrivait sa ligne, elles finiraient par ne plus enregistrer
  // les memes champs.
  for (const route of [
    "app/api/support/ticket/route.ts",
    "app/api/partner/support-ticket/route.ts",
  ]) {
    const src = lire(route);
    assert.ok(src.includes("preparerTicket"), `${route} valide de son cote`);
    assert.ok(src.includes("ecrireTicket"), `${route} ecrit de son cote`);
  }
});

test("la porte partenaire exige le secret partage", () => {
  // Elle n'ajoute aucun pouvoir (l'autre route est publique), mais elle
  // saute la limite par IP : sans secret, elle deviendrait le moyen le
  // plus simple d'inonder la file.
  const src = lire("app/api/partner/support-ticket/route.ts");
  assert.ok(src.includes("PARTNER_SHARED_SECRET"), "le secret partage a disparu");
  assert.ok(src.includes("x-partner-secret"), "l'entete de verification a change");
  assert.ok(/status: 403/.test(src), "un appel non signe n'est plus refuse");
});

test("la file affiche DE QUEL produit on parle", () => {
  // Sans ce libelle, "je n'ai pas recu mes acces" ne dit pas s'il s'agit
  // de Tiquiz ou de L'Atelier, et la reponse tombe a cote.
  assert.ok(
    lire("components/admin/SupportCard.tsx").includes("nomProduit(t.product)"),
    "le produit n'est plus affiche dans la file",
  );
  assert.ok(
    lire("app/api/admin/support/tickets/route.ts").includes("product"),
    "la file ne lit plus le produit",
  );
});

test("la migration existe et se replie proprement", () => {
  const sql = lire("supabase/migrations/20260823_support_tickets_produit.sql");
  assert.ok(/ADD COLUMN IF NOT EXISTS product/.test(sql), "la colonne produit a disparu");
  assert.ok(/ADD COLUMN IF NOT EXISTS conversation/.test(sql), "la conversation du robot serait perdue");
  assert.ok(/DEFAULT 'tiquiz'/.test(sql), "les tickets existants changeraient de sens");
  assert.ok(/NOTIFY pgrst/.test(sql), "PostgREST ne rechargera pas son schema");
});

test("le lien support du bon de commande mene a la porte commune", () => {
  // Bene : "s'il n'a pas recu ses acces, comment il accede a
  // quiz.tipote.com/support ?" Le formulaire de Tiquiz est bien public,
  // mais personne ne devrait avoir a deviner sur quelle app ecrire.
  const src = lire("lib/checkout/brand.ts");
  assert.ok(
    src.includes("app.tipote.com/support?lang=fr&produit=tiquiz"),
    "le bon de commande ne mene plus au centre d'aide commun",
  );
  // La constante EXPORTEE, pas le fichier : le commentaire au dessus
  // raconte l'ancienne adresse, c'est voulu, et une assertion qui
  // rougirait pour ca finirait desactivee.
  const constante = src.match(/export const LIEN_SUPPORT = "([^"]+)"/)?.[1] ?? "";
  assert.ok(
    !constante.includes("www.tipote.com/contact"),
    "l'ancienne adresse morte est revenue",
  );
});
