// scripts/audit-affiliation.mts
//
// « IL FAUT ÊTRE SÛRE À 200 % QU'UN AFFILIÉ NE VA PAS PERDRE SA COM
//   PARCE QUE NOTRE SYSTÈME AURAIT FOIRÉ » (Béné, 17 septembre 2026)
//
//   npm run audit:affiliation             # les 60 derniers jours
//   npm run audit:affiliation -- 180      # plus loin dans l'historique
//
// -- CE QU'IL RÉPOND, ET POURQUOI UN ÉCRAN NE PEUT PAS LE FAIRE --------
//
// Le tableau de bord lit NOTRE base. Le registre des affiliés vit chez
// Tipote, et les commissions aussi. Tant qu'on ne rapproche pas les
// deux, "aucun affilié sur cette vente" et "on n'a pas regardé" se
// lisent pareil à l'écran, et c'est la deuxième qui coûte de l'argent à
// quelqu'un.
//
// Ce script rapproche, encaissement par encaissement :
//
//   1. NOS VENTES, lues dans `webhook_logs` avec les MÊMES fonctions que
//      le tableau de bord (`buildSales`, `completerVentes`). Un deuxième
//      lecteur écrit à la main finirait par dire autre chose que
//      l'écran, et on ne saurait plus lequel croire ;
//   2. LES COMMISSIONS de Tipote (`/api/partner/affiliate-payouts`),
//      rapprochées par la clé de l'encaissement (`stripe:<facture>`,
//      `paypal:<vente>`), qui est exactement celle que le webhook a
//      envoyée ;
//   3. LES RATTACHEMENTS de Tipote (`/api/partner/affilies`) : qui a été
//      amené par qui, y compris par une inscription GRATUITE, qui
//      rattache à vie.
//
// -- LE CAS QU'IL EXISTE POUR TROUVER ----------------------------------
//
// Une personne RATTACHÉE à un affilié, qui a payé, et dont
// l'encaissement ne porte AUCUNE commission. C'est la seule situation où
// quelqu'un est lésé sans que rien ne le dise, et c'est celle qu'aucun
// écran ne pouvait voir.
//
// -- IL NE FAIT RIEN PARTIR, ET C'EST VOLONTAIRE ----------------------
//
// LECTURE SEULE, sans option pour en sortir. La règle de ces dépôts est
// qu'aucun argent ne part d'un écran ni d'une commande : réparer une
// commission manquante, c'est rejouer l'attribution, et ça se décide en
// regardant le cas, pas en lançant un audit. Le script dit donc QUOI
// faire et sur quelle clé, il ne le fait pas.
//
// Il n'imprime AUCUN secret : les clés servent à interroger, elles ne
// sortent jamais du processus.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { buildSioSales } from "@/lib/admin/sioSales";
import { completerVentes, etatCommission, nomProduitComplete } from "@/lib/ventes/identite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ON PARSE LE `.env`, ON NE L'EXÉCUTE PAS. `. .env` demande à bash
// d'interpréter tout le fichier, et une clé contenant un caractère
// spécial fait échouer le chargement entier (drame `login-link.mjs`,
// 4 août). `.env.local` passe devant, comme chez Next.
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
      "Cherchees dans le terminal, puis dans .env.local et .env a la racine du depot.",
  );
  process.exit(2);
}

const JOURS = Math.min(Math.max(Number(process.argv[2] ?? 60) || 60, 1), 730);
const DEPUIS = new Date(Date.now() - JOURS * 24 * 60 * 60 * 1000).toISOString();

const TIPOTE = (() => {
  // Jamais une adresse locale : un `??` ne protege que de la variable
  // absente, jamais de la variable fausse (drame Veronique, 2 aout).
  const brut = String(process.env.TIPOTE_BASE_URL ?? "").trim();
  if (/^https:\/\//i.test(brut) && !/localhost|127\.|::1|\.local/i.test(brut)) {
    return brut.replace(/\/+$/, "");
  }
  return "https://app.tipote.com";
})();
const PARTNER_SECRET = String(process.env.PARTNER_SHARED_SECRET ?? "").trim();

// ── LES LECTURES ──────────────────────────────────────────────────────

