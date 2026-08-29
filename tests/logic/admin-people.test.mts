// tests/logic/admin-people.test.mts
//
// "TU PEUX PAS CENTRALISER ?" (Béné, 21 août 2026.)
//
// "Je vois les élèves, leurs infos + le bouton rembourser ? Au lieu
// d'avoir deux écrans... pas ouf..." Puis la liste complète : qui teste
// en gratos, qui achète, quels plans sont vendus, qui est abonné, qui a
// arrêté son abo, les modes de paiement, le suivi des ventes.
//
// Recoller les trois sources (comptes, ventes, départs) est une règle
// métier, pas de l'affichage. Ces tests portent sur les cas tordus qui
// arrivent en vrai, et qui feraient mentir l'écran :
//
//   - une vente dont l'adresse ne correspond à aucun compte ;
//   - quelqu'un qui a résilié mais dont l'accès court encore ;
//   - deux départs pour la même personne ;
//   - un remboursement, qui ne doit compter ni dans son total ni dans
//     le chiffre d'affaires.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPeople,
  monthlyTrend,
  readPersonStatus,
  type ChurnRow,
  type ProfileRow,
} from "../../lib/admin/people.ts";
import type { Sale } from "../../lib/checkout/sales.ts";

function compte(email: string, plan = "free", extra: Partial<ProfileRow> = {}): ProfileRow {
  return { user_id: `u_${email}`, email, plan, created_at: "2026-01-01T00:00:00Z", ...extra };
}

function vente(email: string | null, extra: Partial<Sale> = {}): Sale {
  return {
    ref: extra.ref ?? `pi_${Math.abs(String(email).length)}_${extra.paidAt ?? "x"}`,
    provider: "stripe",
    email,
    name: null,
    productId: "mensuel",
    amountCents: 1700,
    amountSource: "payload",
    currency: "eur",
    paidAt: "2026-08-01T10:00:00Z",
    refundedAt: null,
    ...extra,
  };
}

test("QUI TESTE EN GRATOS : un compte sans vente apparait quand meme", () => {
  // On SEED sur les comptes, jamais sur les paiements. Partir des ventes
  // ferait disparaitre de l'ecran tous ceux qui n'ont jamais paye, c'est
  // a dire la premiere ligne de sa liste.
  const v = buildPeople({ profiles: [compte("gratos@x.fr")], sales: [], churn: [] });
  assert.equal(v.people.length, 1);
  assert.equal(v.people[0].status, "essai");
  assert.equal(v.totals.essai, 1);
});

test("L'ARGENT EST ENTRE ET PERSONNE EN FACE : la vente ressort", () => {
  // C'est le drame Ivan. Un tableau propre qui ecarte ca en silence
  // coute un client : chaque ligne orpheline est une action a faire.
  const v = buildPeople({
    profiles: [compte("connue@x.fr")],
    sales: [vente("inconnue@x.fr"), vente("connue@x.fr")],
    churn: [],
  });
  assert.equal(v.ventesOrphelines.length, 1);
  assert.equal(v.ventesOrphelines[0].email, "inconnue@x.fr");
  // Et on n'a PAS invente une personne a partir de la vente.
  assert.equal(v.people.length, 1);
});

test("l'adresse est rapprochee sans se soucier de la casse", () => {
  const v = buildPeople({
    profiles: [compte("Bene@X.fr", "monthly")],
    sales: [vente("bene@x.fr")],
    churn: [],
  });
  assert.equal(v.ventesOrphelines.length, 0);
  assert.equal(v.people[0].paidCents, 1700);
});

test("IL A RESILIE MAIS IL EST ENCORE LA : statut partant, pas abonne", () => {
  // L'ordre de lecture compte. Lire le plan d'abord le rangerait dans
  // "abonne" (il l'est encore, il a paye sa periode) et Bene ne verrait
  // jamais qu'il s'en va, donc n'aurait jamais l'occasion de le retenir.
  const c: ChurnRow = {
    email: "part@x.fr",
    cancelled_at: "2026-08-20T09:00:00Z",
    ends_at: "2026-09-03T00:00:00Z",
    stripe_feedback: "too_expensive",
  };
  const v = buildPeople({ profiles: [compte("part@x.fr", "monthly")], sales: [], churn: [c] });
  assert.equal(v.people[0].status, "partant");
  assert.equal(v.people[0].churn?.endsAt, "2026-09-03T00:00:00Z");
  assert.equal(v.people[0].churn?.feedback, "too_expensive");
  assert.equal(v.totals.partants, 1);
  assert.equal(v.totals.abonnes, 0);
});

