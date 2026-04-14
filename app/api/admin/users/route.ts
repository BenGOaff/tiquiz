// app/api/admin/users/route.ts
// Admin API: list users, update plan, create user
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

async function checkAdmin(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

// GET — list all users with their profiles, quiz count, lead count
export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get all profiles
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get quiz counts per user
    const { data: quizCounts } = await supabaseAdmin
      .from("quizzes")
      .select("user_id");

    // Get lead counts per user (via quizzes)
    const { data: allQuizzes } = await supabaseAdmin
      .from("quizzes")
      .select("id, user_id");

    const quizIds = (allQuizzes ?? []).map(q => q.id);
    let leadCounts: Record<string, number> = {};

    if (quizIds.length > 0) {
      const { data: leads } = await supabaseAdmin
        .from("quiz_leads")
        .select("quiz_id");

      const quizToUser: Record<string, string> = {};
      for (const q of allQuizzes ?? []) quizToUser[q.id] = q.user_id;

      for (const lead of leads ?? []) {
        const userId = quizToUser[lead.quiz_id];
        if (userId) leadCounts[userId] = (leadCounts[userId] ?? 0) + 1;
      }
    }

    // Count quizzes per user
    const quizCountMap: Record<string, number> = {};
    for (const q of quizCounts ?? []) {
      quizCountMap[q.user_id] = (quizCountMap[q.user_id] ?? 0) + 1;
    }

    // Get auth users for last sign in
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const authUsers = (authData as any)?.users ?? [];
    const authMap: Record<string, any> = {};
    for (const u of authUsers) authMap[u.id] = u;

    // Merge
    const users = (profiles ?? []).map((p: any) => ({
      ...p,
      quiz_count: quizCountMap[p.user_id ?? p.id] ?? 0,
      lead_count: leadCounts[p.user_id ?? p.id] ?? 0,
      last_sign_in: authMap[p.user_id ?? p.id]?.last_sign_in_at ?? null,
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

    if (!plan || !["free", "monthly", "yearly", "lifetime"].includes(plan)) {
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
      await anonClient.auth.signInWithOtp({ email: email.toLowerCase(), options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com"}/auth/callback`, shouldCreateUser: false } });
    }

    return NextResponse.json({ ok: true, user_id: userId, plan: resolvedPlan });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
