// tests/logic/pilotage-sante.test.mts
//
// QU'EST-CE QUI CASSE, OU QU'IL FAUT SURVEILLER.
//
// Les trois pannes qui ont coûté le plus cher dans ces dépôts sont
// toutes SILENCIEUSES : une colonne absente (quinze jours de stats
// perdues), une table absente (un mois sans aucune stat), deux clés
// croisées (une journée avec la base de l'autre app). Ce fichier fige
// la règle qui les rend visibles, et surtout celle qui empêche l'écran
// de mentir dans l'autre sens : CE QU'ON N'A PAS PU VÉRIFIER N'EST
// JAMAIS COMPTÉ COMME "TOUT VA BIEN".

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEPENDANCES_CONSOLE,
  SEUIL_BLOQUE_MS,
  estBloque,
  etatSante,
  lireSonde,
  manquantes,
  sondesAffilie,
  verdictAppels,
  type LigneAppel,
  type ResultatSonde,
} from "@/lib/pilotage/sante";

const MAINTENANT = new Date("2026-08-29T12:00:00Z");

function appel(p: Partial<LigneAppel>): LigneAppel {
  return {
    source: "systeme_io",
    eventType: "customer.sale.completed",
    status: "processed",
    error: null,
    planNow: "monthly",
    receivedAt: MAINTENANT.toISOString(),
    ...p,
  };
}

// ── LES APPELS REÇUS ─────────────────────────────────────────────────

test("un appel EN COURS depuis une heure ne sera plus repris", () => {
  // Le verrou laisse un reessai reprendre au bout de deux minutes. Une
  // heure plus tard, aucun reessai n'est venu : aucun ne viendra.
  const vieux = new Date(MAINTENANT.getTime() - SEUIL_BLOQUE_MS - 1000).toISOString();
  assert.ok(estBloque(appel({ status: "processing", receivedAt: vieux }), MAINTENANT));
});

test("un appel EN COURS depuis deux minutes n'alerte pas", () => {
  // Entre les deux, un reessai normal est encore attendu. Crier la
  // ferait rougir l'ecran a chaque paiement, et un ecran qui rougit
  // tout le temps ne se lit plus.
  const recent = new Date(MAINTENANT.getTime() - 3 * 60 * 1000).toISOString();
  assert.ok(!estBloque(appel({ status: "processing", receivedAt: recent }), MAINTENANT));
});

test("un appel TERMINE n'est jamais bloque, quel que soit son age", () => {
  const vieux = new Date(MAINTENANT.getTime() - 30 * 24 * 3600_000).toISOString();
  assert.ok(!estBloque(appel({ status: "processed", receivedAt: vieux }), MAINTENANT));
  assert.ok(!estBloque(appel({ status: "error", receivedAt: vieux }), MAINTENANT));
});

test("une date illisible ne fabrique pas une alerte", () => {
  assert.ok(!estBloque(appel({ status: "processing", receivedAt: "n'importe quoi" }), MAINTENANT));
});

test("le compte d'appels a regarder est celui de l'ecran des appels", () => {
  // `compterActions` est deja teste ailleurs : on verifie qu'on
  // l'utilise, pas qu'on le reecrit. Deux comptes calcules separement
  // finissent toujours par se contredire.
  const v = verdictAppels(
    [
      appel({ status: "refused", planNow: null }), // paye sans acces
      appel({ status: "error" }), // panne
      appel({ status: "processed" }), // rien a faire
    ],
    MAINTENANT,
  );
  assert.equal(v.aRegarder, 2);
  assert.equal(v.lues, 3);
});

// ── LES SONDAGES ─────────────────────────────────────────────────────

test("un 200 dit presente, un 404 dit absente", () => {
  assert.equal(lireSonde(200, ""), "ok");
  assert.equal(lireSonde(206, ""), "ok");
  assert.equal(lireSonde(404, "Not found"), "absente");
  assert.equal(lireSonde(400, 'PGRST205 could not find the table "x"'), "absente");
  assert.equal(lireSonde(400, "PGRST204 column x does not exist"), "absente");
});

test("UN REFUS DE DROITS NE VEUT PAS DIRE ABSENTE", () => {
  // Dire "absente" enverrait appliquer une migration deja passee, et
  // "je n'ai pas pu regarder" n'est pas "il n'y a rien" (22 aout).
  assert.equal(lireSonde(401, "Invalid API key"), "illisible");
  assert.equal(lireSonde(500, "boom"), "illisible");
  assert.equal(lireSonde(0, "sondage impossible"), "illisible");
});

