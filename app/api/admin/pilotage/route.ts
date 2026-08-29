// app/api/admin/pilotage/route.ts
//
// TOUT CE QU'IL FAUT POUR PILOTER, EN UN SEUL APPEL.
//
//   GET  ->  { ok: true, people, totals, ventesOrphelines, tendance }
//
// Béné, 21 août : "tu peux pas centraliser ? Je vois les élèves, leurs
// infos + le bouton rembourser ? Au lieu d'avoir deux écrans... pas
// ouf..."
//
// -- POURQUOI UN SEUL APPEL, ET PAS TROIS -------------------------------
//
// Trois appels voudraient dire trois états de chargement, trois erreurs
// possibles, et surtout un écran qui peut afficher des comptes SANS
// leurs ventes pendant une seconde. Sur un tableau de bord d'argent,
// une seconde de chiffre faux est une seconde de trop : Béné lirait un
// total qui n'existe pas.
//
// -- LES VENTES SYSTEME.IO EN FONT PARTIE, ET C'EST ESSENTIEL ----------
//
// Béné, 21 août : "sur mon dashboard je dois retrouver mes clients
// actuels et ceux qui sont passés et passeront encore par systeme io
// sinon c'est tout sauf fiable et exhaustif."
//
// Elle a raison. La totalité de ses clients payants d'aujourd'hui sont
// arrivés par Systeme.io : sans eux l'écran afficherait un chiffre
// d'affaires proche de zéro, ce qui est pire qu'un écran vide parce que
// ça a l'air de marcher. La donnée était déjà là, dans `webhook_logs`
// depuis le drame Ivan : il ne manquait qu'un lecteur.
//
// -- L'ATELIER AUSSI, PAR UNE LIAISON EN LECTURE SEULE -----------------
//
// Ses données vivent dans une autre app, avec sa propre base. Tiquiz va
// donc les CHERCHER (`lib/admin/atelier.ts`), avec le secret partagé qui
// existe déjà entre les deux serveurs.
//
// **Et si l'Atelier ne répond pas, on le DIT.** L'écran s'affiche quand
// même (une panne de l'Atelier ne doit pas priver Béné de son tableau de
// bord Tiquiz), mais il annonce qu'il est incomplet. C'est la règle du
// 8 juin : on n'affiche pas un total dont le dénominateur ment. Un
// chiffre d'affaires amputé de moitié sans prévenir vaut moins que pas
// de chiffre, parce qu'il a l'air juste.

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { buildSioSales } from "@/lib/admin/sioSales";
import { buildPeople, monthlyTrend, type ChurnRow, type ProfileRow } from "@/lib/admin/people";
import { fetchAtelier } from "@/lib/admin/atelier";
import { lirePeriode, tronqueeParLeJournal, DEBUT_DU_JOURNAL } from "@/lib/pilotage/periode";
import { resumePeriode } from "@/lib/pilotage/resumePeriode";
import { lireCoutAffiliation } from "@/lib/pilotage/affilies";
import { buildMrr, serieChurn } from "@/lib/admin/mrr";
import { derniersMois } from "@/lib/admin/adminStats";
import { GENRE_VENTE_ORPHELINE } from "@/lib/pilotage/alertes";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Récupère TOUTES les lignes en paginant.
 *
 * Un `.select()` simple est plafonné à 1000 lignes côté PostgREST. Sans
 * cette boucle, le tableau de bord se tronquerait en silence passé 1000
 * comptes, et Béné lirait un total faux sans que rien ne le signale.
 * C'est le drame du 27 juin, sur une donnée qui compte encore plus.
 */
