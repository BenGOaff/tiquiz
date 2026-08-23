// tests/logic/audit-24-aout.test.mts
//
// L'AUDIT DEMANDÉ PAR BÉNÉ : "je veux un système fiable et stable."
//
// Ce fichier fige les corrections trouvées le 24 août en relisant les
// chaînes construites depuis le 20 : abonnements, paiements, affiliation,
// ticketing. Chacune est un bug qui ne se serait vu qu'en production, et
// pour trois d'entre elles seulement au relevé bancaire suivant.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { OWN_HOSTS } from "../../lib/customDomains.ts";
import { SALES_HOSTS } from "../../lib/sales/salesHosts.ts";
import { lireVerrou, REPRISE_APRES_MS } from "../../lib/webhooks/verrouRegles.ts";

function lire(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

// ── 1. UN RÉESSAI DE WEBHOOK DOIT POUVOIR REPASSER ───────────────────

test("le verrou libere une ligne dont le traitement a echoue", () => {
  // LE BUG : la ligne etait ecrite AVANT le travail, et tout conflit
  // valait "deja traite". Un traitement rate repondait 502 pour demander
  // un reessai, et ce reessai recevait 200 sans rien faire. Une vente
  // encaissee dont le premier traitement ratait n'ouvrait donc JAMAIS
  // l'acces.
  const src = lire("lib/webhooks/log.ts");
  assert.match(src, /status: "processing"/, "le verrou n'ecrit plus le statut qui le tient");

  const t = Date.parse("2026-08-24T12:00:00Z");
  const ilYA = (ms: number) => new Date(t - ms).toISOString();

  // Deja fait : on s'arrete.
  assert.deepEqual(lireVerrou({ status: "processed", received_at: ilYA(0) }, t), { action: "doublon" });
  // En cours a l'instant : quelqu'un travaille, on demande un reessai.
  assert.deepEqual(lireVerrou({ status: "processing", received_at: ilYA(1000) }, t), { action: "en_cours" });
  // MORT EN ROUTE : on reprend. C'est TOUT le correctif.
  assert.deepEqual(
    lireVerrou({ status: "processing", received_at: ilYA(REPRISE_APRES_MS + 1000) }, t),
    { action: "traiter" },
  );
  // Un echec est SORTI de l'index : il ne peut pas nous avoir bloques.
  assert.deepEqual(lireVerrou({ status: "error", received_at: ilYA(0) }, t), { action: "en_cours" });
  // Ligne absente ou horodatage illisible : on ne rejoue pas une vente
  // sur une lecture qu'on ne comprend pas, sauf si elle est en cours
  // depuis un temps impossible a dater.
  assert.deepEqual(lireVerrou(null, t), { action: "en_cours" });
  assert.deepEqual(lireVerrou({ status: "processing", received_at: "n'importe quoi" }, t), {
    action: "traiter",
  });

  // Un traitement mort en route se REPREND, il ne bloque pas la vente.
  assert.ok(REPRISE_APRES_MS >= 60_000, "une reprise trop rapide traiterait deux fois en parallele");
  assert.ok(REPRISE_APRES_MS <= 10 * 60_000, "une reprise trop lente bloque une vente trop longtemps");
});

test("la decision du verrou est PURE : aucun test ne pourrait l'importer sinon", () => {
  // `log.ts` tire `supabaseAdmin`, qui exige des variables au
  // chargement. La regle du depot depuis le 1er aout : la decision sort
  // du module d'entrees-sorties, sinon elle n'est pas testee, donc
  // c'est la qu'un bug s'installe. C'est litteralement ce qui vient
  // d'arriver a ce verrou.
  // Les commentaires ont le droit d'EXPLIQUER pourquoi : ce qu'on
  // traque, c'est un `import`.
  const pur = lire("lib/webhooks/verrouRegles.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/\bimport\b/.test(pur), "le module pur importe quelque chose : il n'est plus pur");
  // Et l'heure est un PARAMETRE : un test qui depend de l'horloge
  // clignote (lecon du 1er aout).
  assert.match(pur, /maintenant: number/);
  assert.ok(!/Date\.now\(\)/.test(pur), "la decision lit l'horloge toute seule");
});

test("l'index unique ne couvre QUE ce qui est en cours ou termine", () => {
  const migration = lire("supabase/migrations/20260824_webhook_lock.sql");
  assert.match(migration, /drop index if exists public\.webhook_logs_owner_event_uidx/);
  assert.match(migration, /status in \('processing', 'processed'\)/);
  // C'est la forme de l'index de la migration 012, qui protege le
  // webhook Systeme.io depuis mars et n'avait pas ete reprise.
  const douze = lire("supabase/migrations/012_webhook_idempotency.sql");
  assert.match(douze, /status = 'processed'/);
});

test("les deux webhooks marquent la ligne, dans les deux sens", () => {
  for (const f of [
    "app/api/commande/webhook/route.ts",
    "app/api/commande/paypal/webhook/route.ts",
  ]) {
    const src = lire(f);
    assert.match(src, /prendreLeVerrou\(/, `${f} : plus de verrou`);
    assert.match(src, /reussi \? "processed" : "error"/, `${f} : un echec ne libere pas la ligne`);
    // Une exception non plus ne doit pas laisser la ligne bloquee.
    assert.match(src, /await marquerTraite\(SOURCE, eventId, "error"/, `${f} : exception non marquee`);
    // Un traitement deja en cours demande un REESSAI, jamais un 200.
    assert.match(src, /action === "en_cours"/, `${f} : un traitement concurrent recevrait 200`);
  }
});

// ── 2. REMBOURSER UNE ÉCHÉANCE DOIT ARRÊTER L'ABONNEMENT ─────────────

test("un remboursement d'echeance arrete quand meme l'abonnement", () => {
  // LE BUG : l'identifiant client venait UNIQUEMENT de la session de
  // paiement. Une echeance d'abonnement n'en a pas (c'est une facture),
  // donc l'abonnement n'etait pas arrete : acces ferme, et Stripe
  // prelevait le mois suivant. Le bug d'argent du 23 aout, par une autre
  // porte.
  const src = lire("app/api/commande/webhook/route.ts");
  assert.match(
    src,
    /vente\?\.customerId \?\? readCustomerId\(charge\?\.customer\)/,
    "le repli sur le client de la charge a saute",
  );
  // Et on arrete bien en IMMEDIAT : la periode vient d'etre remboursee.
  assert.match(src, /arreterAbonnementsStripe\(compte\.key, clientStripe, "immediat"\)/);
});

// ── 3. UN DOMAINE DE VENTE EST FORCÉMENT UN DOMAINE À NOUS ───────────

test("tout domaine de vente est dans OWN_HOSTS", () => {
  // Sans ca, le portier des domaines personnalises prend le domaine de
  // vente pour celui d'une creatrice et repond 404 a tout sauf a un slug
  // de quiz : le bon de commande ET son `/api/commande/session`
  // disparaissent. Le commentaire disait "a garder en phase", et rien ne
  // le verifiait : c'est exactement la mecanique des deux listes qui
  // divergent, quatre fois payee dans ce depot.
  for (const hote of Object.keys(SALES_HOSTS)) {
    assert.ok(OWN_HOSTS.has(hote), `${hote} vend mais n'est pas un domaine a nous : 404 sur tout`);
  }
});

// ── 4. LES PORTES PARTENAIRES COMPARENT EN TEMPS CONSTANT ────────────

test("aucune porte partenaire ne compare son secret avec ===", () => {
  // Une comparaison naive s'arrete au premier caractere different : son
  // TEMPS raconte donc combien de caracteres sont justes.
  const dossier = path.join(process.cwd(), "app/api/partner");
  const fautifs: string[] = [];
  const parcourir = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const complet = path.join(dir, e.name);
      if (e.isDirectory()) { parcourir(complet); continue; }
      if (e.name !== "route.ts") continue;
      const src = fs.readFileSync(complet, "utf8");
      if (/x-partner-secret"\s*\)\s*\?\?\s*""\s*\)?\s*(?:\.trim\(\))?\s*!==/.test(src)) {
        fautifs.push(path.relative(process.cwd(), complet));
      }
    }
  };
  parcourir(dossier);
  assert.deepEqual(fautifs, [], `comparaison naive du secret : ${fautifs.join(", ")}`);
});

// ── 5. UN APPEL VERS L'AUTRE APP A TOUJOURS UN DÉLAI MAXIMUM ─────────

test("aucun appel cross-app ne peut bloquer un webhook", () => {
  // `commissionnerVente` tourne DANS le webhook de paiement. Sans delai
  // maximum, une panne de Tipote garde la requete ouverte jusqu'a ce que
  // la plateforme la tue, et le fournisseur ne recoit jamais sa reponse.
  // La commission peut attendre ; l'acces du client, non.
  for (const f of ["lib/affiliate/ownerSale.ts", "lib/trial/proprietaireDuLien.ts"]) {
    assert.match(lire(f), /AbortSignal\.timeout\(/, `${f} : appel sans delai maximum`);
  }
});