test("il est vraiment parti : statut parti", () => {
  const v = buildPeople({
    profiles: [compte("parti@x.fr", "free")],
    sales: [],
    churn: [{ email: "parti@x.fr", cancelled_at: "2026-07-01T00:00:00Z", ended_at: "2026-08-01T00:00:00Z" }],
  });
  assert.equal(v.people[0].status, "parti");
  assert.equal(v.totals.partis, 1);
});

test("il a annule sa resiliation : il redevient un abonne ordinaire", () => {
  // Sans ce cas, quelqu'un qui a failli partir resterait marque comme
  // partant pour toujours, et le tableau de bord annoncerait une perte
  // qui n'a pas eu lieu.
  const v = buildPeople({
    profiles: [compte("revenu@x.fr", "yearly")],
    sales: [],
    churn: [
      {
        email: "revenu@x.fr",
        cancelled_at: "2026-08-01T00:00:00Z",
        reactivated_at: "2026-08-05T00:00:00Z",
      },
    ],
  });
  assert.equal(v.people[0].status, "abonne");
  assert.equal(v.totals.abonnes, 1);
});

test("DEUX DEPARTS pour la meme personne : on garde le plus recent", () => {
  // Elle part, elle revient, elle repart. Garder le premier annoncerait
  // un depart vieux d'un an sur quelqu'un qui vient de repartir.
  const v = buildPeople({
    profiles: [compte("yoyo@x.fr", "monthly")],
    sales: [],
    churn: [
      { email: "yoyo@x.fr", cancelled_at: "2025-01-01T00:00:00Z", ended_at: "2025-02-01T00:00:00Z" },
      { email: "yoyo@x.fr", cancelled_at: "2026-08-20T00:00:00Z", ends_at: "2026-09-01T00:00:00Z" },
    ],
  });
  assert.equal(v.people[0].status, "partant");
  assert.equal(v.people[0].churn?.cancelledAt, "2026-08-20T00:00:00Z");
});

test("le lifetime n'est PAS un abonnement a suivre", () => {
  for (const plan of ["lifetime", "beta"]) {
    const v = buildPeople({ profiles: [compte(`${plan}@x.fr`, plan)], sales: [], churn: [] });
    assert.equal(v.people[0].status, "avie", plan);
  }
  assert.equal(
    readPersonStatus({
      hasTiquizAccount: true,
      plan: "LIFETIME",
      churn: null,
      essaiPlusJusquA: null,
      maintenant: new Date("2026-08-29T12:00:00Z"),
    }),
    "avie",
    "la casse ne doit pas changer le verdict",
  );
});

test("UN REMBOURSEMENT ne compte ni dans son total ni dans le CA", () => {
  const v = buildPeople({
    profiles: [compte("rb@x.fr", "monthly")],
    sales: [
      vente("rb@x.fr", { ref: "pi_1", paidAt: "2026-08-01T00:00:00Z" }),
      vente("rb@x.fr", { ref: "pi_2", paidAt: "2026-08-10T00:00:00Z", refundedAt: "2026-08-11T00:00:00Z" }),
    ],
    churn: [],
  });
  assert.equal(v.people[0].paidCents, 1700, "le remboursement est compte comme garde");
  assert.equal(v.totals.encaisseCents, 1700);
  assert.equal(v.totals.rembourseCents, 1700);
  // Les deux ventes restent VISIBLES : c'est l'historique, et le bouton
  // rembourser vit dessus.
  assert.equal(v.people[0].sales.length, 2);
});

test("ses ventes sont triees, la plus recente d'abord", () => {
  const v = buildPeople({
    profiles: [compte("tri@x.fr", "monthly")],
    sales: [
      vente("tri@x.fr", { ref: "a", paidAt: "2026-06-01T00:00:00Z" }),
      vente("tri@x.fr", { ref: "c", paidAt: "2026-08-01T00:00:00Z" }),
      vente("tri@x.fr", { ref: "b", paidAt: "2026-07-01T00:00:00Z" }),
    ],
    churn: [],
  });
  assert.deepEqual(v.people[0].sales.map((s) => s.ref), ["c", "b", "a"]);
  assert.equal(v.people[0].lastPaidAt, "2026-08-01T00:00:00Z");
});

test("LE MODE DE PAIEMENT est celui de la derniere vente", () => {
  const v = buildPeople({
    profiles: [compte("mix@x.fr", "monthly")],
    sales: [
      vente("mix@x.fr", { ref: "a", provider: "stripe", paidAt: "2026-06-01T00:00:00Z" }),
      vente("mix@x.fr", { ref: "b", provider: "paypal", paidAt: "2026-08-01T00:00:00Z" }),
    ],
    churn: [],
  });
  assert.equal(v.people[0].lastProvider, "paypal");
});

