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
      .select("id,user_id,name,status,created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;

    const { data: counts } = await supabaseAdmin
      .from("profiles")
      .select("reseller_id")
      .not("reseller_id", "is", null);

    const countMap: Record<string, number> = {};
    for (const row of (counts ?? []) as Array<{ reseller_id: string }>) {
      countMap[row.reseller_id] = (countMap[row.reseller_id] ?? 0) + 1;
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
      resellers: (resellers ?? []).map((r) => ({
        ...r,
        email: emails[r.user_id] ?? null,
        client_count: countMap[r.id] ?? 0,
      })),
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

    // Le revendeur doit déjà avoir un compte Tiquiz (c'est son login).
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id,email")
      .eq("email", email)
      .maybeSingle();

    if (!profile?.user_id) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    const { data: created, error } = await supabaseAdmin
      .from("resellers")
      .insert({ user_id: profile.user_id, name })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: false, error: "already_reseller" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, reseller_id: created.id });
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
