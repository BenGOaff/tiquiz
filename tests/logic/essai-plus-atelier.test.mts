// tests/logic/essai-plus-atelier.test.mts
//
// 28 CLIENTS EN MONTHLY PLUS (Béné, 29 août 2026).
//
// "Je vois 28 clients en monthly plus ça m'étonne beaucoup... tu as
// compté ceux qui sont en essai gratuit de l'atelier non ?"
//
// Oui. Pendant les 15 jours offerts par l'Atelier, `profiles.plan` vaut
// `monthly_plus` et la personne ne paie RIEN : à l'expiration, le cron
// la remet sur `affiliate_trial_pre_plan`. `readPersonStatus` ne lisait
// que le plan, donc elle comptait comme abonnée payante, **et son prix
// entrait dans le revenu récurrent**.
//
// Elle l'a vu à l'oeil sur un chiffre qui avait l'air juste. C'est
// exactement ce que ce dépôt appelle un chiffre gonflé : pire qu'une
// absence de chiffre, parce qu'il fait prendre des décisions.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPeople, readPersonStatus, type ProfileRow } from "@/lib/admin/people";
import { buildMrr } from "@/lib/admin/mrr";

const MAINTENANT = new Date("2026-08-29T12:00:00Z");
const DANS_10_JOURS = "2026-09-08T12:00:00Z";
const IL_Y_A_10_JOURS = "2026-08-19T12:00:00Z";

function profil(p: Partial<ProfileRow> & { email: string }): ProfileRow {
  return {
    user_id: p.email,
    plan: "monthly_plus",
    created_at: "2026-08-01T10:00:00Z",
    ...p,
  };
}

test("UN ESSAI PLUS EN COURS N'EST PAS UN ABONNÉ", () => {
  const v = buildPeople({
    profiles: [
      profil({ email: "essai@x.fr", affiliate_trial_expires_at: DANS_10_JOURS }),
      profil({ email: "vraie@x.fr" }),
    ],
    sales: [],
    churn: [],
    maintenant: MAINTENANT,
  });
  const essai = v.people.find((p) => p.email === "essai@x.fr")!;
  const vraie = v.people.find((p) => p.email === "vraie@x.fr")!;
  assert.equal(essai.status, "essai-plus");
  assert.equal(vraie.status, "abonne");
  assert.equal(v.totals.abonnes, 1, "l'essai ne doit pas gonfler le compte d'abonnes");
});

test("ET SON PRIX N'ENTRE PAS DANS LE REVENU RÉCURRENT", () => {
  // C'est la moitie la plus chere du bug : un MRR gonfle par des gens
  // qui ne paient rien fait projeter un chiffre d'affaires qui
  // n'arrivera pas.
  const v = buildPeople({
    profiles: [
      profil({ email: "essai@x.fr", affiliate_trial_expires_at: DANS_10_JOURS }),
      profil({ email: "vraie@x.fr" }),
    ],
    sales: [],
    churn: [],
    maintenant: MAINTENANT,
  });
  const mrr = buildMrr(v.people);
  assert.equal(mrr.abonnes, 1);
  const seule = buildMrr(
    buildPeople({
      profiles: [profil({ email: "vraie@x.fr" })],
      sales: [],
      churn: [],
      maintenant: MAINTENANT,
    }).people,
  );
  assert.equal(mrr.cents, seule.cents, "l'essai ajoutait des euros qui n'existent pas");
});

test("UN ESSAI EXPIRÉ REDEVIENT CE QUE DIT SON PLAN", () => {
  // Le cron remet le plan d'avant. Mais s'il rate un tour, une date
  // passee ne doit pas garder quelqu'un en essai pour toujours : on lit
  // la date, pas la seule presence de la colonne.
  const v = buildPeople({
    profiles: [profil({ email: "fini@x.fr", affiliate_trial_expires_at: IL_Y_A_10_JOURS })],
    sales: [],
    churn: [],
    maintenant: MAINTENANT,
  });
  assert.equal(v.people[0].status, "abonne");
});

test("un compte GRATUIT avec une date d'essai reste en gratuit", () => {
  // Le cron l'a deja remise sur `free` : elle n'a plus les fonctions du
  // PLUS, donc l'annoncer "en essai Plus" serait faux.
  const v = buildPeople({
    profiles: [
      profil({ email: "f@x.fr", plan: "free", affiliate_trial_expires_at: DANS_10_JOURS }),
    ],
    sales: [],
    churn: [],
    maintenant: MAINTENANT,
  });
  assert.equal(v.people[0].status, "essai");
});

test("une RÉSILIATION passe devant l'essai", () => {
  // Elle s'en va : c'est ca qu'il faut voir, pas son essai en cours.
  const v = buildPeople({
    profiles: [profil({ email: "part@x.fr", affiliate_trial_expires_at: DANS_10_JOURS })],
    sales: [],
    churn: [{ email: "part@x.fr", cancelled_at: "2026-08-20T10:00:00Z" }],
    maintenant: MAINTENANT,
  });
  assert.equal(v.people[0].status, "partant");
});

test("un accès À VIE n'est jamais un essai", () => {
  const v = buildPeople({
    profiles: [
      profil({ email: "vie@x.fr", plan: "lifetime", affiliate_trial_expires_at: DANS_10_JOURS }),
    ],
    sales: [],
    churn: [],
    maintenant: MAINTENANT,
  });
  assert.equal(v.people[0].status, "avie");
});

test("LA MÉCANIQUE EST UN PARAMÈTRE OBLIGATOIRE", () => {
  // On ne peut plus appeler la fonction sans avoir dit ce qu'on sait de
  // l'essai : c'est la seule protection qui survit au prochain qui
  // touchera au fichier. Le compilateur l'exige ; ce test le rappelle.
  assert.equal(
    readPersonStatus({
      hasTiquizAccount: true,
      plan: "monthly_plus",
      churn: null,
      essaiPlusJusquA: DANS_10_JOURS,
      maintenant: MAINTENANT,
    }),
    "essai-plus",
  );
  assert.equal(
    readPersonStatus({
      hasTiquizAccount: true,
      plan: "monthly_plus",
      churn: null,
      essaiPlusJusquA: null,
      maintenant: MAINTENANT,
    }),
    "abonne",
  );
});

test("une date illisible ne fabrique pas un essai", () => {
  assert.equal(
    readPersonStatus({
      hasTiquizAccount: true,
      plan: "monthly_plus",
      churn: null,
      essaiPlusJusquA: "n'importe quoi",
      maintenant: MAINTENANT,
    }),
    "abonne",
  );
});
