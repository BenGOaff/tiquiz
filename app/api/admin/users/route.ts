// app/api/admin/users/route.ts
// Admin API: list users, update plan, create user
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminEmail } from "@/lib/adminEmails";
import { resolveAppUrl } from "@/lib/authLinks";

export const dynamic = "force-dynamic";

async function checkAdmin(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

// Récupère TOUTES les lignes d'une table en paginant. Indispensable : un
// `.select()` simple est plafonné à 1000 lignes côté PostgREST, ce qui
// figeait "Total leads" à 1000 dès qu'il y avait plus de 1000 leads (stat
// fausse, drame 27 juin 2026). On ordonne sur une colonne stable pour que
// la pagination ne saute / ne duplique aucune ligne.
async function fetchAllRows(
  table: string,
  columns: string,
  orderCol: string,
  ascending = true,
): Promise<Record<string, unknown>[]> {
  const pageSize = 1000;
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .order(orderCol, { ascending })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as unknown as Record<string, unknown>[];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

// GET — list all users with their profiles, quiz count, lead count
export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Tout est paginé (voir fetchAllRows) : sinon "Total leads" plafonne à
    // 1000 et la liste users se tronque silencieusement passé 1000 comptes.
    const profiles = await fetchAllRows("profiles", "*", "user_id", true);
    const allQuizzes = await fetchAllRows("quizzes", "id, user_id", "id");
    const allLeads = await fetchAllRows("quiz_leads", "quiz_id", "id");

    // Quiz par user + map quiz->user en une seule passe (plus de double
    // requête `quizzes` redondante).
    const quizCountMap: Record<string, number> = {};
    const quizToUser: Record<string, string> = {};
    for (const q of allQuizzes) {
      const uid = String(q.user_id);
      quizToUser[String(q.id)] = uid;
      quizCountMap[uid] = (quizCountMap[uid] ?? 0) + 1;
    }

    // Leads par user (via quiz_id → user). Compte TOUS les leads (quiz +
    // sondages, qui vivent dans la même table quiz_leads).
    const leadCounts: Record<string, number> = {};
    for (const lead of allLeads) {
      const userId = quizToUser[String(lead.quiz_id)];
      if (userId) leadCounts[userId] = (leadCounts[userId] ?? 0) + 1;
    }

    // Auth users (last sign in) — paginé aussi : listUsers plafonne à perPage
    // par page, donc on boucle tant qu'une page est pleine.
    type AuthUserLite = { id: string; last_sign_in_at?: string | null };
    const authMap: Record<string, AuthUserLite> = {};
    for (let page = 1; ; page++) {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      const batch = (authData?.users ?? []) as AuthUserLite[];
      for (const u of batch) authMap[u.id] = u;
      if (batch.length < 1000) break;
    }

    // Map reseller_id -> nom du revendeur pour le badge admin. Soft-fail :
    // tant que la migration resellers n'est pas appliquée en prod, la
    // table n'existe pas et on continue sans badge (admin intact).
    const resellerNames: Record<string, string> = {};
    {
      const { data: resellers, error: resErr } = await supabaseAdmin
        .from("resellers")
        .select("id,name");
      if (!resErr) {
        for (const r of (resellers ?? []) as Array<{ id: string; name: string }>) {
          resellerNames[r.id] = r.name;
        }
      }
    }

    // Merge
    const users = (profiles ?? []).map((p: any) => ({
      ...p,
      quiz_count: quizCountMap[p.user_id ?? p.id] ?? 0,
      lead_count: leadCounts[p.user_id ?? p.id] ?? 0,
      last_sign_in: authMap[p.user_id ?? p.id]?.last_sign_in_at ?? null,
      reseller_name: p.reseller_id ? resellerNames[p.reseller_id] ?? null : null,
    }));

    return NextResponse.json({ ok: true, users });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// POST — update user plan
export async function POST(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { user_id, email, plan } = body;

    if (!plan || !["free", "monthly", "monthly_plus", "yearly", "yearly_plus", "lifetime"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (user_id) {
      const { error } = await supabaseAdmin.from("profiles").update({ plan }).eq("user_id", user_id);
      if (error) throw error;
    } else if (email) {
      const { error } = await supabaseAdmin.from("profiles").update({ plan }).eq("email", email.toLowerCase());
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "user_id or email required" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, plan });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// PUT — create new user with magic link
export async function PUT(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { email, plan, send_magic_link } = await req.json();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const resolvedPlan = plan || "free";

    // Create auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
    });

    let userId: string;
    if (created?.user) {
      userId = created.user.id;
    } else if (createErr?.message?.includes("already been registered")) {
      // Find existing
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const found = ((authData as any)?.users ?? []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) return NextResponse.json({ error: "User exists but not found" }, { status: 500 });
      userId = found.id;
    } else {
      throw createErr;
    }

    // Upsert profile
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      email: email.toLowerCase(),
      plan: resolvedPlan,
    }, { onConflict: "user_id" });

    // Send magic link if requested
    if (send_magic_link) {
      const { createClient } = await import("@supabase/supabase-js");
      const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      await anonClient.auth.signInWithOtp({ email: email.toLowerCase(), options: { emailRedirectTo: `${resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin)}/auth/callback`, shouldCreateUser: false } });
    }

    return NextResponse.json({ ok: true, user_id: userId, plan: resolvedPlan });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// PATCH — Admin: resend a magic link to an existing user.
// Defensive: we DON'T create a user here (shouldCreateUser:false). If the
// user disappeared from auth.users (rare race), the call fails silently
// Supabase-side and we surface a clear error to the admin.
export async function PATCH(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });

    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, req.nextUrl.origin);
    const { error } = await anonClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/auth/callback`, shouldCreateUser: false },
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

// DELETE — Admin: hard-delete a user. Cascade-deletes everything tied
// to auth.users (profile, quizzes, leads, popquizzes, etc.) via the
// ON DELETE CASCADE FKs declared on each public table (001_initial,
// 020_consent, 026_popquiz…). Irréversible — l'UI demande une
// confirmation explicite avant d'appeler.
export async function DELETE(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
    if (!userId) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    if (userId === admin.id) {
      return NextResponse.json({ ok: false, error: "Cannot delete yourself" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
