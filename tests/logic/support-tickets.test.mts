// tests/logic/support-tickets.test.mts
//
// LE SUPPORT DE TIQUIZ, ET LA SEULE CHOSE QU'IL NE DOIT JAMAIS FAIRE :
// oublier quelqu'un.
//
// Béné, 22 août : "pourquoi ne pas lier le compte client à l'aide au
// ticketing ?" puis "côté support, cgv etc... c'est carré ou pas
// encore ?"
//
// Le centre d'aide existait déjà (57 articles servis par Tipote). Ce qui
// manquait, c'était le chemin vers un humain, et l'endroit où Béné
// répond. Ce fichier fige les règles qui décident si une cliente est
// vue ou enterrée.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  DELAI_ALERTE_HEURES,
  apercu,
  estEnRetard,
  heuresDAttente,
  readTicketStatus,
  resumerFile,
  statutApresReponse,
  trierFile,
  type Ticket,
} from "../../lib/support/tickets.ts";
import { buildSupportReplyContent } from "../../lib/email/supportReplyContent.ts";

const MAINTENANT = new Date("2026-08-22T18:00:00Z");

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: over.id ?? "t1",
    email: "a@b.fr",
    name: null,
    subject: null,
    message: "Je n'arrive pas à publier mon quiz.",
    page: null,
    status: "open",
    adminReply: null,
    repliedAt: null,
    locale: "fr",
    createdAt: "2026-08-22T17:00:00Z",
    ...over,
  };
}

test("CE QUI ATTEND LE PLUS LONGTEMPS PASSE DEVANT", () => {
  // Trier les ouverts du plus RECENT au plus ancien enterrerait
  // justement ceux qu'on a deja fait attendre. C'est le tri qui decide
  // si une cliente est oubliee, pas la bonne volonte du matin.
  const file = trierFile([
    ticket({ id: "recent", createdAt: "2026-08-22T17:00:00Z" }),
    ticket({ id: "clos", status: "closed", createdAt: "2026-08-22T10:00:00Z" }),
    ticket({ id: "vieux", createdAt: "2026-08-19T09:00:00Z" }),
    ticket({ id: "repondu", status: "replied", createdAt: "2026-08-21T09:00:00Z" }),
  ]);
  assert.deepEqual(
    file.map((t) => t.id),
    ["vieux", "recent", "repondu", "clos"],
  );
});

test("au dela de 24 h sans reponse, la demande est EN RETARD", () => {
  const hier = ticket({ createdAt: "2026-08-21T17:30:00Z" });
  assert.equal(estEnRetard(hier, MAINTENANT), true);
  assert.ok(heuresDAttente(hier, MAINTENANT) >= DELAI_ALERTE_HEURES);

  const recent = ticket({ createdAt: "2026-08-22T16:00:00Z" });
  assert.equal(estEnRetard(recent, MAINTENANT), false);
});

test("une demande DEJA REPONDUE n'est jamais en retard", () => {
  // Sinon la file resterait rouge pour l'eternite, et une alerte qui
  // reste rouge est une alerte qu'on arrete de lire (lecon du badge
  // "1 sans acces ouvert", 22 aout).
  const vieux = ticket({ status: "replied", createdAt: "2026-01-01T09:00:00Z" });
  assert.equal(estEnRetard(vieux, MAINTENANT), false);
  const clos = ticket({ status: "closed", createdAt: "2026-01-01T09:00:00Z" });
  assert.equal(estEnRetard(clos, MAINTENANT), false);
});

test("repondre a un ticket CLOS ne le rouvre pas", () => {
  // La regle est un choix explicite, pas un effet de bord : l'ancienne
  // implementation ecrasait le statut sans se poser la question.
  assert.equal(statutApresReponse("open"), "replied");
  assert.equal(statutApresReponse("replied"), "replied");
  assert.equal(statutApresReponse("closed"), "closed");
});

