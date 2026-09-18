// scripts/crediter-affilie.mts
//
// RATTACHER UNE CLIENTE À SON AFFILIÉ, ET LUI VERSER CE QUI LUI REVIENT.
//
//   npm run affilie:crediter -- <adresse> <code>              # blanc
//   npm run affilie:crediter -- <adresse> <code> --pour-de-vrai
//
// -- POURQUOI CETTE COMMANDE EXISTE (Béné, 18 septembre 2026) ----------
//
// "J'ai fait 2 présentations live et plusieurs personnes étaient
// intéressées et auraient dû passer par le lien de Greg."
//
// Un live n'est pas un lien. Quelqu'un qui regarde une présentation et
// va ensuite sur tiquiz.fr de lui même n'a cliqué sur rien : aucun
// cookie, aucune attribution, aucune commission. **Ce n'est pas une
// panne**, c'est le fonctionnement normal de l'affiliation, et aucun
// code ne peut deviner qu'une personne a entendu parler du produit par
// quelqu'un.
//
// La décision de créditer quand même est donc une décision de BÉNÉ, pas
// une conclusion du système. Cette commande l'exécute, elle ne la prend
// pas.
//
// -- LES TROIS GARANTIES ----------------------------------------------
//
// 1. **BLANC PAR DÉFAUT.** Sans `--pour-de-vrai`, rien n'est écrit :
//    on affiche ce qui se passerait. Un versement ne se reprend pas,
//    donc on regarde avant.
// 2. **IDEMPOTENTE.** Le rattachement ne s'écrit qu'une fois (le
//    PREMIER gagne, c'est la règle du 26 août) et l'attribution répond
//    `duplicate` sur une clé déjà connue. Relancer ne paie jamais deux
//    fois.
// 3. **ELLE NE FAIT PARTIR AUCUN ARGENT.** Elle crée une commission au
//    registre. Le virement, lui, passe par le lot de versement, qui
//    produit un FICHIER que Béné dépose dans sa banque. La règle de ces
//    dépôts ne bouge pas d'un pouce.
//
// -- ET ELLE NE FORCE RIEN ---------------------------------------------
//
// Si la personne est DÉJÀ rattachée à quelqu'un d'autre, on s'arrête et
// on le dit. Le premier rattachement gagne, et écraser celui d'un autre
// affilié pour en payer un troisième serait prendre à l'un pour donner
// à l'autre, sans que personne ne le voie.
//
// Il n'imprime AUCUN secret.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { completerVentes, nomProduitComplete } from "@/lib/ventes/identite";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const POUR_DE_VRAI = process.argv.includes("--pour-de-vrai");
const email = String(args[0] ?? "").trim().toLowerCase();
const code = String(args[1] ?? "").trim().toLowerCase();

if (!email.includes("@") || !code) {
  console.error(
    "Usage : npm run affilie:crediter -- <adresse> <code> [--pour-de-vrai]\n" +
      "Exemple : npm run affilie:crediter -- cliente@exemple.fr pereiradelima86",
  );
  process.exit(2);
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_PROJECT_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;
const INTERNAL_SECRET = String(process.env.AFFILIATE_INTERNAL_SECRET ?? "").trim();

const TIPOTE = (() => {
  const brut = String(process.env.TIPOTE_BASE_URL ?? "").trim();
  if (/^https:\/\//i.test(brut) && !/localhost|127\.|::1|\.local/i.test(brut)) {
    return brut.replace(/\/+$/, "");
  }
  return "https://app.tipote.com";
})();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ENV manquantes : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}
if (!INTERNAL_SECRET) {
  console.error(
    "AFFILIATE_INTERNAL_SECRET absente : c'est elle qui ouvre le registre de Tipote.",
  );
  process.exit(2);
}

