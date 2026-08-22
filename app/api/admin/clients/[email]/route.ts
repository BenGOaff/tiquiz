// app/api/admin/clients/[email]/route.ts
//
// UNE PERSONNE, ET TOUT CE QU'ON SAIT D'ELLE.
//
//   GET    -> { ok: true, personne, provenance }
//   PATCH  -> met à jour son nom
//
// Béné, 22 août : "Tu trouves ça pratique ? lisible ? facile à utiliser ?
// Quand j'aurai 200000 clients, je fais comment ? (...) Retrouver toutes
// ses infos, pouvoir mettre à jour ses infos, le rembourser, savoir d'où
// il vient, ce qu'il a comme accès, ce qu'il a payé."
//
// Elle a raison : un tiroir dans une liste sert à regarder, pas à
// travailler. D'où une page par personne.
//
// -- LA MÊME FONCTION QUE LA LISTE, PAS UNE DEUXIÈME --------------------
//
// L'état, les totaux et le rattachement des ventes passent par
// `buildPeople`, exactement comme le tableau. Recalculer ici donnerait
// une fiche qui affiche "Abonné" quand la liste dit "Part bientôt", et
// on sait où ça mène dans ce dépôt : c'est le défaut qui est sorti sept
// fois (les réseaux de partage, le score, l'alignement, la disposition
// des réponses, les contrôles profil sur un quiz scoré...).
//
// -- POURQUOI ON RELIT LES ÉVÉNEMENTS ----------------------------------
//
// Les ventes vivent dans `webhook_logs`, et l'adresse du client est
// DANS le payload JSON. On ne peut donc pas filtrer côté base sans
// parier sur la forme du JSON, et parier sur la forme d'un payload est
// exactement l'erreur du 7 août. On relit la même fenêtre que le tableau
// de bord et on filtre après, avec les fonctions déjà testées.

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { fetchAtelier } from "@/lib/admin/atelier";
import { buildPeople, type ChurnRow, type ProfileRow } from "@/lib/admin/people";
import { readProvenance, type LigneProvenance } from "@/lib/admin/provenance";
import { buildSioSales } from "@/lib/admin/sioSales";
import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** La fenêtre d'événements relue. La même que le tableau de bord. */
const FENETRE_EVENEMENTS = 3000;

