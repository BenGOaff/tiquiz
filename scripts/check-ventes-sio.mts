// scripts/check-ventes-sio.mts
//
// « DES VENTES NON IDENTIFIÉES SUR LE DASHBOARD C'EST DES ABONNEMENTS
//   TIQUIZ VIA SYSTEME IO ET UN AUTRE ABONNEMENT QUI N'A RIEN À VOIR »
//   (Béné, 1er septembre 2026)
//
// Ce script LIT le journal, il ne raisonne pas dessus. C'est la règle du
// 7 août, celle qui a coûté une journée et un client : « les deux
// erreurs sont la même, raisonner sur la forme SUPPOSÉE d'un payload au
// lieu de la regarder ».
//
//   npm run check:ventes-sio            # les 60 derniers appels
//   npm run check:ventes-sio -- 200     # plus loin dans l'historique
//
// Pour chaque appel de Systeme.io, il imprime :
//   - l'identifiant du plan tarifaire ET LE CHEMIN où il a été trouvé ;
//   - le montant ET son chemin ;
//   - le palier que le routage ouvrirait AUJOURD'HUI ;
//   - le produit que le tableau de bord affiche.
//
// -- CE QU'IL EXISTE POUR TRANCHER --------------------------------------
//
// « Aucun identifiant reçu » et « un identifiant qu'on ne connaît pas »
// sont deux pannes différentes, et elles ne se corrigent pas au même
// endroit : la première est une ligne à ajouter à `OFFER_ID_PATHS`, la
// seconde une ligne à ajouter à `OFFER_TO_PLAN` ou `PRICE_PLANS`. Sur
// l'écran d'admin, les deux se lisent « offre inconnue ».
//
// D'où le BALAYAGE : quand aucun chemin connu ne répond, on cherche
// l'identifiant PARTOUT dans le payload et on dit où il est. Une liste
// de chemins qui a cessé de correspondre ne le dit jamais toute seule
// (leçon des 100 tags et des 51 règles : une liste tronquée ne
// s'annonce pas).
//
// Il n'imprime AUCUN secret : la clé de service sert à interroger la
// base et ne sort jamais du processus.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AMOUNT_PATHS,
  OFFER_ID_PATHS,
  PAID_AMOUNT_PATHS,
  URL_PATHS,
  inferPlanFromAmount,
  inferPlanFromOfferId,
  inferPlanFromUrl,
  isConfirmedSaleEvent,
} from "@/lib/sio/webhookInference";
import { readPricePlan } from "@/lib/sio/pricePlans";
import { venteHorsTiquiz } from "@/lib/sio/produitVendu";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ON PARSE LE `.env`, ON NE L'EXÉCUTE PAS. `. .env` demande à bash
// d'interpréter tout le fichier, et une clé contenant un caractère
// spécial fait échouer le chargement entier (drame `login-link.mjs`).
// Et on n'écrase jamais une variable déjà posée dans le terminal.
function chargerDotenv(): void {
  for (const nom of [".env", ".env.local"]) {
    const p = join(__dirname, "..", nom);
    if (!existsSync(p)) continue;
    for (const brut of readFileSync(p, "utf8").split(/\r?\n/)) {
      const ligne = brut.trim();
      if (!ligne || ligne.startsWith("#")) continue;
      const m = ligne.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!m) continue;
      let val = m[2]!;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]!] === undefined) process.env[m[1]!] = val;
    }
  }
}
chargerDotenv();

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_PROJECT_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "ENV manquantes : SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Cherchees dans le terminal, puis dans .env et .env.local a la racine du depot.",
  );
  process.exit(2);
}

const limite = Math.min(Math.max(Number(process.argv[2] ?? 60) || 60, 1), 500);

type Ligne = {
  received_at: string;
  event_type: string | null;
  event_id: string | null;
  status: string | null;
  error: string | null;
  payload: unknown;
};