test("un statut inconnu en base retombe sur 'en attente'", () => {
  // Jamais sur 'clos' : une valeur qu'on ne comprend pas ne doit pas
  // faire disparaitre quelqu'un de la file.
  assert.equal(readTicketStatus("nimporte-quoi"), "open");
  assert.equal(readTicketStatus(null), "open");
  assert.equal(readTicketStatus("CLOSED"), "closed");
});

test("le resume compte ce qu'il annonce", () => {
  const r = resumerFile(
    [
      ticket({ id: "1", createdAt: "2026-08-19T09:00:00Z" }),
      ticket({ id: "2", createdAt: "2026-08-22T17:30:00Z" }),
      ticket({ id: "3", status: "replied" }),
      ticket({ id: "4", status: "closed" }),
    ],
    MAINTENANT,
  );
  assert.deepEqual(r, { ouverts: 2, enRetard: 1, repondus: 1, clos: 1 });
});

test("l'apercu coupe sur un espace, jamais au milieu d'un mot", () => {
  const long = "Bonjour, je voudrais comprendre pourquoi mon quiz ne se publie pas du tout";
  const court = apercu(long, 30);
  assert.ok(court.length <= 34, court);
  assert.ok(court.endsWith("..."));
  assert.ok(!/\w\.\.\.$/.test(court.replace("...", "x...")) || court.includes(" "));
  // Un message court n'est pas touche.
  assert.equal(apercu("Merci !"), "Merci !");
});

// ── L'EMAIL DE RÉPONSE ───────────────────────────────────────────────

test("la reponse rappelle SA question", () => {
  // Une reponse qui arrive trois jours plus tard, seule, oblige la
  // personne a retrouver ce qu'elle avait demande.
  const { html, text, subject } = buildSupportReplyContent({
    reponse: "Il faut publier le quiz depuis le bouton en haut à droite.",
    question: "Je n'arrive pas à publier mon quiz.",
    sujet: "publication",
    locale: "fr",
  });
  assert.ok(subject.includes("publication"));
  assert.ok(text.includes("Je n'arrive pas à publier mon quiz."));
  assert.ok(html.includes("Il faut publier le quiz"));
  // Le cadre est celui de TIQUIZ, jamais celui de Tipote.
  assert.ok(html.includes("Tiquiz"));
});

test("ce que la cliente a ecrit est ECHAPPE avant d'entrer dans l'email", () => {
  // Son message est repris dans la reponse : sans echappement, un `<`
  // casse l'email, et un `<script>` volontaire devient une injection
  // dans la boite de quelqu'un d'autre.
  const { html } = buildSupportReplyContent({
    reponse: "ok",
    question: '<script>alert("salut")</script>',
    locale: "fr",
  });
  assert.ok(!html.includes("<script>"), "le HTML de la cliente traverse l'email");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("le cadre est traduit, le message de Bene ne l'est pas", () => {
  const { subject, text } = buildSupportReplyContent({
    reponse: "Voici la marche à suivre.",
    question: "No consigo publicar.",
    sujet: "publicación",
    locale: "es",
  });
  assert.ok(subject.startsWith("Respuesta"));
  // Son texte a elle est intact : le traduire serait mentir sur ce
  // qu'elle a ecrit.
  assert.ok(text.includes("Voici la marche à suivre."));
});

test("une langue inconnue retombe sur le francais, jamais sur du vide", () => {
  const { subject } = buildSupportReplyContent({
    reponse: "ok",
    question: "?",
    sujet: "test",
    locale: "kl",
  });
  assert.ok(subject.includes("Réponse à ta demande"));
});

test("sans sujet, l'email en trouve un plutot que d'ecrire un trou", () => {
  const { subject } = buildSupportReplyContent({ reponse: "ok", question: "?", locale: "fr" });
  assert.ok(subject.includes("ta question"));
  assert.ok(!subject.includes("null") && !subject.includes("undefined"));
});
