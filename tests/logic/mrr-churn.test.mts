// tests/logic/mrr-churn.test.mts
//
// LE MRR ET LE CHURN (Béné, 27 août 2026).
//
// "Oui je veux mon MRR et mon churn facilement trouvables."
//
// L'écran montrait déjà l'ENCAISSÉ mois par mois, et ce n'est pas la
// même chose : un annuel à 170 € et dix mensuels à 17 € font le même
// encaissement le mois où ils tombent, et pas du tout la même santé.
//
// Ce que ce test protège en priorité, ce sont les REFUS. Un tableau de
// bord ment surtout par les chiffres qu'il accepte de calculer :
//   - un partant compté comme du récurrent gonfle le MRR ;
//   - un accès à vie compté comme du récurrent invente de l'argent ;
//   - un taux de churn sur 3 personnes commente des individus ;
//   - un palier qu'on ne sait pas chiffrer, exclu en SILENCE, est un
//     trou qu'on ne peut plus expliquer six mois plus tard.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BASE_MIN_CHURN,
  buildMrr,
  finAbonnement,
  mrrParPlanCents,
  premierPaiement,
  serieChurn,
} from "@/lib/admin/mrr";
import type { Person } from "@/lib/admin/people";

type Vente = { paidAt: string; refundedAt?: string | null };

function personne(p: {
  plan: string;
  status: Person["status"];
  sales?: Vente[];
  churn?: { cancelledAt?: string | null; endsAt?: string | null; endedAt?: string | null } | null;
}): Person {
  return {
    plan: p.plan,
    status: p.status,
    sales: (p.sales ?? []) as unknown as Person["sales"],
    churn: (p.churn ?? null) as unknown as Person["churn"],
  } as unknown as Person;
}

// ── LES PRIX VIENNENT DU CATALOGUE ───────────────────────────────────

test("l'annuel est ramené au mois, c'est la définition du MRR", () => {
  const prix = mrrParPlanCents();
  assert.equal(prix.monthly, 1700);
  assert.equal(prix.monthly_plus, 2900);
  assert.equal(prix.yearly, Math.round(17000 / 12));
  assert.equal(prix.yearly_plus, Math.round(29000 / 12));
});

// ── CE QUI COMPTE, ET CE QUI NE COMPTE PAS ───────────────────────────

test("le MRR additionne les abonnements qui vont se renouveler", () => {
  const v = buildMrr([
    personne({ plan: "monthly", status: "abonne" }),
    personne({ plan: "monthly", status: "abonne" }),
    personne({ plan: "yearly", status: "abonne" }),
  ]);
  assert.equal(v.cents, 1700 + 1700 + Math.round(17000 / 12));
  assert.equal(v.abonnes, 3);
});

test("un partant n'est PAS du récurrent, il est compté à part", () => {
  // Il paie encore jusqu'à la fin de sa période et ne se renouvellera
  // pas : le compter gonfle le chiffre, l'ignorer fait croire qu'il est
  // déjà parti. On rend les deux.
  const v = buildMrr([
    personne({ plan: "monthly", status: "abonne" }),
    personne({ plan: "monthly_plus", status: "partant" }),
  ]);
  assert.equal(v.cents, 1700);
  assert.equal(v.enSursisCents, 2900);
  assert.equal(v.abonnes, 1);
  assert.equal(v.partants, 1);
});

test("un accès à vie n'invente pas de revenu récurrent", () => {
  const v = buildMrr([personne({ plan: "lifetime", status: "avie" })]);
  assert.equal(v.cents, 0);
  assert.equal(v.abonnes, 0);
});

test("un essai gratuit ou un parti ne comptent pas", () => {
  const v = buildMrr([
    personne({ plan: "free", status: "essai" }),
    personne({ plan: "monthly", status: "parti" }),
  ]);
  assert.equal(v.cents, 0);
});

test("un palier qu'on ne sait pas chiffrer est EXCLU et NOMMÉ", () => {
  // Le silence serait le vrai défaut : un abonné qui disparaît du total
  // sans un mot est un écart qu'on ne peut plus expliquer.
  const v = buildMrr([
    personne({ plan: "monthly", status: "abonne" }),
    personne({ plan: "ancien_palier", status: "abonne" }),
  ]);
  assert.equal(v.cents, 1700);
  assert.deepEqual(v.nonChiffrables, [{ plan: "ancien_palier", personnes: 1 }]);
});

