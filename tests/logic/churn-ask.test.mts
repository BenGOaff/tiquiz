// tests/logic/churn-ask.test.mts
//
// "LUI ENVOYER UN MAIL POUR LUI DEMANDER POURQUOI" (Béné, 21 août 2026.)
//
// Un email automatique à une cliente qui vient de partir est ce qu'il y
// a de plus facile à rater, et une seule rafale se voit publiquement.
// Ces tests portent sur les quatre façons de se planter, pas sur le
// chemin heureux :
//
//   1. la rafale du premier jour (un backlog envoyé d'un coup) ;
//   2. le double envoi ;
//   3. l'email à quelqu'un qui est revenu ;
//   4. redemander à quelqu'un qui a déjà écrit ce qu'il pensait.
//
// Plus la sécurité du lien de réponse, qui autorise une ÉCRITURE.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MAX_AGE_JOURS,
  MAX_PAR_PASSAGE,
  MIN_DELAI_HEURES,
  buildAskQueue,
  readAskVerdict,
  type ChurnAskRow,
} from "../../lib/churn/askQueue.ts";
import {
  readChurnSecret,
  readChurnToken,
  signChurnToken,
} from "../../lib/churn/replyToken.ts";
import { buildChurnAskContent } from "../../lib/email/churnAskContent.ts";

const MAINTENANT = new Date("2026-08-21T12:00:00Z");
const HEURE = 3600 * 1000;
const JOUR = 24 * HEURE;

function depart(extra: Partial<ChurnAskRow> = {}): ChurnAskRow {
  return {
    id: "c1",
    email: "part@x.fr",
    cancelled_at: new Date(MAINTENANT.getTime() - 6 * HEURE).toISOString(),
    ...extra,
  };
}

test("le chemin normal : un depart d'hier recoit l'email", () => {
  assert.equal(readAskVerdict(depart(), MAINTENANT), "ask");
});

test("PIEGE 1, LA RAFALE : un depart trop vieux ne recoit RIEN", () => {
  // Le jour ou on branche le cron, la table peut contenir des departs
  // anciens. Sans borne d'age, tout le monde recoit un email le meme
  // matin, dont des gens partis depuis des semaines. Ca se voit
  // publiquement et ca ne se rattrape pas.
  const vieux = depart({
    cancelled_at: new Date(MAINTENANT.getTime() - (MAX_AGE_JOURS + 1) * JOUR).toISOString(),
  });
  assert.equal(readAskVerdict(vieux, MAINTENANT), "too-old");
});

test("PIEGE 2, LE DOUBLE ENVOI : une ligne deja demandee est ecartee", () => {
  const deja = depart({ asked_at: "2026-08-20T09:00:00Z" });
  assert.equal(readAskVerdict(deja, MAINTENANT), "already-asked");
});

test("PIEGE 3, ELLE EST REVENUE : on ne lui ecrit pas", () => {
  // C'est le pire des quatre. Elle a annule sa resiliation, elle paie de
  // nouveau, et elle recoit "pourquoi tu es partie ?". Ca donne
  // l'impression que personne ne regarde.
  const revenue = depart({ reactivated_at: "2026-08-21T08:00:00Z" });
  assert.equal(readAskVerdict(revenue, MAINTENANT), "came-back");
});

test("PIEGE 4 : elle a DEJA ECRIT, on ne redemande pas", () => {
  // Quand elle resilie depuis le portail Stripe, Stripe lui laisse
  // ecrire un commentaire. Si elle a pris la peine de le faire, lui
  // redemander revient a dire qu'on ne l'a pas lue.
  assert.equal(
    readAskVerdict(depart({ stripe_comment: "trop cher pour mon usage" }), MAINTENANT),
    "already-told",
  );
  assert.equal(readAskVerdict(depart({ reason: "j'ai fini mon projet" }), MAINTENANT), "already-told");
});

