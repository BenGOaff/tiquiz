// tests/logic/alerte-acces.test.mts
//
// UN PAIEMENT SANS ACCÈS, OU AVEC UN ACCÈS À MOITIÉ OUVERT, PRÉVIENT
// BÉNÉ PAR EMAIL (11 septembre 2026).
//
// Avant : un octroi raté répondait 502 (le fournisseur réessaie) et se
// taisait ; un email d'accès ou un tag non partis vivaient dans
// `pm2 logs`. Dans les deux cas, quelqu'un avait payé et personne ne le
// savait.
//
// Ce test tient les trois moitiés : la décision pure (quand alerter, et
// quoi dire), le module identique dans les deux dépôts, et les DEUX
// webhooks qui l'appellent, avant chaque 502 et après chaque octroi.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { etatOctroiTiquiz } from "@/lib/checkout/etatOctroi";
import type { EtatOctroi } from "@/lib/ventes/alerteAcces";

// Le type est une union : on ne lit `tagsPoses` qu'apres avoir prouve
// que l'octroi est passe, sinon `tsc` refuse (et il a raison).
function ouvert(e: EtatOctroi): Extract<EtatOctroi, { ok: true }> {
  assert.equal(e.ok, true);
  return e as Extract<EtatOctroi, { ok: true }>;
}
import { alerteAccesNecessaire, contenuAlerteAcces } from "@/lib/ventes/alerteAcces";
import { sansCommentaires } from "./aide/sansCommentaires.mts";

const lire = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const source = (rel: string) => sansCommentaires(lire(rel));

test("on alerte sur un échec CONSTATÉ, jamais sur un doute", () => {
  assert.equal(alerteAccesNecessaire({ ok: false, raison: "upsert:boom" }), true);
  assert.equal(
    alerteAccesNecessaire({ ok: true, compteCree: true, emailAccesEnvoye: false, tagsPoses: true }),
    true,
  );
  assert.equal(
    alerteAccesNecessaire({ ok: true, compteCree: false, emailAccesEnvoye: true, tagsPoses: false }),
    true,
  );
  // Tout est passé : silence.
  assert.equal(
    alerteAccesNecessaire({ ok: true, compteCree: true, emailAccesEnvoye: true, tagsPoses: true }),
    false,
  );
  // On ne sait pas (l'Atelier ne dit pas si son email est parti) : silence.
  assert.equal(
    alerteAccesNecessaire({ ok: true, compteCree: null, emailAccesEnvoye: null, tagsPoses: null }),
    false,
  );
});

test("etatOctroiTiquiz : un tag qui ne s'applique pas n'est pas un tag raté", () => {
  const base = { ok: true, created: true, previousPlan: null, loginLinkSent: true };
  // Plan sans tag client (`tagClientPose: null`) : rien n'a raté.
  assert.deepEqual(etatOctroiTiquiz({ ...base, tagPose: true, tagClientPose: null }), {
    ok: true, compteCree: true, emailAccesEnvoye: true, tagsPoses: true,
  });
  // Le tag client a raté : ça se dit.
  assert.equal(ouvert(etatOctroiTiquiz({ ...base, tagPose: true, tagClientPose: false })).tagsPoses, false);
  // Aucun des deux n'est renseigné : on ne sait pas.
  assert.equal(ouvert(etatOctroiTiquiz({ ...base })).tagsPoses, null);
  // L'email n'est pas parti : ça se dit.
  assert.equal(ouvert(etatOctroiTiquiz({ ...base, loginLinkSent: false })).emailAccesEnvoye, false);
  assert.deepEqual(etatOctroiTiquiz({ ok: false, created: false, previousPlan: null, reason: "upsert:x" }), {
    ok: false, raison: "upsert:x",
  });
  assert.equal(etatOctroiTiquiz({ ok: false, created: false, previousPlan: null }).ok, false);
});

