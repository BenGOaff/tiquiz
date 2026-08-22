// tests/logic/admin-stats.test.mts
//
// L'ONGLET STATISTIQUES, ET SA SEULE PROMESSE : ne jamais dessiner un
// chiffre faux.
//
// Béné, 22 août : "un onglet statistiques aussi pour suivre mes ventes,
// visuellement (uniquement de manière fiable aussi...)".
//
// Le cas qui compte est le dernier de ce fichier : le 22 août, 47 ventes
// bien réelles s'affichaient à 0,00 € parce que Systeme.io ne nous
// transmet pas le montant. Une courbe de chiffre d'affaires plate à zéro
// se lit "je ne vends rien" au lieu de "je ne connais pas les montants",
// et c'est pire qu'une absence de courbe : ça a l'air juste.

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  buildAdminStats,
  derniersMois,
  moisDe,
  moisLabel,
  repartitionParPlan,
  serieEncaissee,
  serieParMois,
} from "../../lib/admin/adminStats.ts";
import { readClientKind } from "../../lib/admin/people.ts";

const AOUT = new Date("2026-08-22T10:00:00Z");

function vente(over: Record<string, unknown> = {}) {
  return {
    ref: `r${Math.round(Number(over.amountCents ?? 0))}-${String(over.paidAt ?? "")}`,
    provider: "systeme_io",
    email: "a@b.fr",
    name: null,
    productId: "monthly",
    amountCents: 1700,
    // Par defaut : une somme reellement encaissee. Les cas "on ne
    // connait pas le montant" le disent explicitement.
    amountSource: "payload",
    currency: "eur",
    paidAt: "2026-08-03T09:00:00Z",
    refundedAt: null,
    ...over,
  } as never;
}

function personne(over: Record<string, unknown> = {}) {
  return {
    email: "a@b.fr",
    name: null,
    userId: "u1",
    hasTiquizAccount: true,
    plan: "monthly",
    status: "abonne",
    createdAt: "2026-08-01T09:00:00Z",
    lastSignIn: null,
    quizCount: 0,
    leadCount: 0,
    resellerName: null,
    selfServe: false,
    paidCents: 0,
    sales: [],
    lastProvider: null,
    lastPaidAt: null,
    atelier: null,
    churn: null,
    ...over,
  } as never;
}

test("la fenetre est de 12 mois, du plus ancien au plus recent", () => {
  const mois = derniersMois(AOUT, 12);
  assert.equal(mois.length, 12);
  assert.equal(mois[0], "2025-09");
  assert.equal(mois[11], "2026-08");
});

test("la fenetre traverse le changement d'annee sans se decaler", () => {
  assert.deepEqual(derniersMois(new Date("2026-02-05T00:00:00Z"), 4), [
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
  ]);
});

test("chaque date tombe dans son mois", () => {
  const serie = serieParMois(
    [
      "2026-08-01T00:00:00Z",
      "2026-08-31T23:00:00Z",
      "2026-07-15T00:00:00Z",
      "2026-06-01T00:00:00Z",
    ],
    AOUT,
    3,
  );
  assert.deepEqual(serie.points, [
    { mois: "2026-06", valeur: 1 },
    { mois: "2026-07", valeur: 1 },
    { mois: "2026-08", valeur: 2 },
  ]);
  assert.equal(serie.total, 4);
});

test("une date hors fenetre ne compte pas, et n'est pas signalee comme perdue", () => {
  // Elle est juste hors cadre : la signaler ferait un avertissement
  // permanent sur tout historique un peu ancien.
  const serie = serieParMois(["2024-01-01T00:00:00Z"], AOUT, 3);
  assert.equal(serie.total, 0);
  assert.equal(serie.sansDate, 0);
});

test("une ligne SANS date est comptee a part, jamais avalee", () => {
  // Sinon la somme des barres est inferieure au total reel et rien ne
  // l'explique : c'est la mecanique du funnel fantome d'Adeline.
  const serie = serieParMois([null, "pas une date", "2026-08-02T00:00:00Z"], AOUT, 2);
  assert.equal(serie.total, 1);
  assert.equal(serie.sansDate, 2);
});

test("UNE SEULE vente sans montant suffit a retirer la courbe des euros", () => {
  const serie = serieEncaissee(
    [
      vente({ amountCents: 1700, paidAt: "2026-08-03T09:00:00Z" }),
      vente({ amountCents: 1700, amountSource: "plan", paidAt: "2026-08-04T09:00:00Z" }),
    ],
    AOUT,
    3,
  );
  assert.equal(serie.fiable, false);
  if (serie.fiable) return;
  assert.equal(serie.raison, "montants-absents");
  assert.equal(serie.concernees, 1);
});