async function garde(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 }),
    };
  }
  return { ok: true };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> },
): Promise<NextResponse> {
  const g = await garde();
  if (!g.ok) return g.res;

  // Next décode déjà le segment : `a%40b.fr` arrive en `a@b.fr`.
  const { email: brut } = await params;
  const email = decodeURIComponent(String(brut ?? "")).trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  }

  try {
    // 1. Son compte. Il peut ne pas exister : une élève de l'Atelier
    //    sans compte Tiquiz est une personne parfaitement légitime, et
    //    c'est même exactement la liste que Béné veut inviter.
    const { data: profil } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    const uid = profil ? String((profil as { user_id?: string; id?: string }).user_id ?? (profil as { id?: string }).id ?? "") : "";

    // 2. Ce qu'elle a produit, et sa dernière connexion.
    let quizCount = 0;
    let leadCount = 0;
    let derniereConnexion: string | null = null;
    if (uid) {
      const { data: quizzes } = await supabaseAdmin
        .from("quizzes")
        .select("id")
        .eq("user_id", uid);
      const ids = (quizzes ?? []).map((q) => String((q as { id: string }).id));
      quizCount = ids.length;
      if (ids.length) {
        const { count } = await supabaseAdmin
          .from("quiz_leads")
          .select("id", { count: "exact", head: true })
          .in("quiz_id", ids);
        leadCount = count ?? 0;
      }
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(uid);
      derniereConnexion = authUser?.user?.last_sign_in_at ?? null;
    }

    // 3. Le nom de son revendeur, en soft-fail (la table peut manquer).
    let resellerName: string | null = null;
    const resellerId = profil ? (profil as { reseller_id?: string | null }).reseller_id : null;
    if (resellerId) {
      const { data } = await supabaseAdmin
        .from("resellers")
        .select("name")
        .eq("id", resellerId)
        .maybeSingle();
      resellerName = (data as { name?: string } | null)?.name ?? null;
    }

    // 4. Les événements : ses ventes ET sa provenance sortent de là.
    const { data: events } = await supabaseAdmin
      .from("webhook_logs")
      .select("source, event_id, event_type, payload, created_at:received_at")
      .order("received_at", { ascending: false })
      .limit(FENETRE_EVENEMENTS);
    const lignes = (events ?? []) as unknown as EventRow[];
    const paiements = lignes.filter((l) =>
      ["stripe", "paypal", "systeme_io"].includes(String(l.source)),
    );
    const sales = [...buildSales(paiements), ...buildSioSales(paiements)];
    const provenance = readProvenance(lignes as unknown as LigneProvenance[], email);

    // 5. Ses départs, en soft-fail.
    let churn: ChurnRow[] = [];
    {
      const { data, error } = await supabaseAdmin
        .from("subscription_churn")
        .select("*")
        .eq("email", email)
        .order("cancelled_at", { ascending: false });
      if (!error) churn = (data ?? []) as unknown as ChurnRow[];
    }

    // 6. L'Atelier. Ne jette jamais ; dit s'il n'a pas répondu.
    const atelier = await fetchAtelier(process.env);
    const sonAtelier = atelier.people.filter((p) => p.email.toLowerCase() === email);
    const sesVentesAtelier = atelier.sales.filter(
      (v) => (v.email ?? "").toLowerCase() === email,
    );

    const ligneProfil: ProfileRow[] = profil
      ? [
          {
            user_id: uid,
            email,
            first_name: (profil as { first_name?: string | null }).first_name ?? null,
            last_name: (profil as { last_name?: string | null }).last_name ?? null,
            plan: (profil as { plan?: string | null }).plan ?? null,
            created_at: (profil as { created_at?: string | null }).created_at ?? null,
            last_sign_in: derniereConnexion,
            quiz_count: quizCount,
            lead_count: leadCount,
            stripe_customer_id:
              (profil as { stripe_customer_id?: string | null }).stripe_customer_id ?? null,
            reseller_name: resellerName,
          },
        ]
      : [];

    // LA MÊME FONCTION QUE LA LISTE. Une fiche qui recalculerait l'état
    // finirait par contredire le tableau.
    const vue = buildPeople({
      profiles: ligneProfil,
      sales: [...sales, ...sesVentesAtelier],
      churn,
      atelier: sonAtelier,
    });

    const personne = vue.people.find((p) => p.email === email) ?? null;
    if (!personne) {
      return NextResponse.json({ ok: false, reason: "introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      personne,
      provenance,
      // Une vente encaissée sans compte en face est exactement le drame
      // Ivan : on la remonte au lieu de l'écarter en silence.
      ventesOrphelines: vue.ventesOrphelines.filter(
        (v) => (v.email ?? "").toLowerCase() === email,
      ),
      atelierJoignable: atelier.reachable,
    });
  } catch (e) {
    console.error(`[admin/clients] ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ ok: false, reason: "read_failed" }, { status: 500 });
  }
}

/**
 * MET À JOUR SON NOM.
 *
 * Le PALIER, le lien de connexion et la suppression passent par
 * `/api/admin/users`, qui les fait déjà et qui est déjà éprouvé. Les
 * réécrire ici donnerait deux chemins pour la même action, et deux
 * chemins finissent toujours par diverger : c'est écrit sept fois dans
 * ce dépôt.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> },
): Promise<NextResponse> {
  const g = await garde();
  if (!g.ok) return g.res;

  const { email: brut } = await params;
  const email = decodeURIComponent(String(brut ?? "")).trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, reason: "invalid_email" }, { status: 400 });
  }

  let firstName = "";
  let lastName = "";
  try {
    const body = await req.json();
    firstName = String(body?.firstName ?? "").trim().slice(0, 80);
    lastName = String(body?.lastName ?? "").trim().slice(0, 80);
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ first_name: firstName || null, last_name: lastName || null })
    .eq("email", email);

  if (error) {
    // Un refus se NOMME. Sans ça, on chercherait un bug dans l'écran.
    console.error(`[admin/clients] maj nom ${email} : ${error.message}`);
    return NextResponse.json({ ok: false, reason: "write_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