test("chaque cas dit QUOI FAIRE, pas seulement ce qui s'est passé", () => {
  const commun = {
    app: "Tiquiz", moyen: "stripe" as const, email: "a@b.fr", produit: "Tiquiz mensuel",
    reference: "cs_1", lienAdmin: "https://quiz.tipote.com/admin/clients/a%40b.fr",
  };
  const rate = contenuAlerteAcces({ ...commun, octroi: { ok: false, raison: "upsert:boom" } });
  assert.match(rate.subject, /^PAIEMENT SANS ACCÈS Tiquiz/);
  assert.match(rate.texte, /ouvre l'accès à la main/);
  assert.match(rate.texte, /upsert:boom/);

  const sansEmail = contenuAlerteAcces({
    ...commun, octroi: { ok: true, compteCree: true, emailAccesEnvoye: false, tagsPoses: true },
  });
  assert.match(sansEmail.subject, /^Accès ouvert mais incomplet/);
  assert.match(sansEmail.texte, /Renvoie-lui un lien de connexion/);
  assert.doesNotMatch(sansEmail.texte, /tag Systeme\.io n'a PAS/);

  const sansTag = contenuAlerteAcces({
    ...commun, octroi: { ok: true, compteCree: false, emailAccesEnvoye: true, tagsPoses: false },
  });
  assert.match(sansTag.texte, /Pose le tag à la main/);
  assert.doesNotMatch(sansTag.texte, /Renvoie-lui/);
});

test("ce qui vient de l'extérieur est échappé, et aucun tiret cadratin", () => {
  const c = contenuAlerteAcces({
    app: "Tiquiz", moyen: "paypal", email: "<script>@x.fr", produit: "P", reference: "r",
    lienAdmin: "https://x", octroi: { ok: false, raison: "<b>" },
  });
  assert.doesNotMatch(c.html, /<script>|<b>/);
  assert.doesNotMatch(c.texte + c.html, /[—–]/);
});

test("le module pur est le MÊME dans les deux dépôts, à l'octet près", () => {
  const ici = lire("lib/ventes/alerteAcces.ts");
  const jumeau = path.join(process.cwd(), "..", "formaquiz", "lib", "ventes", "alerteAcces.ts");
  let la: string | null = null;
  try { la = readFileSync(jumeau, "utf8"); } catch { la = null; }
  // Le jumeau n'est pas toujours cloné à côté (CI) : on ne conclut rien
  // de son absence, on compare quand il est là.
  if (la !== null) assert.equal(ici, la, "cmp lib/ventes/alerteAcces.ts ../formaquiz/lib/ventes/alerteAcces.ts");
});

test("les DEUX webhooks alertent AVANT chaque 502 d'octroi, et APRÈS chaque octroi", () => {
  for (const fichier of ["app/api/commande/webhook/route.ts", "app/api/commande/paypal/webhook/route.ts"]) {
    const src = source(fichier);
    const appels = src.split("alerterAccesIncomplet(").length - 1;
    // Chaque 502 d'octroi raté est précédé d'une alerte.
    const refus = [...src.matchAll(/reason: (?:octroi|grant)\.reason \?\? "grant_failed" \}, \{ status: 502 \}/g)];
    assert.ok(refus.length >= 1, `${fichier} : aucun 502 d'octroi trouvé`);
    for (const m of refus) {
      const avant = src.slice(Math.max(0, (m.index ?? 0) - 700), m.index);
      assert.match(avant, /alerterAccesIncomplet\(/, `${fichier} : un 502 d'octroi part sans alerte`);
    }
    // Un appel de plus par octroi réussi : deux appels par octroi.
    assert.ok(appels >= refus.length * 2, `${fichier} : ${appels} appel(s) pour ${refus.length} octroi(s)`);
    assert.match(src, /etatOctroiTiquiz\(/, `${fichier} : l'état vient de la fonction pure, pas d'une recopie`);
  }
});

test("l'alerte ne lève jamais et se tait quand rien n'a raté", () => {
  const src = source("lib/email/accesAlerte.ts");
  assert.match(src, /if \(!alerteAccesNecessaire\(acces\.octroi\)\) return false;/);
  assert.match(src, /catch \(e\)/);
});