function valeurAuChemin(obj: unknown, chemin: string): unknown {
  return chemin.split(".").reduce<unknown>((o, k) => {
    if (o && typeof o === "object") return (o as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

/** Le premier chemin de la liste qui porte vraiment quelque chose. */
function premierChemin(
  payload: unknown,
  chemins: readonly string[],
): { chemin: string; valeur: string } | null {
  for (const c of chemins) {
    const v = valeurAuChemin(payload, c);
    if (v != null && String(v).trim()) return { chemin: c, valeur: String(v).trim() };
  }
  return null;
}

/**
 * LE BALAYAGE, et c'est la raison d'être du script.
 *
 * Il cherche PARTOUT une clé qui ressemble à un identifiant de plan
 * tarifaire. On ne le fait que quand les chemins connus n'ont rien
 * donné : autrement il dirait la même chose qu'eux, en plus long.
 */
function balayerIdentifiants(payload: unknown): string[] {
  const trouves: string[] = [];
  const vus = new Set<unknown>();
  const marche = (noeud: unknown, chemin: string, profondeur: number): void => {
    if (profondeur > 6 || noeud == null || typeof noeud !== "object") return;
    if (vus.has(noeud)) return;
    vus.add(noeud);
    for (const [cle, valeur] of Object.entries(noeud as Record<string, unknown>)) {
      const ici = chemin ? `${chemin}.${cle}` : cle;
      if (valeur != null && typeof valeur !== "object") {
        const brut = String(valeur).trim();
        const nomParlant = /price.?plan|offer|plan|product/i.test(ici);
        if (nomParlant && /^\d{5,}$/.test(brut)) trouves.push(`${ici} = ${brut}`);
      }
      marche(valeur, ici, profondeur + 1);
    }
  };
  marche(payload, "", 0);
  return trouves;
}

const url =
  `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/webhook_logs` +
  `?source=eq.systeme_io&select=received_at,event_type,event_id,status,error,payload` +
  `&order=received_at.desc&limit=${limite}`;

const reponse = await fetch(url, {
  headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
});

if (!reponse.ok) {
  console.error(`Supabase a repondu ${reponse.status}. Verifie la cle de service.`);
  process.exit(1);
}

const lignes = (await reponse.json()) as Ligne[];

console.log("");
console.log(`=== LES ${lignes.length} DERNIERS APPELS DE SYSTEME.IO ===`);
console.log("");

if (lignes.length === 0) {
  console.log("Aucune ligne. Le journal ne remonte qu'au 7 aout 2026 (drame Ivan),");
  console.log("et une vente absente d'ici n'est jamais arrivee jusqu'a nous.");
  process.exit(0);
}

let sansIdentifiant = 0;
let identifiantInconnu = 0;
let horsTiquiz = 0;

for (const l of lignes) {
  const offre = premierChemin(l.payload, OFFER_ID_PATHS);
  const tunnel = premierChemin(l.payload, URL_PATHS);
  const encaisse = premierChemin(l.payload, PAID_AMOUNT_PATHS);
  const pourRouter = premierChemin(l.payload, AMOUNT_PATHS);
  const email = premierChemin(l.payload, [
    "customer.email",
    "data.customer.email",
    "contact.email",
    "data.contact.email",
    "email",
    "data.email",
  ]);

  const parOffre = inferPlanFromOfferId(offre?.valeur ?? null);
  const parUrl = inferPlanFromUrl(tunnel?.valeur ?? null);
  const parMontant = inferPlanFromAmount(pourRouter?.valeur ?? null);
  const tarif = readPricePlan(offre?.valeur ?? null);
  const vente = isConfirmedSaleEvent(l.event_type);

  console.log(`${l.received_at}  ${l.event_type ?? "?"}`);
  console.log(`  adresse    : ${email?.valeur ?? "-"}`);
  console.log(
    `  journal    : ${l.status ?? "-"}${l.error ? `  (${l.error})` : ""}`,
  );
  console.log(
    offre
      ? `  offre      : ${offre.valeur}   (${offre.chemin})`
      : `  offre      : AUCUNE sur les ${OFFER_ID_PATHS.length} chemins connus`,
  );
  if (!offre) {
    const ailleurs = balayerIdentifiants(l.payload);
    sansIdentifiant += 1;
    console.log(
      ailleurs.length
        ? `               trouve ailleurs : ${ailleurs.join(" | ")}`
        : "               et NULLE PART dans le payload : cet appel ne porte aucun identifiant.",
    );
  }
  console.log(`  tunnel     : ${tunnel?.valeur ?? "-"}`);
  console.log(
    `  encaisse   : ${encaisse ? `${encaisse.valeur}  (${encaisse.chemin})` : "-"}`,
  );
  console.log(
    `  produit    : ${tarif ? `${tarif.nom}  [${tarif.produit}]` : "plan tarifaire inconnu"}`,
  );

  // CE QUE LE ROUTAGE FERAIT AUJOURD'HUI, dans l'ordre exact du webhook.
  let verdict: string;
  if (venteHorsTiquiz(offre?.valeur ?? null)) {
    verdict = `AUCUN acces Tiquiz (produit reconnu, ce n'est pas nous)`;
    horsTiquiz += 1;
  } else if (parUrl ?? parOffre) {
    verdict = `palier ${parUrl ?? parOffre}  (${parUrl ? "url" : "offre"})`;
  } else if (vente) {
    identifiantInconnu += 1;
    verdict = parMontant
      ? `palier ${parMontant}  (DEVINE AU MONTANT, offre non routee)`
      : `palier monthly  (REPLI, ni offre ni montant reconnus)`;
  } else {
    verdict = "rien ouvert (l'evenement n'est pas une vente confirmee)";
  }
  console.log(`  routage    : ${verdict}`);
  console.log("");
}

console.log("=== CE QU'IL FAUT EN FAIRE ===");
console.log("");
console.log(`appels sans identifiant sur les chemins connus : ${sansIdentifiant}`);
console.log(`ventes ouvertes sans offre routee              : ${identifiantInconnu}`);
console.log(`ventes d'un autre produit, ignorees            : ${horsTiquiz}`);
console.log("");
console.log("Un identifiant TROUVE AILLEURS est une ligne a ajouter a OFFER_ID_PATHS.");
console.log("Un identifiant trouve mais non route est une ligne a ajouter a");
console.log("OFFER_TO_PLAN (un palier Tiquiz) ou a PRICE_PLANS (un autre produit).");
console.log("");