// ── LES DATES QUI BORNENT UN ABONNEMENT ──────────────────────────────

test("une vente remboursée n'a jamais commencé un abonnement", () => {
  const p = personne({
    plan: "monthly",
    status: "abonne",
    sales: [
      { paidAt: "2026-05-10T00:00:00Z" },
      { paidAt: "2026-03-01T00:00:00Z", refundedAt: "2026-03-05T00:00:00Z" },
    ],
  });
  assert.equal(premierPaiement(p), "2026-05-10T00:00:00Z");
});

test("la fin est la date réelle, jamais la demande d'annulation", () => {
  // Quelqu'un qui annule le 2 août avec un mois payé jusqu'au 30 est
  // encore abonné en août. Prendre `cancelledAt` le ferait sortir un
  // mois trop tôt, donc gonflerait le churn du mois en cours.
  assert.equal(
    finAbonnement(personne({
      plan: "monthly", status: "partant",
      churn: { cancelledAt: "2026-08-02T00:00:00Z", endsAt: "2026-08-30T00:00:00Z" },
    })),
    "2026-08-30T00:00:00Z",
  );
  assert.equal(
    finAbonnement(personne({
      plan: "monthly", status: "parti",
      churn: { cancelledAt: "2026-07-01T00:00:00Z", endsAt: "2026-07-31T00:00:00Z", endedAt: "2026-07-31T00:00:00Z" },
    })),
    "2026-07-31T00:00:00Z",
  );
  assert.equal(finAbonnement(personne({ plan: "monthly", status: "abonne" })), null);
});

// ── LE CHURN, ET SON REFUS DE CALCULER ───────────────────────────────

function abonneDepuis(debut: string, fin?: string): Person {
  return personne({
    plan: "monthly",
    status: fin ? "parti" : "abonne",
    sales: [{ paidAt: debut }],
    churn: fin ? { endedAt: fin } : null,
  });
}

test("la base est l'effectif au PREMIER jour du mois", () => {
  const gens = [
    abonneDepuis("2026-06-01T00:00:00Z"),            // là avant juillet
    abonneDepuis("2026-07-15T00:00:00Z"),            // arrivé EN juillet
  ];
  const [juillet] = serieChurn(gens, ["2026-07"]);
  assert.equal(juillet.base, 1);      // le nouveau n'est pas dans la base
  assert.equal(juillet.nouveaux, 1);
});

test("un départ tombe dans le mois de sa date de fin", () => {
  const gens = Array.from({ length: 20 }, () => abonneDepuis("2026-01-01T00:00:00Z"));
  gens.push(abonneDepuis("2026-01-01T00:00:00Z", "2026-07-20T00:00:00Z"));
  const [juillet] = serieChurn(gens, ["2026-07"]);
  assert.equal(juillet.base, 21);
  assert.equal(juillet.partis, 1);
  assert.equal(juillet.tauxPct, 4.8);
});

test("sous le seuil, le taux n'est pas calculé, et ce n'est PAS zéro", () => {
  // Un départ sur trois personnes ferait 33 %, ce qui ne dit rien.
  const gens = [
    abonneDepuis("2026-01-01T00:00:00Z"),
    abonneDepuis("2026-01-01T00:00:00Z"),
    abonneDepuis("2026-01-01T00:00:00Z", "2026-07-10T00:00:00Z"),
  ];
  const [juillet] = serieChurn(gens, ["2026-07"]);
  assert.ok(juillet.base < BASE_MIN_CHURN);
  assert.equal(juillet.partis, 1);
  assert.equal(juillet.tauxPct, null);
});

test("un mois sans aucun payant ne produit pas un taux inventé", () => {
  const [m] = serieChurn([], ["2026-07"]);
  assert.equal(m.base, 0);
  assert.equal(m.tauxPct, null);
});

test("quelqu'un qui n'a jamais payé n'entre dans aucun effectif", () => {
  const gratuit = personne({ plan: "free", status: "essai", sales: [] });
  const [m] = serieChurn([gratuit], ["2026-07"]);
  assert.equal(m.base, 0);
  assert.equal(m.nouveaux, 0);
});
