// app/api/admin/pilotage/sante/route.ts
//
// LES SONDAGES QUE SEUL LE SERVEUR PEUT FAIRE.
//
// Trois choses qu'aucun écran ne peut voir depuis un navigateur :
//   - les tables dont la console dépend existent elles vraiment ;
//   - la clé Supabase et l'URL parlent elles du même projet ;
//   - les autres app répondent elles.
//
// LES DÉCISIONS VIVENT DANS `lib/pilotage/sante.ts`, pur et testé. Cette
// route sonde et rend des faits. Elle n'imprime JAMAIS une valeur de
// clé : ces réponses finissent dans un onglet réseau, parfois dans un
// copier-coller.

import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { fetchAtelier } from "@/lib/admin/atelier";
import { lireAffiliesDistants } from "@/lib/pilotage/affilies";
import { lireCleSupabase, refDepuisUrl } from "@/lib/env/supabaseProject";
import {
  DEPENDANCES_CONSOLE,
  lireSonde,
  sondesAffilie,
  type ResultatSonde,
} from "@/lib/pilotage/sante";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ce qu'on accepte d'attendre pour un sondage. Au delà, on le DIT. */
const DELAI_SONDE_MS = 6000;

/** Les raisons de `lireAffiliesDistants`, écrites pour un humain. */
const RAISON_AFFILIES: Record<string, string> = {
  not_configured: "PARTNER_SHARED_SECRET absente sur ce serveur",
  forbidden: "les deux serveurs n'ont pas le même secret",
  "pas-deploye": "la route partenaire n'est pas encore déployée là-bas",
  "trop-lent": "pas de réponse dans le délai",
  unreachable: "serveur injoignable",
  read_failed: "réponse inattendue",
};

/**
 * La table (ou la colonne) est elle là ?
 *
 * On demande UNE ligne, et on lit le code de retour. C'est la question
 * la moins chère qui distingue "absente" de "présente" sans rien lire
 * du contenu.
 */
async function sonder(
  base: string,
  cle: string,
  table: string,
  colonne?: string,
): Promise<{ statut: number; texte: string }> {
  const champ = colonne ? encodeURIComponent(colonne) : "*";
  try {
    const res = await fetch(`${base}/rest/v1/${table}?select=${champ}&limit=1`, {
      headers: { apikey: cle, Authorization: `Bearer ${cle}` },
      cache: "no-store",
      signal: AbortSignal.timeout(DELAI_SONDE_MS),
    });
    return { statut: res.status, texte: await res.text().catch(() => "") };
  } catch {
    // Injoignable n'est pas absent : on ne renvoie surtout pas 404, qui
    // enverrait appliquer une migration déjà passée.
    return { statut: 0, texte: "sondage impossible" };
  }
}

export async function GET(): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const cleService = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  // ── LA CLÉ PARLE-T-ELLE DU MÊME PROJET QUE L'URL ? ──
  //
  // Le 22 août, les deux app ont servi la base de l'autre pendant une
  // journée. Le diagnostic tenait en une comparaison, et personne ne
  // l'avait sous les yeux. On ne rend QUE les identifiants de projet,
  // jamais la clé.
  const refUrl = refDepuisUrl(url);
  const lecture = lireCleSupabase(cleService);
  const refCle = lecture.etat === "jwt" ? lecture.ref : null;
  const clesCoherentes =
    refUrl && refCle ? refUrl === refCle : null; // `null` = on n'a pas pu savoir.

  // ── LES TABLES DONT LA CONSOLE DÉPEND ──
  //
  // On ne sonde ICI que le Supabase de cette app : une table de l'autre
  // base se sonde de l'autre côté, et rendre un verdict sur une base
  // qu'on n'interroge pas serait une réponse inventée.
  let sondes: ResultatSonde[] | null = null;
  if (url && cleService) {
    sondes = await Promise.all(
      DEPENDANCES_CONSOLE.map(async (d) => {
        const r = await sonder(url, cleService, d.table, d.colonne);
        const etat = lireSonde(r.statut, r.texte);
        return {
          ...d,
          etat,
          detail: etat === "illisible" ? `${r.statut} ${r.texte.slice(0, 120)}` : undefined,
        };
      }),
    );
  }

  // ── LES LIAISONS ENTRE APP ──
  //
  // Une liaison muette ne casse rien : elle rend des chiffres
  // INCOMPLETS, ce qui est pire tant qu'on l'ignore.
  const [affilies, atelier] = await Promise.all([
    lireAffiliesDistants(),
    fetchAtelier(process.env),
  ]);

  // Ce que l'espace affilié dit ne pas avoir pu lire. Sans ça, une
  // migration en retard là-bas se lit ici comme un affilié qui n'a
  // aucun clic : un zéro qui passe pour une donnée.
  if (affilies.etat.ok) {
    const distantes = sondesAffilie(affilies.etat.manque);
    if (distantes.length > 0) sondes = [...(sondes ?? []), ...distantes];
  }

  const liaisons = [
    {
      nom: "L'espace affilié (Tipote)",
      ok: affilies.etat.ok,
      raison: affilies.etat.ok
        ? null
        : (RAISON_AFFILIES[affilies.etat.raison] ?? affilies.etat.raison),
    },
    {
      nom: "L'Atelier du Quiz",
      ok: atelier.reachable,
      raison: atelier.reachable ? null : (atelier.reason ?? null),
    },
  ];

  return NextResponse.json({
    ok: true,
    sondes,
    liaisons,
    supabase: {
      // Un identifiant de projet n'est pas un secret : il est dans
      // l'URL publique. C'est lui qui rend le diagnostic évident.
      refUrl,
      refCle,
      cleLisible: lecture.etat,
      coherentes: clesCoherentes,
    },
  });
}