async function supa<T>(chemin: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase a repondu ${res.status} sur ${chemin.split("?")[0]}`);
  }
  return (await res.json()) as T;
}

/** Une lecture chez Tipote. Ne jette pas : rend `null` et on le DIT. */
async function tipote<T>(chemin: string): Promise<T | null> {
  if (!PARTNER_SECRET) return null;
  try {
    const res = await fetch(`${TIPOTE}${chemin}`, {
      headers: { "x-partner-secret": PARTNER_SECRET },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.error(`  ! Tipote a repondu ${res.status} sur ${chemin}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`  ! Tipote injoignable sur ${chemin} : ${(e as Error).message}`);
    return null;
  }
}

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} EUR`;
}
function jour(iso: string | null | undefined): string {
  const t = Date.parse(String(iso ?? ""));
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : "date inconnue";
}

// ── LE PROGRAMME ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nAUDIT D'AFFILIATION, sur ${JOURS} jours (depuis le ${jour(DEPUIS)})\n`);

  // 1. NOS ENCAISSEMENTS, avec les memes fonctions que l'ecran.
  const events = await supa<EventRow[]>(
    "webhook_logs?select=source,event_id,event_type,payload,status,created_at:received_at" +
      `&source=in.(stripe,paypal,systeme_io)&received_at=gte.${DEPUIS}` +
      "&order=received_at.desc&limit=5000",
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

  // Les fiches d'identite, si la migration est passee. Une table absente
  // ne bloque pas l'audit : elle en retire une colonne, et on le dit.
  const fiches: Record<string, { commission_statut: string | null; commission_affilie: string | null }> = {};
  let fichesLisibles = true;
  try {
    const lignes = await supa<
      { provider: string; reference: string; commission_statut: string | null; commission_affilie: string | null }[]
    >("ventes_identite?select=provider,reference,commission_statut,commission_affilie&limit=5000");
    for (const l of lignes) fiches[`${l.provider}:${l.reference}`] = l;
  } catch {
    fichesLisibles = false;
  }

  const ventes = completerVentes(
    [...buildSales(events), ...buildSioSales(events)],
    {
      // Les fiches ne servent ici qu'a afficher le verdict deja connu :
      // le rapprochement de verite se fait avec Tipote, plus bas.
      fiches: {},
      emailParAbonnement,
    },
  ).filter((v) => Date.parse(v.paidAt) >= Date.parse(DEPUIS));

  // 2. CE QUE TIPOTE A VRAIMENT CRÉÉ, par cle d'encaissement.
  const payouts = await tipote<{
    ok?: boolean;
    rows?: { sa: string; name: string | null; orderId: string | null; commissionCents: number; status: string; refundedAt: string | null }[];
  }>("/api/partner/affiliate-payouts");
  const affilies = await tipote<{ ok?: boolean; attributions?: Record<string, string> }>(
    "/api/partner/affilies",
  );

  const commissionParCle = new Map<
    string,
    { sa: string; nom: string | null; cents: number; status: string; refundedAt: string | null }
  >();
  const lignesTipote = payouts?.rows ?? null;
  let sansCle = 0;
  for (const r of lignesTipote ?? []) {
    const cle = String(r.orderId ?? "").trim();
    if (!cle) {
      sansCle += 1;
      continue;
    }
    commissionParCle.set(cle, {
      sa: r.sa,
      nom: r.name,
      cents: Number(r.commissionCents) || 0,
      status: r.status,
      refundedAt: r.refundedAt,
    });
  }
  const rattachements = affilies?.attributions ?? {};

  // ── « AUCUNE COMMISSION NE PORTE DE CLÉ » EST AMBIGU, ET C'ÉTAIT UN
  //    DÉFAUT DE CE SCRIPT (corrigé le 18 septembre 2026) ──
  //
  // Sa première sortie disait cette phrase là, et elle pouvait vouloir
  // dire DEUX choses opposées :
  //
  //   - le registre ne porte aucune commission (une vraie réponse) ;
  //   - la version de Tipote DÉPLOYÉE ne rend pas encore `orderId`
  //     (aucune réponse du tout, et le champ est arrivé le même jour).
  //
  // Le deuxième cas se lisait comme le premier, c'est à dire comme une
  // commission manquante. C'est exactement la faute que ce script
  // existe pour empêcher, commise par le script lui même.
  //
  // On DIT laquelle des deux, en comptant : des lignes sans aucune clé,
  // c'est le déploiement ; zéro ligne, c'est le registre.
  const cleAbsenteDeTipote = lignesTipote != null && sansCle > 0 && commissionParCle.size === 0;
  const registreVide = lignesTipote != null && lignesTipote.length === 0;

  // ── CE QU'ON N'A PAS PU REGARDER SE DIT AVANT LE RESTE ──
  //
  // Un audit qui conclut "tout va bien" alors qu'une de ses trois
  // sources est muette est exactement le vert trompeur de ce depot.
  const muettes: string[] = [];
  if (!PARTNER_SECRET) muettes.push("PARTNER_SHARED_SECRET absente : Tipote n'a pas ete interroge");
  else {
    if (!payouts?.rows) muettes.push("les commissions de Tipote n'ont pas pu etre lues");
    if (!affilies?.attributions) muettes.push("les rattachements de Tipote n'ont pas pu etre lus");
  }
  if (!fichesLisibles) {
    muettes.push(
      "la table ventes_identite est absente (migration 20260918_ventes_identite.sql non appliquee)",
    );
  }
  if (cleAbsenteDeTipote) {
    muettes.push(
      `Tipote rend ${sansCle} commission(s) SANS leur cle d'encaissement : sa version deployee ` +
        "n'a pas le champ `orderId` (arrive le 17 septembre 2026). Je ne peux donc PAS rapprocher " +
        "une vente de sa commission. Deployer tipote-app, puis relancer cet audit.",
    );
  }
  if (muettes.length > 0) {
    console.log("CE QUE JE N'AI PAS PU REGARDER :");
    for (const m of muettes) console.log(`  - ${m}`);
    console.log("");
  }

  // ── LE RAPPROCHEMENT, LIGNE PAR LIGNE ──
  const aRegarder: string[] = [];
  let payees = 0;
  let sansAffilie = 0;
  let ailleurs = 0;

  for (const v of ventes) {
    const cle = `${v.provider}:${v.ref}`;
    const commission = commissionParCle.get(cle) ?? null;
    const email = (v.email ?? "").toLowerCase();
    const rattacheA = email ? rattachements[email] ?? null : null;
    const etat = etatCommission(v);
    const produit = nomProduitComplete(v) ?? v.productId ?? "produit non identifie";
    const fiche = fiches[cle] ?? null;

    const entete =
      `${jour(v.paidAt)}  ${euros(v.amountCents).padStart(10)}  ${v.provider.padEnd(10)} ` +
      `${(v.email ?? "ADRESSE INCONNUE").padEnd(34)} ${produit}`;

    // ── LE CAS QUI COÛTE : rattache, a paye, aucune commission ──
    const notreEncaissement = v.provider !== "systeme_io" && v.origine !== "hors_bon_de_commande";
    if (notreEncaissement && Number(v.amountCents) > 0 && !v.refundedAt && !commission) {
      if (rattacheA) {
        aRegarder.push(
          `${entete}\n    !! ${rattacheA} a amene cette personne, et AUCUNE commission n'existe ` +
            `sur cet encaissement.\n       Cle a rejouer : ${cle}` +
            (fiche?.commission_statut ? `\n       Ce que le webhook avait note : ${fiche.commission_statut}` : ""),
        );
        continue;
      }
      if (cleAbsenteDeTipote) {
        // LE RAPPROCHEMENT EST IMPOSSIBLE, ce n'est pas une commission
        // manquante. La cause est dite une fois en haut ; ici on ne
        // conclut RIEN sur cette vente.
        aRegarder.push(
          `${entete}\n    ?  je ne peux pas dire : Tipote ne rend pas encore la cle des ` +
            `commissions (voir le haut).` +
            (rattacheA ? `\n       En revanche, ${rattacheA} a bien amene cette personne.` : ""),
        );
        continue;
      }
      if (registreVide) {
        // Le registre a repondu, et il est VIDE : aucune commission
        // n'existe, pour personne. C'est une vraie reponse.
        aRegarder.push(
          `${entete}\n    !! le registre de Tipote ne porte AUCUNE commission : ` +
            `aucun affilie n'a jamais ete paye sur nos encaissements.` +
            `\n       Cle a rejouer : ${cle}`,
        );
        continue;
      }
      // Pas de rattachement connu ET pas de commission : la personne est
      // probablement arrivee seule. On le dit comme une PROBABILITE
      // seulement si les rattachements ont pu etre lus.
      if (!affilies?.attributions) {
        aRegarder.push(
          `${entete}\n    ?  aucune commission, et les rattachements n'ont pas pu etre lus : ` +
            `on ne peut PAS conclure qu'elle est arrivee seule.`,
        );
        continue;
      }
      sansAffilie += 1;
      continue;
    }

    if (commission) {
      payees += 1;
      continue;
    }
    if (etat === "reglee_ailleurs" || etat === "rien_a_devoir") {
      ailleurs += 1;
      continue;
    }
    if (v.refundedAt) continue;
    aRegarder.push(`${entete}\n    ?  etat ${etat}, aucune commission trouvee.`);
  }

  // ── LE BILAN ──
  console.log(`${ventes.length} encaissement(s) sur la periode.\n`);
  if (lignesTipote != null) {
    console.log(
      `  Chez Tipote : ${lignesTipote.length} commission(s) au registre, ` +
        `dont ${commissionParCle.size} avec leur cle d'encaissement.\n`,
    );
  }
  console.log(`  ${payees} avec une commission creee chez Tipote`);
  console.log(`  ${sansAffilie} sans affilie rattache, et sans commission : arrivees seules`);
  console.log(`  ${ailleurs} hors de notre bon de commande, ou a zero euro (rien n'etait du)`);
  console.log(`  ${aRegarder.length} A REGARDER\n`);

  if (aRegarder.length === 0) {
    console.log(
      muettes.length === 0 && !cleAbsenteDeTipote
        ? "Aucun affilie lese sur la periode. Les trois sources ont repondu.\n"
        : "Rien a regarder dans ce qui a pu etre lu. Voir la liste du haut pour le reste.\n",
    );
  } else {
    console.log("LES LIGNES A REGARDER :\n");
    for (const l of aRegarder) console.log(`${l}\n`);
    console.log(
      "Pour reparer une commission manquante : la cle est celle a rejouer vers\n" +
        "/api/affiliate/attribute-sale chez Tipote. Elle est idempotente (elle repond\n" +
        "`duplicate` sur une cle deja connue), donc un rejeu ne paie jamais deux fois.\n" +
        "Ce script ne le fait PAS tout seul : un versement ne se reprend pas.\n",
    );
  }

  // Un audit qui a trouve quelque chose sort en erreur : une commande
  // lancee depuis un cron doit pouvoir le voir sans lire le texte.
  process.exit(aRegarder.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`\nAudit impossible : ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(2);
});
