// scripts/check-lien-affilie.mts
//
// EST-CE QUE LE LIEN DE CET AFFILIÉ PAIE VRAIMENT ?
//
//   npm run check:lien-affilie -- pereiradelima86
//
// -- POURQUOI CE SCRIPT EXISTE (Béné, 18 septembre 2026) ---------------
//
// "J'ai fait 2 présentations live et plusieurs personnes étaient
// intéressées et auraient dû passer par le lien de Greg."
//
// La question derrière est celle du 17 : est-ce que quelqu'un peut
// perdre sa commission à cause de nous ? Sur un lien affilié, la chaîne
// a quatre maillons, et trois d'entre eux se cassent SANS RIEN CASSER
// À L'ÉCRAN :
//
//   1. le code existe au registre, et l'affilié est ACTIF ;
//   2. l'adresse du lien est sur NOS domaines (un lien qui atterrit
//      chez Systeme.io ne paie plus personne depuis le 24 août) ;
//   3. la réponse pose bien le cookie `tq_ref` ;
//   4. et elle n'est PAS servie depuis un cache (une réponse en cache
//      n'arrive jamais jusqu'à nous : pas de clic compté, pas de
//      cookie, pas de commission, et la page s'affiche parfaitement).
//
// Le maillon 4 est celui qui fait le plus peur, parce qu'il est
// invisible : l'affilié voit sa page, et ses chiffres restent à zéro.
//
// -- ET C'EST LA RÈGLE PAYÉE LE 31 AOÛT --------------------------------
//
// "Quand un changement déplace l'endroit d'où quelque chose est SERVI,
// la dernière étape n'est pas d'écrire la configuration : c'est d'aller
// chercher l'URL et de lire le code de réponse." Ce script ne raisonne
// donc pas sur le code : il VA CHERCHER la page, en prod, et il lit ce
// que le serveur répond.
//
// -- IL NE FAUSSE PAS LES CHIFFRES DE L'AFFILIÉ -----------------------
//
// LU DANS `lib/affiliate/signalerClic.ts`, pas supposé : un clic n'est
// compté que si l'en tête `accept` demande `text/html`
// (`clicASignaler`). Ce script demande donc autre chose, et le clic
// n'est pas compté. Le cookie, lui, est posé quand même : le middleware
// applique `poseSa()` sur TOUTES ses sorties, indépendamment du
// comptage. C'est exactement ce qu'on veut vérifier, sans rien salir.
//
// (Un en tête maison, `x-tiquiz-controle`, aurait marché aussi. Il
// n'existe pas : l'inventer aurait voulu dire écrire du code dans le
// middleware pour le lire, donc toucher au chemin de TOUTES les
// requêtes pour le confort d'un script. Le mécanisme qui existe déjà
// coûte zéro ligne en production.)
//
// LECTURE SEULE. Il n'imprime AUCUN secret.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { REF_COOKIE, REF_PARAM } from "@/lib/affiliate/refLien";

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

const code = String(process.argv[2] ?? "").trim().toLowerCase();
if (!code) {
  console.error(
    "Usage : npm run check:lien-affilie -- <code>\n" +
      "Exemple : npm run check:lien-affilie -- pereiradelima86",
  );
  process.exit(2);
}

const TIPOTE = (() => {
  const brut = String(process.env.TIPOTE_BASE_URL ?? "").trim();
  if (/^https:\/\//i.test(brut) && !/localhost|127\.|::1|\.local/i.test(brut)) {
    return brut.replace(/\/+$/, "");
  }
  return "https://app.tipote.com";
})();
const PARTNER_SECRET = String(process.env.PARTNER_SHARED_SECRET ?? "").trim();

/**
 * LES ADRESSES À TESTER.
 *
 * Écrites ici et pas lues chez Tipote : c'est un CONTRÔLE, et un
 * contrôle qui lit sa réponse à la même source que ce qu'il vérifie ne
 * vérifie rien. Elles doivent correspondre à `lib/affiliate/
 * linkDestinations.ts` du dépôt Tipote ; si elles divergent, c'est
 * justement ce qu'on veut voir.
 */
const A_TESTER = [
  "https://tiquiz.fr/",
  "https://tiquiz.fr/commande/mensuel",
  "https://tiquiz.fr/signup",
];

let echecs = 0;
function bon(texte: string): void {
  console.log(`  ok   ${texte}`);
}
function mauvais(texte: string): void {
  echecs += 1;
  console.log(`  NON  ${texte}`);
}