test("mais une simple case cochee ne suffit PAS, on ecrit quand meme", () => {
  // "trop cher" ne dit pas ce qui manquait. La nuance est assumee :
  // une raison toute faite n'est pas une reponse.
  const cochee = depart({ stripe_comment: null, reason: null }) as ChurnAskRow & {
    stripe_feedback?: string;
  };
  cochee.stripe_feedback = "too_expensive";
  assert.equal(readAskVerdict(cochee, MAINTENANT), "ask");
});

test("on n'ecrit pas dans la seconde du clic", () => {
  const fraiche = depart({
    cancelled_at: new Date(MAINTENANT.getTime() - (MIN_DELAI_HEURES - 1) * HEURE).toISOString(),
  });
  assert.equal(readAskVerdict(fraiche, MAINTENANT), "too-soon");
});

test("une date DANS LE FUTUR compte comme trop recente, pas comme bonne", () => {
  // Une horloge decalee ou un import mal date ne doit pas declencher un
  // envoi : on attend plutot que d'ecrire sur une donnee qu'on ne sait
  // pas lire.
  const futur = depart({ cancelled_at: new Date(MAINTENANT.getTime() + 5 * JOUR).toISOString() });
  assert.equal(readAskVerdict(futur, MAINTENANT), "too-soon");
});

test("sans adresse et sans date, on ne fabrique rien", () => {
  assert.equal(readAskVerdict(depart({ email: "  " }), MAINTENANT), "no-email");
  assert.equal(readAskVerdict(depart({ cancelled_at: null }), MAINTENANT), "no-date");
  assert.equal(readAskVerdict(depart({ cancelled_at: "pas une date" }), MAINTENANT), "no-date");
});

test("l'ordre des refus dit la VRAIE raison", () => {
  // Quelqu'un qui est revenu ET a qui on a deja ecrit : c'est
  // "already-asked" qui compte, parce que c'est ce qui empeche l'envoi.
  // Un journal qui dit "trop tot" sur une personne revenue enverrait
  // chercher au mauvais endroit.
  const les_deux = depart({ asked_at: "2026-08-20T00:00:00Z", reactivated_at: "2026-08-20T00:00:00Z" });
  assert.equal(readAskVerdict(les_deux, MAINTENANT), "already-asked");
});

test("LA FILE EST BORNEE : pas de rafale chez le fournisseur", () => {
  // Une rafale se traduit par des messages refuses qu'on croirait
  // envoyes. Le reste attend demain, ce qui ne coute rien.
  const beaucoup = Array.from({ length: MAX_PAR_PASSAGE + 25 }, (_, i) =>
    depart({ id: `c${i}`, email: `p${i}@x.fr` }),
  );
  const { aEcrire, ecartes } = buildAskQueue(beaucoup, MAINTENANT);
  assert.equal(aEcrire.length, MAX_PAR_PASSAGE);
  // Le compteur dit la VERITE : tous etaient eligibles, on en a garde 40.
  assert.equal(ecartes.ask, MAX_PAR_PASSAGE + 25);
});

test("la file compte ce qu'elle ecarte, et pourquoi", () => {
  const { aEcrire, ecartes } = buildAskQueue(
    [
      depart({ id: "a" }),
      depart({ id: "b", reactivated_at: "2026-08-21T00:00:00Z" }),
      depart({ id: "c", asked_at: "2026-08-20T00:00:00Z" }),
      depart({ id: "d", email: null }),
    ],
    MAINTENANT,
  );
  assert.deepEqual(aEcrire.map((r) => r.id), ["a"]);
  assert.equal(ecartes["came-back"], 1);
  assert.equal(ecartes["already-asked"], 1);
  assert.equal(ecartes["no-email"], 1);
});

// ── LE LIEN DE REPONSE : il autorise une ECRITURE ──

const SECRET = "un-secret-de-plus-de-seize-caracteres";

