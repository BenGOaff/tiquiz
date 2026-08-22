// tests/logic/provenance.test.mts
//
// "SAVOIR D'OÙ IL VIENT" (Béné, 22 août).
//
// La réponse dormait dans `webhook_logs` : le premier appel reçu pour
// une adresse porte l'URL du tunnel par lequel elle est entrée. Un optin
// sur `part-tiquiz-gratuit` vient d'une affiliée, le même sur
// `tiquiz-gratuit` vient d'elle. C'est la différence entre "mon contenu
// marche" et "mes affiliées travaillent".

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  estTunnelAffilie,
  normaliserTunnel,
  readProvenance,
} from "../../lib/admin/provenance.ts";

function optin(email: string, url: string | null, quand: string) {
  return {
    source: "systeme_io_free_optin",
    event_type: "free_optin",
    payload: { contact: { email }, funnel: url ? { url } : undefined },
    created_at: quand,
  };
}

test("on garde le PLUS ANCIEN evenement, c'est son entree", () => {
  // Le plus recent dirait par ou elle est repassee : quelqu'un qui
  // achete apres six mois paraitrait "venu du bon de commande".
  const p = readProvenance(
    [
      optin("a@b.fr", "https://www.tipote.fr/tiquiz-mensuel", "2026-08-20T10:00:00Z"),
      optin("a@b.fr", "https://www.tipote.fr/part-tiquiz-gratuit", "2026-08-01T10:00:00Z"),
    ],
    "a@b.fr",
  );
  assert.equal(p.tunnel, "tipote.fr/part-tiquiz-gratuit");
  assert.equal(p.quand, "2026-08-01T10:00:00Z");
  assert.equal(p.parAffiliee, true);
});

test("le tunnel perso de Bene n'est pas un lien d'affiliee", () => {
  const p = readProvenance(
    [optin("a@b.fr", "https://www.tipote.fr/tiquiz-gratuit", "2026-08-01T10:00:00Z")],
    "a@b.fr",
  );
  assert.equal(p.tunnel, "tipote.fr/tiquiz-gratuit");
  assert.equal(p.parAffiliee, false);
});

test("on ne confond pas un mot qui contient 'part' avec un lien affilie", () => {
  // `tipote.fr/participer` n'a rien d'un lien d'affiliee. La convention
  // de Bene est `part-...` ou `...-part`, relevee dans URL_TO_PLAN.
  assert.equal(estTunnelAffilie("tipote.fr/participer"), false);
  assert.equal(estTunnelAffilie("tipote.fr/depart-anticipe"), false);
  assert.equal(estTunnelAffilie("tipote.fr/part-tiquiz-mensuel"), true);
  assert.equal(estTunnelAffilie("tipote.fr/tiquiz-annuel-plus-part"), true);
  assert.equal(estTunnelAffilie(null), false);
});

test("une adresse inconnue rend une provenance vide, pas une erreur", () => {
  const p = readProvenance([optin("a@b.fr", "https://x.fr/y", "2026-08-01T10:00:00Z")], "z@z.fr");
  assert.equal(p.tunnel, null);
  assert.equal(p.quand, null);
  assert.equal(p.parAffiliee, false);
});

test("un evenement sans URL laisse le tunnel vide mais garde la date", () => {
  // Une VENTE ne porte aucune URL de tunnel (releve le 7 aout). On sait
  // donc QUAND on l'a vue, pas par ou elle est entree.
  const p = readProvenance([optin("a@b.fr", null, "2026-08-01T10:00:00Z")], "a@b.fr");
  assert.equal(p.tunnel, null);
  assert.equal(p.quand, "2026-08-01T10:00:00Z");
});

test("l'adresse se compare sans casse ni espaces", () => {
  const p = readProvenance(
    [optin("A@B.FR", "https://www.tipote.fr/tiquiz-gratuit", "2026-08-01T10:00:00Z")],
    "  a@b.fr ",
  );
  assert.equal(p.tunnel, "tipote.fr/tiquiz-gratuit");
});

test("une date illisible ne fait pas passer un evenement devant les autres", () => {
  const p = readProvenance(
    [
      { ...optin("a@b.fr", "https://x.fr/casse", "pas-une-date") },
      optin("a@b.fr", "https://www.tipote.fr/tiquiz-gratuit", "2026-08-05T10:00:00Z"),
    ],
    "a@b.fr",
  );
  assert.equal(p.tunnel, "tipote.fr/tiquiz-gratuit");
});

test("normaliserTunnel retire le protocole, le www, la query et le slash", () => {
  assert.equal(
    normaliserTunnel("HTTPS://WWW.Tipote.fr/Tiquiz-Gratuit/?sa=abc#top"),
    "tipote.fr/tiquiz-gratuit",
  );
  assert.equal(normaliserTunnel(""), null);
  assert.equal(normaliserTunnel(null), null);
});