async function main(): Promise<void> {
  console.log(`\nLE LIEN DE "${code}", MAILLON PAR MAILLON\n`);

  // ── 1. LE CODE EXISTE-T-IL, ET L'AFFILIÉ EST-IL ACTIF ? ──
  console.log("1. Le code au registre de Tipote");
  if (!PARTNER_SECRET) {
    mauvais("PARTNER_SHARED_SECRET absente : je n'ai pas pu demander a Tipote.");
  } else {
    try {
      const res = await fetch(`${TIPOTE}/api/partner/affilies`, {
        headers: { "x-partner-secret": PARTNER_SECRET },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        mauvais(`Tipote a repondu ${res.status} : je n'ai pas pu verifier le code.`);
      } else {
        const j = (await res.json()) as {
          lignes?: { sa: string; ref: string | null; nom: string | null; email: string; statut: string }[];
        };
        const lignes = j.lignes ?? [];
        const lui = lignes.find((l) => String(l.ref ?? "").trim().toLowerCase() === code);
        if (!lui) {
          mauvais(
            `AUCUN affilie ne porte le code "${code}" au registre. Ses liens ne paient personne.`,
          );
          const proches = lignes
            .filter((l) => String(l.ref ?? "").toLowerCase().includes(code.slice(0, 6)))
            .slice(0, 5);
          if (proches.length > 0) {
            console.log(
              `       Codes qui y ressemblent : ${proches.map((p) => p.ref).join(", ")}`,
            );
          }
          console.log(`       ${lignes.length} affilie(s) au registre.`);
        } else if (lui.statut !== "active") {
          mauvais(`Le code existe, mais l'affilie est "${lui.statut}" : rien ne lui sera du.`);
        } else {
          // LE `sa` NE S'IMPRIME PAS EN ENTIER. Ce n'est pas un secret au
          // sens strict (il vivait dans les URL jusqu'au 24 aout), mais
          // les liens `?sa=` restent LUS pour attribuer : le connaitre
          // suffit a s'attribuer une vente. Et un terminal se colle dans
          // une conversation. Les six premiers caracteres suffisent a le
          // reconnaitre dans le registre.
          bon(`Le code est celui de ${lui.nom ?? lui.email} (${lui.sa.slice(0, 6)}...), actif.`);
        }
      }
    } catch (e) {
      mauvais(`Tipote injoignable : ${(e as Error).message}`);
    }
  }

  // ── 2, 3 et 4. CE QUE LE SERVEUR RÉPOND VRAIMENT ──
  console.log("\n2. Ce que nos pages repondent a ce lien");
  for (const base of A_TESTER) {
    const url = `${base}${base.includes("?") ? "&" : "?"}${REF_PARAM}=${encodeURIComponent(code)}`;
    try {
      const res = await fetch(url, {
        redirect: "manual",
        headers: {
          // ON NE FAUSSE PAS SES STATISTIQUES. `clicASignaler` exige
          // `text/html` pour compter un clic : en demandant autre
          // chose, ce controle n'en compte aucun. Le cookie, lui, est
          // pose sur toutes les sorties du middleware, donc on le voit
          // quand meme. Verifie dans le code, pas suppose.
          accept: "application/xhtml+xml",
          "user-agent": "tiquiz-check-lien-affilie",
          // Une reponse fraiche, sinon on mesure le cache du script.
          "cache-control": "no-cache",
        },
        signal: AbortSignal.timeout(20000),
      });

      const cookies = [
        ...(typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : []),
        res.headers.get("set-cookie") ?? "",
      ].filter(Boolean);
      const poseLeCookie = cookies.some((c) => c.includes(`${REF_COOKIE}=${code}`));
      const cf = res.headers.get("cf-cache-status");
      const cache = res.headers.get("cache-control") ?? "";

      console.log(`\n   ${url}`);
      console.log(`   HTTP ${res.status}${cf ? `, cf-cache-status ${cf}` : ""}`);

      if (res.status >= 400) {
        mauvais(`la page repond ${res.status} : le lien mene a une erreur.`);
        continue;
      }
      if (poseLeCookie) bon(`le cookie ${REF_COOKIE}=${code} est pose.`);
      else mauvais(`le cookie ${REF_COOKIE} n'est PAS pose : cette vente ne paiera personne.`);

      // LE CACHE EST LE PIÈGE INVISIBLE. Une reponse servie depuis un
      // cache n'arrive jamais jusqu'a nous : pas de clic, pas de
      // cookie, et la page s'affiche parfaitement.
      if (cf && /^HIT/i.test(cf)) {
        mauvais(`servie depuis le cache Cloudflare (${cf}) : le clic n'est pas compte.`);
      } else if (/no-store|private/i.test(cache)) {
        bon("la reponse dit explicitement de ne pas la mettre en cache.");
      } else if (cf) {
        bon(`pas servie depuis le cache (${cf}).`);
      }
    } catch (e) {
      mauvais(`${url} injoignable : ${(e as Error).message}`);
    }
  }

  console.log("");
  if (echecs === 0) {
    console.log(
      `Le lien de "${code}" marche de bout en bout : le code est au registre, les pages\n` +
        "posent le cookie, et rien n'est servi depuis un cache. Une vente faite par\n" +
        "quelqu'un qui a cliqué dessus lui sera commissionnée.\n",
    );
  } else {
    console.log(
      `${echecs} maillon(s) a regarder. Tant qu'il en reste un, une personne qui clique\n` +
        `sur le lien de "${code}" peut acheter sans que rien ne lui soit verse.\n`,
    );
  }
  process.exit(echecs > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`\nControle impossible : ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(2);
});
