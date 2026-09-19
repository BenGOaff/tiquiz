// scripts/check-cadeau-atelier.mts
//
// « ON EST CARRÉ POUR LA NOUVELLE FORMULE ? JE PEUX ENVOYER DU MONDE
//   DESSUS ? » (Béné, 19 septembre 2026)
//
//   npm run check:cadeau-atelier
//   npm run check:cadeau-atelier -- adresse@d-un-compte.fr
//
// -- POURQUOI CE SCRIPT EXISTE -----------------------------------------
//
// La chaîne du cadeau traverse DEUX applications et un paiement réel :
// Tiquiz décide (la fenêtre), l'Atelier ouvre l'accès, et entre les deux
// il y a un secret partagé qui peut ne pas être le même des deux côtés.
// Aucun écran ne peut dire si ça marche, et aucun test logique non plus :
// ils tournent sans réseau, par construction.
//
// Alors on va le DEMANDER au serveur, au lieu d'en être convaincu. C'est
// la règle du 31 août, celle des images en 403 : aller chercher l'URL et
// lire le code de réponse.
//
// -- IL NE FAIT RIEN PARTIR --------------------------------------------
//
// LECTURE SEULE. Le contrôle du secret se fait avec une adresse
// VOLONTAIREMENT invalide : la porte de l'Atelier valide le secret AVANT
// l'adresse, donc un `400 invalid_email` prouve que le secret est accepté
// alors qu'un `401` prouve qu'il est refusé, et dans les deux cas
// AUCUN accès n'est ouvert à personne.
//
// Il n'imprime AUCUN secret : les clés servent à interroger, elles ne
// sortent jamais du processus.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ATELIER_BASE_URL } from "@/lib/partner/atelierUrl";
import {
  cadeauAtelierOuvert,
  JOURS_FENETRE_INSCRIPTION,
  RATTRAPAGE_JOURS,
  RELANCES_JOURS,
} from "@/lib/cadeau/atelierOffert";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ON PARSE LE `.env`, ON NE L'EXÉCUTE PAS. `. .env` demande à bash
// d'interpréter tout le fichier, et une clé contenant un caractère
// spécial fait échouer le chargement entier (drame `login-link.mjs`).
// `.env.local` passe devant, comme chez Next.
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

const EMAIL = String(process.argv[2] ?? "").trim().toLowerCase();

let souci = 0;
let aveugle = 0;
function ok(t: string): void {
  console.log(`  ok     ${t}`);
}
function ko(t: string): void {
  souci += 1;
  console.log(`  MANQUE ${t}`);
}
/**
 * « JE N'AI PAS PU REGARDER » N'EST PAS « IL N'Y A RIEN ».
 *
 * C'est la faute qui a coute onze jours de compteur de trafic a zero, et
 * celle que ce script existe pour ne PAS refaire. Un point qu'on n'a pas
 * pu mesurer ne se compte donc ni comme bon, ni comme manquant : il se
 * compte a part, et il empeche le verdict de dire "tout va bien".
 */
function pasVu(t: string): void {
  aveugle += 1;
  console.log(`  A VOIR ${t}`);
}
function info(t: string): void {
  console.log(`         ${t}`);
}

async function sb(chemin: string): Promise<unknown[] | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${chemin}`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      info(`Supabase a repondu ${r.status} sur ${chemin.split("?")[0]}`);
      return null;
    }
    return (await r.json()) as unknown[];
  } catch (e) {
    info(`Supabase injoignable : ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

function jours(depuis: string, maintenant: Date): number {
  return Math.floor((maintenant.getTime() - Date.parse(depuis)) / 86_400_000);
}