test("QUELS PLANS SONT VENDUS", () => {
  const v = buildPeople({
    profiles: [compte("a@x.fr", "monthly"), compte("b@x.fr", "yearly")],
    sales: [
      vente("a@x.fr", { ref: "1", productId: "mensuel", amountCents: 1700 }),
      vente("b@x.fr", { ref: "2", productId: "annuel", amountCents: 17000 }),
      vente("b@x.fr", { ref: "3", productId: "annuel", amountCents: 17000, refundedAt: "2026-08-09T00:00:00Z" }),
    ],
    churn: [],
  });
  const annuel = v.totals.parProduit.find((p) => p.productId === "annuel");
  assert.equal(annuel?.count, 2, "les deux ventes annuelles sont comptees");
  assert.equal(annuel?.totalCents, 17000, "le remboursement ne fait pas de chiffre d'affaires");
  // Trie par montant : l'annuel devant le mensuel.
  assert.equal(v.totals.parProduit[0].productId, "annuel");
});

test("une vente d'un produit inconnu n'est pas perdue", () => {
  // Elle est comptee sous "inconnu" plutot qu'ecartee : une vente qu'on
  // ne sait pas nommer reste de l'argent qui est rentre.
  const v = buildPeople({
    profiles: [compte("x@x.fr", "monthly")],
    sales: [vente("x@x.fr", { productId: null })],
    churn: [],
  });
  assert.equal(v.totals.parProduit[0].productId, "inconnu");
});

test("le bouton carte ne s'affiche que pour un abonnement pris chez nous", () => {
  const avec = buildPeople({
    profiles: [compte("chez@x.fr", "monthly", { stripe_customer_id: "cus_1" })],
    sales: [],
    churn: [],
  });
  const sans = buildPeople({ profiles: [compte("sio@x.fr", "monthly")], sales: [], churn: [] });
  assert.equal(avec.people[0].selfServe, true);
  assert.equal(sans.people[0].selfServe, false);
});

test("un compte sans adresse ne cree pas de ligne fantome", () => {
  const v = buildPeople({
    profiles: [compte("vrai@x.fr"), { user_id: "u_vide", email: null, plan: "free" }],
    sales: [],
    churn: [],
  });
  assert.equal(v.people.length, 1);
});

// ── "Ca monte ou ca descend" ──

test("LE SUIVI DES VENTES compare, il ne donne pas un chiffre nu", () => {
  const maintenant = new Date("2026-08-21T12:00:00Z");
  const t = monthlyTrend(
    [
      vente("a@x.fr", { ref: "1", paidAt: "2026-08-05T00:00:00Z", amountCents: 2000 }),
      vente("a@x.fr", { ref: "2", paidAt: "2026-08-15T00:00:00Z", amountCents: 1000 }),
      vente("a@x.fr", { ref: "3", paidAt: "2026-07-10T00:00:00Z", amountCents: 1500 }),
    ],
    maintenant,
  );
  assert.equal(t.moisCents, 3000);
  assert.equal(t.moisPrecedentCents, 1500);
  assert.equal(t.ecartPct, 100);
});

test("sans mois precedent, on n'invente pas un ecart", () => {
  // "+100%" sur un premier mois serait un chiffre invente, et un chiffre
  // invente dans un tableau de bord vaut moins que pas de chiffre.
  const t = monthlyTrend(
    [vente("a@x.fr", { paidAt: "2026-08-05T00:00:00Z" })],
    new Date("2026-08-21T12:00:00Z"),
  );
  assert.equal(t.ecartPct, null);
});

test("le passage d'une annee sur l'autre ne casse pas la comparaison", () => {
  // En janvier, le mois precedent est decembre de l'annee d'avant. Un
  // calcul naif sur le numero de mois donnerait un mois -1 inexistant.
  const t = monthlyTrend(
    [
      vente("a@x.fr", { ref: "1", paidAt: "2027-01-10T00:00:00Z", amountCents: 500 }),
      vente("a@x.fr", { ref: "2", paidAt: "2026-12-20T00:00:00Z", amountCents: 1000 }),
      vente("a@x.fr", { ref: "3", paidAt: "2026-11-20T00:00:00Z", amountCents: 9999 }),
    ],
    new Date("2027-01-15T00:00:00Z"),
  );
  assert.equal(t.moisCents, 500);
  assert.equal(t.moisPrecedentCents, 1000, "decembre n'est pas retrouve");
  assert.equal(t.ecartPct, -50);
});

