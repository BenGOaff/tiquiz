// app/api/admin/resellers/route.ts
//
// Gestion des revendeurs par Béné (admin uniquement).
//
// GET    : liste des revendeurs + taille de portefeuille.
// POST   : promouvoir un user Tiquiz existant en revendeur { email, name }.
// PATCH  : activer / suspendre un revendeur { reseller_id, status }.
//          Suspendu = il perd l'accès à son panel, ses clients continuent
//          de fonctionner normalement (aucun impact sur leurs comptes).

import { NextRequest, NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/adminEmails";
import { commissionRateFor, isPaidPlan, type ResellerRow } from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkAdmin() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const { data: resellers, error } = await supabaseAdmin
      .from("resellers")
      .select("id,user_id,name,status,commission_tiers,created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;

    // Contrôle Béné : répartition complète du portefeuille de chaque
    // revendeur. Licence = compte payant (cf. lib/reseller.ts), un
    // compte gratuit n'est PAS une licence.
    const { data: clientRows } = await supabaseAdmin
      .from("profiles")
      .select("reseller_id,plan")
      .not("reseller_id", "is", null);

    interface Breakdown {
      total: number;
      licences: number;
      free: number;
      by_plan: Record<string, number>;
    }
    const breakdowns: Record<string, Breakdown> = {};
    for (const row of (clientRows ?? []) as Array<{ reseller_id: string; plan: string }>) {
      const b = (breakdowns[row.reseller_id] ??= {
        total: 0,
        licences: 0,
        free: 0,
        by_plan: {},
      });
      b.total += 1;
      if (isPaidPlan(row.plan)) b.licences += 1;
      else b.free += 1;
      b.by_plan[row.plan] = (b.by_plan[row.plan] ?? 0) + 1;
    }

    // Email du compte revendeur pour l'affichage admin.
    const userIds = (resellers ?? []).map((r) => r.user_id);
    const emails: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id,email")
        .in("user_id", userIds);
      for (const p of (profiles ?? []) as Array<{ user_id: string; email: string | null }>) {
        emails[p.user_id] = p.email;
      }
    }

    return NextResponse.json({
      ok: true,
      resellers: (resellers ?? []).map((r) => {
        const b = breakdowns[r.id] ?? { total: 0, licences: 0, free: 0, by_plan: {} };
        return {
          id: r.id,
          user_id: r.user_id,
          name: r.name,
          status: r.status,
          created_at: r.created_at,
          email: emails[r.user_id] ?? null,
          client_count: b.total,
          licence_count: b.licences,
          free_count: b.free,
          by_plan: b.by_plan,
          // Taux du palier courant selon le nombre de licences.
          current_rate: commissionRateFor(
            b.licences,
            (r.commission_tiers ?? []) as ResellerRow["commission_tiers"],
          ),
        };
      }),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!email || !name) {
      return NextResponse.json({ ok: false, error: "email_and_name_required" }, { status: 400 });
    }

    // Whitelist = revendeur (Béné 11 juin 2026). Si l'email n'a pas
    // encore de compte Tiquiz, on le crée à la volée (même flux que la
    // création de user admin : email confirmé + magic link envoyé).
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id,email")
      .eq("email", email)
      .maybeSingle();

    let resellerUserId = profile?.user_id as string | undefined;
    let accountCreated = false;

    if (!resellerUserId) {
      const { data: createdUser, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
        });

      if (createdUser?.user) {
        resellerUserId = createdUser.user.id;
      } else if (createErr?.message?.includes("already been registered")) {
        // Compte auth existant sans ligne profiles : on le retrouve.
        const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const found = (authData?.users ?? []).find(
          (u) => u.email?.toLowerCase() === email,
        );
        if (!found) {
          return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 500 });
        }
        resellerUserId = found.id;
      } else {
        throw createErr ?? new Error("createUser failed");
      }

      const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
        { user_id: resellerUserId, email, plan: "free" },
        { onConflict: "user_id" },
      );
      if (upsertErr) throw upsertErr;
      accountCreated = true;

      // Magic link d'accès (best-effort, même pattern que l'admin users).
      const { createClient } = await import("@supabase/supabase-js");
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      );
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim();
      await anonClient.auth
        .signInWithOtp({
          email,
          options: { emailRedirectTo: `${appUrl}/auth/callback`, shouldCreateUser: false },
        })
        .catch(() => {});
    }

    const { data: created, error } = await supabaseAdmin
      .from("resellers")
      .insert({ user_id: resellerUserId, name })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: false, error: "already_reseller" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, reseller_id: created.id, account_created: accountCreated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const resellerId = typeof body?.reseller_id === "string" ? body.reseller_id : "";
    const status = body?.status;
    if (!resellerId || (status !== "active" && status !== "suspended")) {
      return NextResponse.json({ ok: false, error: "invalid_params" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("resellers")
      .update({ status })
      .eq("id", resellerId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
