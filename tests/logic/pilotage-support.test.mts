// tests/logic/pilotage-support.test.mts
//
// LA FILE DU SUPPORT DANS LE CENTRE DE PILOTAGE.
//
// Béné : "Qui attend une réponse, et depuis combien de temps ?" Ce
// fichier fige les trois choses qui, mal faites, transforment une file
// en écran qu'on n'ouvre plus : l'ordre (celui qui attend depuis trois
// jours passe devant), les compteurs (un onglet qui annonce 12 en
// affiche 12) et la recherche (taper "eric" trouve "Éric").

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ETAT_DEFAUT,
  ETATS_FILTRE,
  FILTRE_VIDE,
  attenteLisible,
  correspond,
  facettes,
  filtrerFile,
  lireEtatFiltre,
  pireAttenteHeures,
} from "@/lib/pilotage/support";
import type { Ticket } from "@/lib/support/tickets";

const MAINTENANT = new Date("2026-08-29T12:00:00Z");

function ticket(p: Partial<Ticket> & { id: string }): Ticket {
  return {
    email: `${p.id}@exemple.fr`,
    name: null,
    subject: null,
    message: "",
    page: null,
    status: "open",
    adminReply: null,
    repliedAt: null,
    locale: "fr",
    createdAt: MAINTENANT.toISOString(),
    product: "tiquiz",
    ...p,
  };
}

// Il y a quatre jours : largement au dela des 24 h d'alerte.
const VIEUX = "2026-08-25T12:00:00Z";
// Il y a deux heures.
const RECENT = "2026-08-29T10:00:00Z";

test("le defaut est A TRAITER, pas la file entiere", () => {
  // "Qui attend une reponse ?" Ouvrir sur tout melangerait les closes
  // au milieu de celles qui attendent.
  assert.equal(ETAT_DEFAUT, "a-traiter");
  assert.equal(FILTRE_VIDE.etat, "a-traiter");
  assert.equal(FILTRE_VIDE.produit, null);
});

test("un onglet inconnu retombe sur le defaut, il n'affiche jamais rien", () => {
  assert.equal(lireEtatFiltre("closes"), "closes");
  assert.equal(lireEtatFiltre("CLOSES"), "closes");
  assert.equal(lireEtatFiltre("n'importe quoi"), ETAT_DEFAUT);
  assert.equal(lireEtatFiltre(null), ETAT_DEFAUT);
  assert.equal(lireEtatFiltre(undefined), ETAT_DEFAUT);
});

test("CE QUI ATTEND LE PLUS LONGTEMPS PASSE DEVANT, filtre ou pas", () => {
  const file = filtrerFile(
    [ticket({ id: "recente", createdAt: RECENT }), ticket({ id: "vieille", createdAt: VIEUX })],
    FILTRE_VIDE,
    MAINTENANT,
  );
  assert.deepEqual(
    file.map((t) => t.id),
    ["vieille", "recente"],
    "trier du plus recent enterrerait celle qu'on a deja fait attendre",
  );
});

test("l'onglet A TRAITER ne montre que ce qui n'a pas de reponse", () => {
  const tickets = [
    ticket({ id: "ouverte" }),
    ticket({ id: "repondue", status: "replied" }),
    ticket({ id: "close", status: "closed" }),
  ];
  assert.deepEqual(
    filtrerFile(tickets, FILTRE_VIDE, MAINTENANT).map((t) => t.id),
    ["ouverte"],
  );
  assert.equal(filtrerFile(tickets, { ...FILTRE_VIDE, etat: "tous" }, MAINTENANT).length, 3);
});

test("EN RETARD ne compte pas une demande deja repondue", () => {
  // Une reponse partie il y a une semaine ne doit pas rougir : le
  // retard mesure une attente, pas l'age d'une ligne.
  const tickets = [
    ticket({ id: "vieille-ouverte", createdAt: VIEUX }),
    ticket({ id: "vieille-repondue", createdAt: VIEUX, status: "replied" }),
    ticket({ id: "recente-ouverte", createdAt: RECENT }),
  ];
  assert.deepEqual(
    filtrerFile(tickets, { ...FILTRE_VIDE, etat: "en-retard" }, MAINTENANT).map((t) => t.id),
    ["vieille-ouverte"],
  );
});