test("quand tous les montants sont la, la courbe revient d'elle meme", () => {
  // La regle regarde la DONNEE, elle n'est pas cablee sur une date : le
  // jour ou Systeme.io nous transmettra le montant, rien a rebrancher.
  const serie = serieEncaissee(
    [
      vente({ amountCents: 1700, paidAt: "2026-08-03T09:00:00Z" }),
      vente({ amountCents: 1700, paidAt: "2026-08-04T09:00:00Z" }),
      vente({ amountCents: 9000, paidAt: "2026-07-04T09:00:00Z" }),
    ],
    AOUT,
    3,
  );
  assert.equal(serie.fiable, true);
  if (!serie.fiable) return;
  assert.deepEqual(serie.points, [
    { mois: "2026-06", valeur: 0 },
    { mois: "2026-07", valeur: 9000 },
    { mois: "2026-08", valeur: 3400 },
  ]);
  assert.equal(serie.total, 12400);
});

test("une vente remboursee ne fait pas de chiffre d'affaires, et n'est pas un trou", () => {
  const serie = serieEncaissee(
    [
      vente({ amountCents: 4700, paidAt: "2026-08-03T09:00:00Z", refundedAt: "2026-08-20T09:00:00Z" }),
      vente({ amountCents: 1700, paidAt: "2026-08-04T09:00:00Z" }),
    ],
    AOUT,
    2,
  );
  assert.equal(serie.fiable, true);
  if (!serie.fiable) return;
  assert.equal(serie.total, 1700);
});

test("aucune vente n'est pas une panne", () => {
  const serie = serieEncaissee([], AOUT, 6);
  assert.equal(serie.fiable, false);
  if (serie.fiable) return;
  assert.equal(serie.raison, "aucune-donnee");
});

test("la repartition par palier ignore ceux qui n'ont pas de compte Tiquiz", () => {
  // Un eleve de l'Atelier sans compte n'a pas de palier : le ranger en
  // "free" gonflerait le gratuit d'un chiffre qui ne veut rien dire.
  const plans = repartitionParPlan([
    personne({ plan: "monthly" }),
    personne({ email: "b@b.fr", plan: "monthly" }),
    personne({ email: "c@b.fr", plan: "free" }),
    personne({ email: "d@b.fr", hasTiquizAccount: false, plan: "free" }),
  ]);
  assert.deepEqual(plans, [
    { plan: "monthly", count: 2 },
    { plan: "free", count: 1 },
  ]);
});

test("cliente chez Tiquiz, chez l'Atelier, ou les deux", () => {
  const cas: [Record<string, unknown>, string][] = [
    [{ hasTiquizAccount: true, plan: "monthly", atelier: null }, "tiquiz"],
    [{ hasTiquizAccount: true, plan: "monthly", atelier: { status: "active" } }, "les-deux"],
    [{ hasTiquizAccount: false, plan: "free", atelier: { status: "active" } }, "atelier"],
    // Compte gratuit sans Atelier : cliente de rien, et le dire est
    // juste. La confondre avec "Tiquiz" gonflerait la clientele payante.
    [{ hasTiquizAccount: true, plan: "free", atelier: null }, "aucun"],
    // Ancien eleve : le statut n'est plus actif, elle n'est plus cliente.
    [{ hasTiquizAccount: true, plan: "free", atelier: { status: "revoked" } }, "aucun"],
  ];
  for (const [p, attendu] of cas) {
    assert.equal(
      readClientKind(p as Parameters<typeof readClientKind>[0]),
      attendu,
      JSON.stringify(p),
    );
  }
});

test("buildAdminStats assemble tout sans jamais lire l'horloge lui meme", () => {
  const stats = buildAdminStats(
    [
      personne({
        createdAt: "2026-08-01T09:00:00Z",
        quizCount: 3,
        leadCount: 40,
        sales: [vente({ amountCents: 1700, amountSource: "plan", paidAt: "2026-08-03T09:00:00Z" })],
      }),
      personne({
        email: "b@b.fr",
        createdAt: "2026-07-01T09:00:00Z",
        quizCount: 1,
        leadCount: 2,
        churn: { cancelledAt: "2026-08-10T09:00:00Z", endsAt: null, endedAt: null, feedback: null, comment: null },
      }),
    ],
    AOUT,
    3,
  );
  assert.deepEqual(stats.mois, ["2026-06", "2026-07", "2026-08"]);
  assert.equal(stats.comptesCrees.total, 2);
  assert.equal(stats.ventes.total, 1);
  assert.equal(stats.departs.total, 1);
  assert.equal(stats.quiz, 4);
  assert.equal(stats.leads, 42);
  // La vente existe et compte ; son MONTANT, lui, n'est pas dessine.
  assert.equal(stats.encaisse.fiable, false);
});

test("moisDe et moisLabel ne s'affolent pas sur une valeur illisible", () => {
  assert.equal(moisDe(null), null);
  assert.equal(moisDe("bientot"), null);
  assert.equal(moisDe("2026-08-22T10:00:00Z"), "2026-08");
  assert.equal(moisLabel("pas-un-mois"), "pas-un-mois");
  assert.match(moisLabel("2026-08"), /26/);
});