async function toutesLesLignes(
  table: string,
  colonnes: string,
  ordre: string,
): Promise<Record<string, unknown>[]> {
  const taille = 1000;
  const tout: Record<string, unknown>[] = [];
  for (let from = 0; ; from += taille) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(colonnes)
      .order(ordre, { ascending: true })
      .range(from, from + taille - 1);
    if (error) throw error;
    const lot = (data ?? []) as unknown as Record<string, unknown>[];
    tout.push(...lot);
    if (lot.length < taille) break;
  }
  return tout;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  // L'HEURE EST PRISE ICI, jamais dans une fonction pure : un calcul qui
  // lit l'horloge tout seul n'est pas testable, et un test qui dépend de
  // l'heure clignote.
  const maintenant = new Date();
  const periode = lirePeriode(req.nextUrl.searchParams, maintenant);

  try {
    const profiles = await toutesLesLignes("profiles", "*", "user_id");
    const quizzes = await toutesLesLignes("quizzes", "id, user_id", "id");
    const leads = await toutesLesLignes("quiz_leads", "quiz_id", "id");

    const quizParUser: Record<string, number> = {};
    const quizVersUser: Record<string, string> = {};
    for (const q of quizzes) {
      const uid = String(q.user_id);
      quizVersUser[String(q.id)] = uid;
      quizParUser[uid] = (quizParUser[uid] ?? 0) + 1;
    }
    const leadsParUser: Record<string, number> = {};
    for (const l of leads) {
      const uid = quizVersUser[String(l.quiz_id)];
      if (uid) leadsParUser[uid] = (leadsParUser[uid] ?? 0) + 1;
    }

    // La derniere connexion vit dans `auth.users`, pas dans `profiles`.
    const derniereConnexion: Record<string, string | null> = {};
    for (let page = 1; ; page++) {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      const lot = (data?.users ?? []) as { id: string; last_sign_in_at?: string | null }[];
      for (const u of lot) derniereConnexion[u.id] = u.last_sign_in_at ?? null;
      if (lot.length < 1000) break;
    }

    // Le nom du revendeur, en SOFT-FAIL : tant que la migration n'est pas
    // passee la table n'existe pas, et l'ecran doit marcher quand meme.
    const revendeurs: Record<string, string> = {};
    {
      const { data, error } = await supabaseAdmin.from("resellers").select("id,name");
      if (!error) {
        for (const r of (data ?? []) as { id: string; name: string }[]) revendeurs[r.id] = r.name;
      }
    }

    // LES VENTES. On lit large : le tableau de bord doit pouvoir
    // comparer deux mois, donc il lui faut plus que les dernieres.
    const { data: events, error: errEvents } = await supabaseAdmin
      .from("webhook_logs")
      // `created_at:received_at` : l'alias PostgREST evite de faire
      // porter a la fonction pure une difference de nom de colonne.
      .select("source, event_id, event_type, payload, created_at:received_at")
      // SYSTEME.IO EST DANS LA LISTE, et c'est le point qui rend l'ecran
      // fiable : c'est de la que viennent tous les clients payants
      // d'aujourd'hui.
      .in("source", ["stripe", "paypal", "systeme_io"])
      .order("received_at", { ascending: false })
      .limit(3000);
    if (errEvents) throw errEvents;
    const lignesEvents = (events ?? []) as unknown as EventRow[];
    // Deux lecteurs, deux formats de payload, une seule liste ensuite.
    // Chacun ignore ce qui ne le concerne pas (il filtre sur `source`),
    // donc aucune vente ne peut etre comptee deux fois.
    const sales = [...buildSales(lignesEvents), ...buildSioSales(lignesEvents)];

    // LES DEPARTS, en soft-fail eux aussi : si la migration du 21 aout
    // n'est pas encore passee, l'ecran doit s'afficher sans eux plutot
    // que de tomber. Mieux vaut la donnee telle quelle qu'un ecran vide.
    let churn: ChurnRow[] = [];
    {
      const { data, error } = await supabaseAdmin
        .from("subscription_churn")
        .select("*")
        .order("cancelled_at", { ascending: false })
        .limit(2000);
      if (error) {
        console.warn(
          `[admin/pilotage] departs illisibles (${error.message}). ` +
            `Si la table est absente, appliquer supabase/migrations/20260821_subscription_churn.sql.`,
        );
      } else {
        churn = (data ?? []) as unknown as ChurnRow[];
      }
    }

    // L'ATELIER, en parallele du reste. Ne jette jamais : rend
    // `reachable: false` si quoi que ce soit cloche.
    const atelier = await fetchAtelier(process.env);

    const lignes: ProfileRow[] = profiles.map((p) => {
      const uid = String(p.user_id ?? p.id ?? "");
      return {
        user_id: uid,
        email: (p.email as string) ?? null,
        first_name: (p.first_name as string) ?? null,
        last_name: (p.last_name as string) ?? null,
        plan: (p.plan as string) ?? null,
        created_at: (p.created_at as string) ?? null,
        last_sign_in: derniereConnexion[uid] ?? null,
        quiz_count: quizParUser[uid] ?? 0,
        lead_count: leadsParUser[uid] ?? 0,
        stripe_customer_id: (p.stripe_customer_id as string) ?? null,
        // Le mois offert. Absent tant que la migration
        // 20260823_mois_offert.sql n'est pas passee : `?? null` et pas
        // une valeur par defaut, sinon l'ecran dirait "jamais eu de mois
        // offert" sur tout le monde, ce qui serait faux sans se voir.
        free_month_granted_at: (p.free_month_granted_at as string) ?? null,
        free_month_source: (p.free_month_source as string) ?? null,
        free_month_sa: (p.free_month_sa as string) ?? null,
        free_month_flag: (p.free_month_flag as string) ?? null,
        reseller_name: p.reseller_id ? revendeurs[String(p.reseller_id)] ?? null : null,
      };
    });

    const vue = buildPeople({
      profiles: lignes,
      sales: [...sales, ...atelier.sales],
      churn,
      atelier: atelier.people,
    });

    return NextResponse.json({
      ok: true,
      ...vue,
      // L'heure est prise ICI, jamais dans la fonction pure : un calcul
      // qui lit l'horloge tout seul n'est pas testable, et un test qui
      // depend de l'heure est un test qui clignote (1er aout).
      tendance: monthlyTrend(sales, new Date()),
      // LA PÉRIODE GOUVERNE TOUT L'ÉCRAN, ou elle ment. Un sélecteur qui
      // ne déplacerait que le graphique pendant que les compteurs
      // parlent d'autre chose met deux chiffres contradictoires sur la
      // même page, et c'est celui du haut qu'on croit.
      periode: { ...periode, tronquee: tronqueeParLeJournal(periode), depuis: DEBUT_DU_JOURNAL },
      resume: resumePeriode({
        sales: [...sales, ...atelier.sales],
        people: vue.people,
        periode,
        maintenant,
      }),
      // L'ENCAISSÉ PAR MOIS, RÉPARTI PAR PRODUIT, calculé ICI.
      //
      // Le graphique en a besoin, mais on n'envoie pas les ventes au
      // navigateur pour autant : elles portent les adresses des
      // clients, et un écran n'a pas à recevoir ce qu'il n'affiche pas.
      // L'Atelier est inclus, sinon le total ne serait pas le total.
      // LES ALERTES DÉJÀ TRAITÉES. Une alerte qui ne peut pas s'éteindre
      // cesse d'être lue, et le jour où une vraie apparaît à côté,
      // personne ne la voit. On rend les références, l'écran range.
      //
      // Une table absente ne prive de RIEN : on rend une liste vide,
      // donc toutes les alertes restent actives. C'est le bon sens de
      // l'échec ici, l'inverse cacherait des ventes.
      alertesTraitees: await lireTraitees(),
      // LE RÉCURRENT ET LE CHURN, calculés sur les mêmes personnes que
      // le reste : deux lectures séparées finiraient par se contredire.
      mrr: buildMrr(vue.people),
      churn: serieChurn(vue.people, derniersMois(maintenant, 12)),
      // CE QUI SORT, sur la MÊME période que ce qui rentre. `null` =
      // on n'a pas pu lire, ce qui n'est PAS un coût de zéro : l'écran
      // doit dire la différence, sinon il affiche une marge fausse.
      coutAffiliation: await lireCoutAffiliation({
        debut: periode.debut,
        fin: periode.fin,
      }),
      // Le nombre d'evenements lus, pour que l'ecran puisse dire
      // honnetement "sur les N derniers" au lieu de laisser croire que
      // c'est tout l'historique.
      evenementsLus: events?.length ?? 0,
      // L'ecran DOIT pouvoir dire "il manque l'Atelier". Sans ca, une
      // panne de liaison passerait pour un mois sans ventes.
      atelier: { reachable: atelier.reachable, reason: atelier.reason ?? null },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[admin/pilotage] lecture impossible : ${message}`);
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 500 });
  }
}

/** Les références d'alertes déjà traitées. Jamais bloquant. */
async function lireTraitees(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("alertes_traitees")
    .select("reference")
    .eq("genre", GENRE_VENTE_ORPHELINE)
    .limit(2000);
  if (error) {
    console.error(`[admin/pilotage] alertes traitees illisibles : ${error.message}`);
    return [];
  }
  return ((data as { reference: string }[] | null) ?? []).map((r) => r.reference);
}