test("un remboursement et une date illisible ne faussent pas le CA", () => {
  const t = monthlyTrend(
    [
      vente("a@x.fr", { ref: "1", paidAt: "2026-08-05T00:00:00Z", amountCents: 2000 }),
      vente("a@x.fr", { ref: "2", paidAt: "2026-08-06T00:00:00Z", amountCents: 5000, refundedAt: "2026-08-07T00:00:00Z" }),
      vente("a@x.fr", { ref: "3", paidAt: "pas une date", amountCents: 9999 }),
    ],
    new Date("2026-08-21T12:00:00Z"),
  );
  assert.equal(t.moisCents, 2000);
});

// ── L'ATELIER, LU EN DIRECT DEPUIS L'AUTRE APP ──

test("UN ELEVE DE L'ATELIER SANS COMPTE TIQUIZ apparait quand meme", () => {
  // C'est une cliente payante. La laisser dehors ferait exactement ce
  // que Bene reprochait a la premiere version : "tout sauf fiable et
  // exhaustif".
  const v = buildPeople({
    profiles: [],
    sales: [],
    churn: [],
    atelier: [
      {
        email: "Eleve@X.fr",
        name: "Jocelyne",
        status: "active",
        tier: "plus",
        grantedAt: "2026-07-01T00:00:00Z",
        createdAt: "2026-07-01T00:00:00Z",
        lastSignIn: null,
        daysDone: 3,
      },
    ],
  });
  assert.equal(v.people.length, 1);
  assert.equal(v.people[0].email, "eleve@x.fr", "l'adresse doit etre en minuscules");
  assert.equal(v.people[0].hasTiquizAccount, false);
  assert.equal(v.people[0].atelier?.daysDone, 3);
  assert.equal(v.totals.atelierSeul, 1);
  assert.equal(v.totals.atelier, 1);
});

test("ELEVE DE L'ATELIER N'EST PAS 'ESSAI', et c'est important", () => {
  // Confondre les deux mentirait DEUX fois : elle n'essaie pas Tiquiz
  // (elle n'y a pas de compte) et elle a paye l'Atelier (ce n'est pas un
  // prospect). C'est au contraire la liste a inviter.
  const v = buildPeople({
    profiles: [],
    sales: [],
    churn: [],
    atelier: [
      {
        email: "a@x.fr",
        name: null,
        status: "active",
        tier: null,
        grantedAt: null,
        createdAt: null,
        lastSignIn: null,
        daysDone: 0,
      },
    ],
  });
  assert.equal(v.people[0].status, "atelier");
  assert.notEqual(v.people[0].status, "essai");
  assert.equal(v.totals.essai, 0, "elle ne doit pas gonfler le compteur d'essais");
});

test("quelqu'un qui est dans LES DEUX n'apparait qu'UNE fois", () => {
  // Deux lignes pour la meme personne, c'est le drame des entrees
  // dupliquees du 8 juin, sur un tableau ou Bene compte ses clients.
  const v = buildPeople({
    profiles: [compte("deux@x.fr", "monthly")],
    sales: [],
    churn: [],
    atelier: [
      {
        email: "deux@x.fr",
        name: "Deux",
        status: "active",
        tier: "plus",
        grantedAt: null,
        createdAt: null,
        lastSignIn: null,
        daysDone: 7,
      },
    ],
  });
  assert.equal(v.people.length, 1);
  assert.equal(v.people[0].hasTiquizAccount, true);
  assert.equal(v.people[0].status, "abonne", "son statut Tiquiz reste celui de son abonnement");
  assert.equal(v.people[0].atelier?.daysDone, 7, "et on lui ajoute ce que l'Atelier sait");
  assert.equal(v.totals.atelierSeul, 0);
  assert.equal(v.totals.atelier, 1);
});

test("une vente de l'Atelier compte dans le chiffre d'affaires", () => {
  const v = buildPeople({
    profiles: [compte("client@x.fr", "free")],
    sales: [vente("client@x.fr", { ref: "atelier:pi_9", productId: "atelier", amountCents: 4700 })],
    churn: [],
  });
  assert.equal(v.people[0].paidCents, 4700);
  assert.equal(v.totals.encaisseCents, 4700);
  assert.equal(v.totals.parProduit[0].productId, "atelier");
});

test("l'Atelier injoignable ne fait pas tomber l'ecran", () => {
  // Une panne de l'Atelier ne doit pas priver Bene de son tableau de
  // bord Tiquiz. L'ecran s'affiche, et il DIT qu'il est incomplet.
  const v = buildPeople({ profiles: [compte("a@x.fr", "monthly")], sales: [], churn: [] });
  assert.equal(v.people.length, 1);
  assert.equal(v.totals.atelier, 0);
  assert.equal(v.people[0].atelier, null);
});