async function supa<T>(chemin: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
    headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase a repondu ${res.status}`);
  return (await res.json()) as T;
}

async function versTipote(
  chemin: string,
  corps: unknown,
): Promise<{ ok: boolean; statut: number | null; json: Record<string, unknown> }> {
  try {
    const res = await fetch(`${TIPOTE}${chemin}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-affiliate-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(20000),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, statut: res.status, json };
  } catch (e) {
    console.error(`  ! ${chemin} injoignable : ${(e as Error).message}`);
    return { ok: false, statut: null, json: {} };
  }
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} EUR`;
}

async function main(): Promise<void> {
  console.log(
    `\n${POUR_DE_VRAI ? "CRÉDITER" : "BLANC (rien ne sera écrit)"} : ${email} -> ${code}\n`,
  );

  // ── 1. SES ENCAISSEMENTS, lus avec les MÊMES fonctions que l'écran ──
  const events = await supa<EventRow[]>(
    "webhook_logs?select=source,event_id,event_type,payload,status,created_at:received_at" +
      "&source=in.(stripe,paypal)&order=received_at.desc&limit=5000",
  );
  const profils = await supa<{ email: string | null; paypal_subscription_id: string | null }[]>(
    "profiles?select=email,paypal_subscription_id&paypal_subscription_id=not.is.null&limit=5000",
  );
  const emailParAbonnement: Record<string, string> = {};
  for (const p of profils) {
    const abo = String(p.paypal_subscription_id ?? "").trim();
    const mail = String(p.email ?? "").trim().toLowerCase();
    if (abo && mail) emailParAbonnement[abo] = mail;
  }

  const siennes = completerVentes(buildSales(events), { fiches: {}, emailParAbonnement })
    .filter((v) => (v.email ?? "").toLowerCase() === email)
    .filter((v) => !v.refundedAt && Number(v.amountCents) > 0);

  if (siennes.length === 0) {
    console.log(
      `Aucun encaissement a cette adresse dans notre journal. Rien a crediter.\n` +
        `Verifie l'adresse : c'est celle SAISIE sur le bon de commande, pas forcement\n` +
        `celle du compte PayPal.\n`,
    );
    process.exit(1);
  }

  console.log(`${siennes.length} encaissement(s) a cette adresse :`);
  for (const v of siennes) {
    console.log(
      `  ${v.paidAt.slice(0, 10)}  ${euros(v.amountCents).padStart(10)}  ${v.provider.padEnd(8)} ` +
        `${nomProduitComplete(v) ?? v.productId ?? "produit inconnu"}`,
    );
  }

  // ── 2. LE RATTACHEMENT, qui vaut pour toutes ses ventes FUTURES ──
  console.log(`\n1. Rattacher ${email} a "${code}", a vie`);
  if (!POUR_DE_VRAI) {
    console.log("   (blanc) POST /api/affiliate/rattacher");
  } else {
    const r = await versTipote("/api/affiliate/rattacher", { email, ref: code });
    const raison = String(r.json.reason ?? "");
    if (!r.ok) {
      console.log(`   ECHEC (${r.statut ?? "reseau"}) : ${JSON.stringify(r.json).slice(0, 200)}`);
      process.exit(1);
    }
    if (raison === "rattache_a_un_autre") {
      // ON N'ECRASE PAS. Le premier rattachement gagne : prendre a l'un
      // pour donner a l'autre, en silence, n'est pas une option.
      console.log(
        `   ARRET : cette personne est DEJA rattachee a ${String(r.json.sa ?? "quelqu'un d'autre")}.\n` +
          "   Le premier rattachement gagne. Rien n'a ete change, rien ne sera credite.",
      );
      process.exit(1);
    }
    if (raison === "no_affiliate" || raison === "affiliate_not_registered") {
      console.log(
        `   ARRET : le code "${code}" ne designe aucun affilie ACTIF au registre.\n` +
          `   Lance : npm run check:lien-affilie -- ${code}`,
      );
      process.exit(1);
    }
    if (raison === "self") {
      console.log("   ARRET : on ne se rattache pas a soi meme.");
      process.exit(1);
    }
    console.log(`   ok (${raison || "rattache"})`);
  }

  // ── 3. LES COMMISSIONS DE CE QUI EST DÉJÀ ENCAISSÉ ──
  //
  // Le rattachement seul ne paie rien sur le PASSÉ : il désigne
  // l'affilié pour la suite. Les encaissements déjà faits se rejouent
  // un par un, avec la clé EXACTE que le webhook a envoyée, pour que
  // l'idempotence de Tipote fasse son travail.
  console.log(`\n2. Rejouer l'attribution de ses ${siennes.length} encaissement(s)`);
  let creees = 0;
  for (const v of siennes) {
    const cle = `${v.provider}:${v.ref}`;
    if (!POUR_DE_VRAI) {
      console.log(`   (blanc) ${cle}  ${euros(v.amountCents)}`);
      continue;
    }
    const r = await versTipote("/api/affiliate/attribute-sale", {
      customer_email: email,
      // LE MONTANT EST CELUI ENCAISSÉ, ET ON DIT QU'IL EST TTC.
      //
      // `base` est un paramètre OBLIGATOIRE, et un appelant muet est lu
      // comme TTC. Ici on ne sait PAS ventiler la TVA après coup (la
      // facture est déjà émise), donc on dit la vérité : c'est du TTC,
      // et Tipote en retire la taxe avec SON taux. Mentir en `ht`
      // paierait l'affilié 1,13 EUR de trop par vente (26 août).
      sale_amount_cents: Number(v.amountCents) || 0,
      currency: "EUR",
      source_app: "tiquiz",
      sio_order_id: cle,
      base: "ttc",
      regle_par: "nous",
      affiliate_code: code,
      affiliate_ref: null,
      product_name: nomProduitComplete(v) ?? v.productId ?? "Tiquiz",
      sale_at: v.paidAt,
      raw_payload: { source: "credit_manuel", reference: v.ref, decide_par: "bene" },
    });
    const etat = String((r.json.result as { status?: string } | undefined)?.status ?? "");
    const cents = Number((r.json.result as { commission_cents?: number } | undefined)?.commission_cents ?? 0);
    if (!r.ok) {
      console.log(`   ECHEC ${cle} (${r.statut ?? "reseau"})`);
      continue;
    }
    if (etat === "attributed") {
      creees += 1;
      console.log(`   ${cle} : commission creee, ${euros(cents)}`);
    } else if (etat === "duplicate") {
      console.log(`   ${cle} : deja commissionnee, rien n'a ete paye deux fois`);
    } else {
      console.log(`   ${cle} : ${etat || "reponse illisible"}`);
    }
  }

  console.log("");
  if (!POUR_DE_VRAI) {
    console.log(
      "BLANC : rien n'a ete ecrit. Pour le faire vraiment, relance la MEME commande\n" +
        "en ajoutant --pour-de-vrai a la fin.\n",
    );
  } else {
    console.log(
      `${creees} commission(s) creee(s). Elles murissent 30 jours, puis elles entrent\n` +
        "dans le prochain lot de versement. Aucun argent n'est parti d'ici : le virement\n" +
        "passe toujours par le fichier que tu deposes dans ta banque.\n",
    );
  }
}

main().catch((e) => {
  console.error(`\nImpossible : ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(2);
});