test("SECURITE : un jeton forge ne passe pas", () => {
  // Si le lien portait l'identifiant en clair, n'importe qui pourrait
  // ecrire dans le depart de n'importe qui. Un identifiant n'est pas un
  // secret : il traverse des journaux et des historiques.
  const vrai = signChurnToken("8f3c-0001", SECRET)!;
  assert.equal(readChurnToken(vrai, SECRET), "8f3c-0001");

  // Meme identifiant, signature bricolee.
  const [partie] = vrai.split(".");
  assert.equal(readChurnToken(`${partie}.aaaa`, SECRET), null);
  assert.equal(readChurnToken(`${partie}.`, SECRET), null);
  assert.equal(readChurnToken(partie, SECRET), null, "sans signature du tout");
});

test("SECURITE : un jeton signe avec un AUTRE secret ne passe pas", () => {
  const autre = signChurnToken("8f3c-0001", "un-autre-secret-tres-long-aussi")!;
  assert.equal(readChurnToken(autre, SECRET), null);
});

test("SECURITE : on ne peut pas deplacer une signature sur un autre depart", () => {
  // La signature porte l'identifiant : recopier la signature de A sur
  // l'identifiant de B doit echouer.
  const a = signChurnToken("depart-A", SECRET)!;
  const sigA = a.split(".")[1];
  const b = signChurnToken("depart-B", SECRET)!;
  const idB = b.split(".")[0];
  assert.equal(readChurnToken(`${idB}.${sigA}`, SECRET), null);
});

test("SANS SECRET, on ne signe rien et on n'accepte rien", () => {
  // L'absence FERME. Un lien non signe ne doit jamais etre un repli :
  // ce serait une porte ouverte le jour ou une variable disparait.
  assert.equal(signChurnToken("x", null), null);
  assert.equal(readChurnToken("nimporte.quoi", null), null);
  assert.equal(signChurnToken("", SECRET), null);
});

test("un secret trop court ne signe pas", () => {
  assert.equal(readChurnSecret({ CRON_SECRET: "court" }), null);
  assert.equal(readChurnSecret({}), null);
  assert.equal(readChurnSecret({ CRON_SECRET: SECRET }), SECRET);
  // Un secret dedie passe devant, si un jour on veut le separer.
  assert.equal(
    readChurnSecret({ CHURN_TOKEN_SECRET: "un-secret-dedie-assez-long", CRON_SECRET: SECRET }),
    "un-secret-dedie-assez-long",
  );
});

test("un jeton survit a un identifiant avec des caracteres speciaux", () => {
  for (const id of ["8f3c-0001", "a/b+c=d", "éàü", "x".repeat(200)]) {
    const t = signChurnToken(id, SECRET)!;
    assert.equal(readChurnToken(t, SECRET), id, id.slice(0, 20));
    // Et le jeton reste utilisable dans une URL.
    assert.ok(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t), `jeton non URL-safe pour ${id.slice(0, 12)}`);
  }
});

// ── L'EMAIL ──

test("l'email respecte les regles d'ecriture de Bene", () => {
  const { subject, html, text } = buildChurnAskContent({
    prenom: "Gwenn",
    lien: "https://quiz.tipote.com/depart/abc.def",
  });
  // Zero tiret cadratin, jamais, sous aucun pretexte.
  assert.ok(!/[—–]/.test(subject + text), "un tiret cadratin s'est glisse dedans");
  assert.ok(text.includes("Gwenn"), "le lecteur a un prenom");
  assert.ok(text.trim().endsWith("pas dans six mois."), "le PS ferme l'email");
  assert.ok(text.includes("Béné"), "elle signe");
  assert.ok(text.includes("https://quiz.tipote.com/depart/abc.def"), "le lien doit etre lisible en texte");
});

test("l'email ne cherche PAS a la faire revenir", () => {
  // Quelqu'un qui vient de partir et qui recoit une offre comprend
  // qu'on ne l'ecoutait pas, on l'ecoutait payer.
  const { text } = buildChurnAskContent({ prenom: null, lien: "https://x.fr/depart/a.b" });
  for (const mot of ["remise", "réduction", "offre", "reviens", "es-tu sûr"]) {
    assert.ok(!text.toLowerCase().includes(mot), `l'email contient "${mot}"`);
  }
});