test("la recherche ignore les accents ET la casse", () => {
  const t = ticket({ id: "e", name: "Éric Legrigeois", email: "legrigeoiseric@gmail.com" });
  assert.ok(correspond(t, "eric"));
  assert.ok(correspond(t, "ERIC"));
  assert.ok(correspond(t, "Éric"));
  assert.ok(correspond(t, ""), "une recherche vide ne filtre rien");
});

test("la recherche accepte plusieurs mots, dans n'importe quel ordre", () => {
  const t = ticket({ id: "a", name: "Eric", message: "je n'ai pas recu mes acces" });
  assert.ok(correspond(t, "acces eric"));
  assert.ok(!correspond(t, "eric remboursement"));
});

test("la recherche regarde AUSSI le message, pas seulement l'adresse", () => {
  // Bene cherche par symptome ("paypal") aussi souvent que par personne.
  const t = ticket({ id: "a", message: "mon paiement paypal ne passe pas" });
  assert.ok(correspond(t, "paypal"));
});

test("UN ONGLET QUI ANNONCE 12 EN AFFICHE 12 : les compteurs sont facettes", () => {
  const tickets = [
    ticket({ id: "t1", product: "tiquiz" }),
    ticket({ id: "t2", product: "tiquiz", status: "closed" }),
    ticket({ id: "a1", product: "atelier" }),
    ticket({ id: "a2", product: "atelier", status: "closed" }),
  ];
  const filtre = { ...FILTRE_VIDE, produit: "atelier" as const };
  const f = facettes(tickets, filtre, MAINTENANT);

  // L'onglet "closes" compte AVEC le filtre produit actif...
  assert.equal(f.parEtat.closes, 1);
  assert.equal(
    filtrerFile(tickets, { ...filtre, etat: "closes" }, MAINTENANT).length,
    f.parEtat.closes,
    "le compteur de l'onglet et l'ecran doivent dire la meme chose",
  );

  // ... et le compteur d'un produit compte SANS le filtre produit,
  // sinon les autres produits afficheraient tous zero.
  assert.equal(f.parProduit.tiquiz, 1);
  assert.equal(f.parProduit.atelier, 1);
  assert.equal(f.tousProduits, 2);
});

test("un produit inconnu est compte comme Tiquiz, jamais perdu", () => {
  const f = facettes([ticket({ id: "x", product: "n'importe quoi" })], FILTRE_VIDE, MAINTENANT);
  assert.equal(f.parProduit.tiquiz, 1);
  assert.equal(f.tousProduits, 1);
});

test("LA PIRE ATTENTE PORTE SUR UNE PERSONNE REELLE, jamais une moyenne", () => {
  const tickets = [
    ticket({ id: "vieille", createdAt: VIEUX }),
    ticket({ id: "recente", createdAt: RECENT }),
  ];
  const h = pireAttenteHeures(tickets, MAINTENANT);
  assert.ok(h !== null && Math.round(h) === 96, `attendu 96 h, recu ${h}`);
});

test("personne qui attend rend null, jamais zero", () => {
  // "0 h" se lirait "on vient de repondre a quelqu'un".
  assert.equal(pireAttenteHeures([], MAINTENANT), null);
  assert.equal(
    pireAttenteHeures([ticket({ id: "r", createdAt: VIEUX, status: "replied" })], MAINTENANT),
    null,
  );
});

test("l'attente s'ecrit pour un humain", () => {
  assert.equal(attenteLisible(0.5), "moins d'une heure");
  assert.equal(attenteLisible(3), "3 h");
  assert.equal(attenteLisible(96), "4 jours");
  assert.equal(attenteLisible(25), "1 jour");
});

test("les cinq onglets existent, et eux seuls", () => {
  assert.deepEqual(ETATS_FILTRE, ["a-traiter", "en-retard", "repondues", "closes", "tous"]);
});