test("CHAQUE MIGRATION CITEE EXISTE VRAIMENT SUR LE DISQUE", () => {
  // Envoyer Bene appliquer un fichier qui n'existe pas est pire que ne
  // rien dire : elle cherche, ne trouve pas, et cesse de croire
  // l'ecran. Les entrees qui ne designent pas un fichier precis (une
  // vue historique) portent une parenthese et sont hors du controle.
  for (const d of DEPENDANCES_CONSOLE) {
    assert.ok(
      existsSync(resolve(process.cwd(), d.migration)),
      `${d.table} renvoie vers ${d.migration}, qui n'existe pas`,
    );
  }
});

test("chaque dependance dit CE QUI SE TAIT sans elle", () => {
  // "table absente" seul n'a jamais aide personne a decider quoi faire.
  for (const d of DEPENDANCES_CONSOLE) {
    assert.ok(d.sansElle.length > 30, d.table);
  }
});

test("ce que l'espace affilie n'a pas pu lire remonte, nomme", () => {
  const s = sondesAffilie({ alias: true, clics: false, commissions: true });
  assert.deepEqual(
    s.map((x) => x.table).sort(),
    ["affiliate_commissions", "affiliate_sa_aliases"],
  );
  assert.ok(s.every((x) => x.base === "tipote"));
  assert.deepEqual(sondesAffilie({ alias: false }), []);
  assert.deepEqual(sondesAffilie(null), []);
});

test("un signal qu'on ne comprend pas ne fabrique pas de message", () => {
  assert.deepEqual(sondesAffilie({ truc_inconnu: true }), []);
});

// ── LE VERDICT D'ENSEMBLE ────────────────────────────────────────────

function sonde(p: Partial<ResultatSonde>): ResultatSonde {
  return { ...DEPENDANCES_CONSOLE[0], etat: "ok", ...p };
}

const RIEN: Parameters<typeof etatSante>[0] = {
  appels: { aRegarder: 0, bloques: 0, lues: 40 },
  sondes: [sonde({})],
  clesCoherentes: true,
  liaisons: [{ nom: "L'Atelier du Quiz", ok: true, raison: null }],
};

test("tout va bien ne produit AUCUN point", () => {
  const e = etatSante(RIEN);
  assert.equal(e.gravite, "ok");
  assert.deepEqual(e.points, []);
});

test("CE QU'ON N'A PAS PU VERIFIER N'EST PAS UNE BONNE NOUVELLE", () => {
  // Traiter l'ignorance comme un "ok" est exactement ce qui a laisse
  // passer quinze jours de statistiques perdues.
  assert.equal(etatSante({ ...RIEN, clesCoherentes: null }).gravite, "surveiller");
  assert.equal(etatSante({ ...RIEN, appels: null }).gravite, "surveiller");
  assert.equal(etatSante({ ...RIEN, sondes: null }).gravite, "surveiller");
});

test("des cles croisees sont une CASSE, et la premiere chose dite", () => {
  const e = etatSante({ ...RIEN, clesCoherentes: false });
  assert.equal(e.gravite, "casse");
  assert.ok(e.points[0].includes("ne parlent pas du même projet"));
  assert.ok(
    e.points[0].includes("redémarrer"),
    "il faut dire de ne pas redemarrer : c'est le pm2 restart qui a propage la panne du 22 aout",
  );
});

test("une table absente est une casse, et elle nomme sa base", () => {
  const e = etatSante({
    ...RIEN,
    sondes: [sonde({ etat: "absente", table: "support_tickets", base: "tiquiz" })],
  });
  assert.equal(e.gravite, "casse");
  assert.ok(e.points.some((p) => p.includes("support_tickets") && p.includes("Tiquiz")));
});

test("une liaison muette se SURVEILLE, elle ne casse pas", () => {
  // Les chiffres deviennent incomplets, ils ne disparaissent pas.
  const e = etatSante({
    ...RIEN,
    liaisons: [{ nom: "L'Atelier du Quiz", ok: false, raison: "pas de réponse" }],
  });
  assert.equal(e.gravite, "surveiller");
  assert.ok(e.points.some((p) => p.includes("L'Atelier du Quiz")));
});

test("une casse gagne sur une surveillance", () => {
  const e = etatSante({
    ...RIEN,
    clesCoherentes: false,
    liaisons: [{ nom: "L'Atelier du Quiz", ok: false, raison: null }],
  });
  assert.equal(e.gravite, "casse");
  assert.equal(e.points.length, 2, "les deux se disent, une seule decide de la couleur");
});

test("manquantes ne rend QUE ce qui manque", () => {
  const liste = [sonde({ etat: "ok" }), sonde({ etat: "absente" }), sonde({ etat: "illisible" })];
  assert.equal(manquantes(liste).length, 1);
});