test("le lien est echappe dans le HTML", () => {
  // Ce lien finit dans un href. Il vient de chez nous, mais une adresse
  // qui traverse un attribut sans etre echappee est une habitude qui
  // finit par couter cher ailleurs.
  const { html } = buildChurnAskContent({
    prenom: null,
    lien: 'https://x.fr/depart/a.b"><script>alert(1)</script>',
  });
  assert.ok(!html.includes("<script>"), "une balise a traverse l'attribut");
  assert.ok(html.includes("&quot;"), "les guillemets ne sont pas echappes");
});

test("un prenom absent ne produit pas un 'Hey null'", () => {
  const { text } = buildChurnAskContent({ prenom: null, lien: "https://x.fr/a" });
  assert.ok(text.startsWith("Hey 👋"), text.slice(0, 30));
  assert.ok(!text.includes("null"));
});

// ── LES GARDE-FOUS DE STRUCTURE ──

test("le cron RESERVE avant d'envoyer, et c'est la base qui tranche", () => {
  // Un `select` puis un `update` ne protege de rien : deux passages
  // lisent la meme ligne avant que l'un des deux n'ecrive. Seul un
  // UPDATE conditionnel est atomique.
  const src = fs.readFileSync(
    path.join(process.cwd(), "app/api/cron/churn-ask/route.ts"),
    "utf8",
  );
  // On assert sur la PROPRIETE, pas sur la mise en forme : une assertion
  // qui exige des espaces et des retours a la ligne exacts rougit au
  // premier reformatage, donc pour la mauvaise raison, donc elle finit
  // par etre desactivee. Ce qui compte : un UPDATE qui pose `asked_at`,
  // conditionne a `asked_at is null`, et qui rend la ligne prise, le tout
  // AVANT l'envoi.
  const iUpdate = src.indexOf("asked_at: maintenant.toISOString()");
  const iCondition = src.indexOf('.is("asked_at", null)', iUpdate);
  const iRendu = src.indexOf('.select("id")', iCondition);
  const iEnvoi = src.indexOf("sendChurnAskEmail(");
  assert.ok(iUpdate > 0, "plus aucun UPDATE ne pose asked_at");
  assert.ok(iCondition > iUpdate, "la reservation n'est plus conditionnelle : double envoi possible");
  assert.ok(iRendu > iCondition, "sans .select(), on ne sait pas si on a gagne la ligne");
  assert.ok(iEnvoi > iRendu, "on envoie AVANT de reserver : double envoi possible");
  assert.ok(
    src.includes('.is("reactivated_at", null)'),
    "le deuxieme verrou (elle est revenue entre temps) a saute",
  );
});

test("la page de depart passe la porte du middleware", () => {
  // Sans cette ligne, quelqu'un qui vient de resilier serait renvoye
  // vers /login pour repondre a une question qu'on lui pose. On n'aurait
  // aucune reponse, et on ne saurait jamais pourquoi.
  const mw = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.ok(mw.includes('pathname.startsWith("/depart/")'), "la page est fermee par le middleware");
});

test("la route d'ecriture n'accepte QUE la raison", () => {
  // Un jeton autorise une seule chose. Une route qui en autorise plus
  // que necessaire finit par servir a autre chose.
  const src = fs.readFileSync(path.join(process.cwd(), "app/api/depart/route.ts"), "utf8");
  const update = src.slice(src.indexOf(".update({"), src.indexOf(".eq(\"id\", id)"));
  for (const colonne of ["email", "cancelled_at", "amount_cents", "plan"]) {
    assert.ok(!update.includes(colonne), `la route peut ecrire ${colonne}`);
  }
  assert.ok(update.includes("reason:"), "elle n'ecrit plus la raison");
});