async function main(): Promise<void> {
  const maintenant = new Date();
  console.log("");
  console.log("LA NOUVELLE FORMULE : L'ATELIER OFFERT SUR UN PASSAGE AU PAYANT");
  console.log(`(controle du ${maintenant.toISOString().slice(0, 10)}, lecture seule)`);
  console.log("");

  // SANS LES CLES, ON NE DIAGNOSTIQUE RIEN, ET ON LE DIT AVANT TOUT LE
  // RESTE. Sinon chaque point repond "pas lisible" et ca ressemble a une
  // panne, alors que c'est juste le mauvais dossier.
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log("LES CLES SUPABASE SONT ABSENTES DE CET ENVIRONNEMENT.");
    console.log("");
    console.log("Ce script ne peut donc RIEN conclure : ce n'est pas une panne, c'est");
    console.log("qu'il ne voit pas la base. Il se lance depuis le dossier de l'app,");
    console.log("sur le serveur, la ou vivent .env.local et .env :");
    console.log("");
    console.log("  cd /home/tipote/tiquiz-app && npm run check:cadeau-atelier");
    console.log("");
    process.exit(2);
  }

  // -------------------------------------------------- 1. LA COLONNE EXISTE
  console.log("1. LA MIGRATION EST PASSEE");
  const colonnes = await sb(
    "profiles?select=cadeau_atelier_offert_le,cadeau_atelier_fenetre&limit=1",
  );
  if (colonnes === null) {
    pasVu("les colonnes du cadeau n'ont pas pu etre lues (voir la raison ci dessus)");
    info("Sans elles, le cadeau ne peut PAS etre marque comme offert, donc il repartirait");
    info("a chaque paiement. Appliquer supabase/migrations/20260918_cadeau_atelier.sql.");
  } else {
    ok("profiles.cadeau_atelier_offert_le et .cadeau_atelier_fenetre repondent");
  }
  console.log("");

  // ------------------------------------- 2. LA PORTE DE L'ATELIER REPOND
  console.log("2. LA PORTE DE L'ATELIER REPOND, ET LE SECRET EST LE BON");
  const secret = String(process.env.PARTNER_SHARED_SECRET ?? "").trim();
  if (!secret) {
    ko("PARTNER_SHARED_SECRET absente de l'environnement de Tiquiz");
    info("Sans elle, le code note dans le journal que la personne a droit a l'Atelier,");
    info("et n'ouvre rien. Le cadeau serait annonce et jamais livre.");
  } else {
    ok("PARTNER_SHARED_SECRET est posee ici (sa valeur n'est pas affichee)");
    try {
      // Adresse VOLONTAIREMENT invalide : la porte valide le secret
      // AVANT l'adresse, donc rien ne s'ouvre, et le code de reponse
      // distingue les trois cas.
      const r = await fetch(`${ATELIER_BASE_URL}/api/partner/acces-offert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-partner-secret": secret },
        body: JSON.stringify({ email: "controle-sans-arobase", motif: "check" }),
        signal: AbortSignal.timeout(20_000),
      });
      if (r.status === 400) {
        ok(`l'Atelier accepte le secret (400 sur une adresse invalide, donc rien d'ouvert)`);
      } else if (r.status === 401) {
        ko("l'Atelier REFUSE le secret : les deux .env ne portent pas la meme valeur");
        info("Les deux fichiers doivent avoir le MEME PARTNER_SHARED_SECRET :");
        info("  /home/tipote/tiquiz-app/.env   et   /home/tipote/formaquiz/.env");
        info("Comparer sans les afficher :");
        info("  cmp <(grep -m1 '^PARTNER_SHARED_SECRET=' /home/tipote/tiquiz-app/.env) \\");
        info("      <(grep -m1 '^PARTNER_SHARED_SECRET=' /home/tipote/formaquiz/.env) && echo IDENTIQUES");
      } else if (r.status === 404) {
        ko("la porte n'existe pas encore sur l'Atelier : il n'est pas deploye");
        info("Deployer formaquiz AVANT Tiquiz, sinon Tiquiz appelle une porte absente.");
      } else {
        ko(`l'Atelier a repondu ${r.status}, ce qui n'est aucun des cas prevus`);
      }
    } catch (e) {
      ko(`l'Atelier est injoignable : ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log("");

  // ------------------------------------------------ 3. LE CRON DES RELANCES
  console.log("3. LES RELANCES DE 6 MOIS ET 1 AN");
  const relances = await sb(
    "profiles?select=email&or=(cadeau_atelier_relance_6mois_le.not.is.null," +
      "cadeau_atelier_relance_1an_le.not.is.null)&limit=1",
  );
  if (relances === null) {
    pasVu("les relances n'ont pas pu etre lues, voir plus haut");
  } else if (relances.length > 0) {
    ok("au moins une relance est partie : le cron tourne");
  } else {
    info("aucune relance encore partie. Ce n'est PAS forcement une panne : elles ne");
    info(`partent qu'a ${RELANCES_JOURS[0]} et ${RELANCES_JOURS[1]} jours de l'inscription.`);
    info("Mais sans la ligne de crontab, elles ne partiront JAMAIS. A verifier :");
    info("  crontab -l | grep cadeau-atelier      # doit rendre UNE ligne");
  }
  console.log("");

  // ------------------------------- 4. LES 7 JOURS, SUR DE VRAIS COMPTES
  console.log("4. QUI EST DANS LA FENETRE DES 7 JOURS EN CE MOMENT");
  const recents = await sb(
    "profiles?select=email,plan,created_at,cadeau_atelier_offert_le," +
      "cadeau_atelier_relance_6mois_le,cadeau_atelier_relance_1an_le" +
      `&created_at=gte.${new Date(Date.now() - 30 * 86_400_000).toISOString()}` +
      "&order=created_at.desc&limit=50",
  );
  if (recents === null) {
    pasVu("les inscriptions n'ont pas pu etre lues, voir plus haut");
  } else if (recents.length === 0) {
    info("aucune inscription depuis 30 jours : rien a verifier ici pour l'instant.");
  } else {
    let ouverts = 0;
    for (const brut of recents) {
      const p = brut as Record<string, unknown>;
      const v = cadeauAtelierOuvert(
        {
          inscritLe: (p.created_at as string | null) ?? null,
          relance6moisLe: (p.cadeau_atelier_relance_6mois_le as string | null) ?? null,
          relance1anLe: (p.cadeau_atelier_relance_1an_le as string | null) ?? null,
          offertLe: (p.cadeau_atelier_offert_le as string | null) ?? null,
        },
        maintenant,
      );
      if (v.ouvert) ouverts += 1;
    }
    ok(`${recents.length} inscription(s) sur 30 jours, dont ${ouverts} avec une fenetre OUVERTE`);
    info(`Une fenetre dure ${JOURS_FENETRE_INSCRIPTION} jours apres l'inscription gratuite.`);
  }
  console.log("");

  // --------------------------------------------- 5. UN COMPTE EN PARTICULIER
  if (EMAIL) {
    console.log(`5. LE COMPTE ${EMAIL}`);
    const l = await sb(
      "profiles?select=email,plan,created_at,cadeau_atelier_offert_le,cadeau_atelier_fenetre," +
        "cadeau_atelier_relance_6mois_le,cadeau_atelier_relance_1an_le&email=eq." +
        encodeURIComponent(EMAIL),
    );
    if (l === null) {
      pasVu("ce compte n'a pas pu etre lu, voir plus haut");
    } else if (l.length === 0) {
      info("aucun compte a cette adresse.");
    } else {
      const p = l[0] as Record<string, unknown>;
      const inscritLe = (p.created_at as string | null) ?? null;
      info(`plan            : ${String(p.plan ?? "(vide)")}`);
      info(
        `inscrit le      : ${inscritLe ? `${inscritLe.slice(0, 10)} (il y a ${jours(inscritLe, maintenant)} jours)` : "INCONNU"}`,
      );
      const v = cadeauAtelierOuvert(
        {
          inscritLe,
          relance6moisLe: (p.cadeau_atelier_relance_6mois_le as string | null) ?? null,
          relance1anLe: (p.cadeau_atelier_relance_1an_le as string | null) ?? null,
          offertLe: (p.cadeau_atelier_offert_le as string | null) ?? null,
        },
        maintenant,
      );
      if (v.ouvert) {
        info(`fenetre         : OUVERTE (${v.fenetre}), jusqu'au ${v.finLe.slice(0, 10)}`);
        info("S'il passe au payant maintenant, il recoit l'Atelier.");
      } else if (v.motif === "deja_offert") {
        info(`fenetre         : fermee, l'Atelier lui a DEJA ete offert`);
        info(`                  le ${String(p.cadeau_atelier_offert_le ?? "").slice(0, 10)} (fenetre ${String(p.cadeau_atelier_fenetre ?? "?")})`);
      } else {
        info(`fenetre         : FERMEE (${v.motif})`);
        if (v.motif === "hors_fenetre" && inscritLe) {
          const j = jours(inscritLe, maintenant);
          const prochaine = RELANCES_JOURS.find((r) => r >= j);
          info(
            prochaine
              ? `                  prochaine porte : la relance a ${prochaine} jours, dans ${prochaine - j} jours`
              : `                  plus aucune relance prevue (au dela de ${RELANCES_JOURS[1]} jours)`,
          );
        }
      }
    }
    console.log("");
  } else {
    console.log("5. UN COMPTE EN PARTICULIER");
    info("Pour regarder un compte precis :");
    info("  npm run check:cadeau-atelier -- adresse@d-un-compte.fr");
    console.log("");
  }

  // ------------------------------------------------------------ LE VERDICT
  console.log("----------------------------------------------------------");
  if (souci > 0) {
    console.log(`VERDICT : ${souci} point(s) a regler AVANT d'envoyer du monde.`);
    console.log("Chaque ligne MANQUE ci dessus dit quoi faire.");
    if (aveugle > 0) {
      console.log(`Et ${aveugle} point(s) n'ont pas pu etre mesures : relancer apres coup.`);
    }
  } else if (aveugle > 0) {
    console.log(`VERDICT : rien de casse trouve, mais ${aveugle} point(s) n'ont PAS pu etre`);
    console.log("mesures. Ce n'est donc pas un feu vert : c'est un controle incomplet.");
    console.log("Les lignes A VOIR ci dessus disent lesquels.");
  } else {
    console.log("VERDICT : la chaine du cadeau repond de bout en bout.");
    console.log("");
    console.log("Ce que ce script NE peut pas prouver, et qu'il faut savoir :");
    console.log("  - il ne fait pas de vrai paiement, donc il ne verifie pas que");
    console.log("    l'email du cadeau part bien. Le seul controle certain est un");
    console.log("    achat reel (ou un coupon a 100 %) depuis un compte gratuit de");
    console.log("    moins de 7 jours ;");
    console.log("  - la sequence de 7 jours vit chez Systeme.io, pas ici.");
  }
  console.log("");
  process.exit(souci > 0 ? 1 : aveugle > 0 ? 3 : 0);
}

void main();
