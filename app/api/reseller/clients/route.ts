// app/api/reseller/clients/route.ts
//
// API du panel revendeur (phase 1, Béné 11 juin 2026).
//
// GET   : liste les clients du revendeur avec agrégats d'usage UNIQUEMENT
//         (nb quiz / sondages / popquiz, nb leads, plan, dernière
//         connexion). RGPD : jamais le contenu des quiz ni les leads.
// POST  : crée un compte client (email + prénom + plan) et envoie le
//         magic link d'accès. Anti-captation : refuse un email qui
//         correspond à un compte Tiquiz existant hors portefeuille.
// PATCH : renvoie l'email d'accès (magic link) à un client du
//         portefeuille.
//
// Toutes les requêtes passent par le service-role mais sont TOUJOURS
// scopées reseller_id (cf. lib/reseller.ts).

import { NextRequest, NextResponse } from "next/server";

import {
  getResellerSession,
  isPaidPlan,
  isResellerAllowedPlan,
  logResellerAction,
} from "@/lib/reseller";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://quiz.tipote.com").trim();

interface ClientProfileRow {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  plan: string;
  created_at: string;
}

async function sendAccessEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  // Magic link via le flux OTP standard Tiquiz (même pattern que
  // l'admin Béné : shouldCreateUser false, l'user doit déjà exister).
  const { createClient } = await import("@supabase/supabase-js");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await anonClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${APP_URL}/auth/callback`, shouldCreateUser: false },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// GET — clients du revendeur + agrégats d'usage (compteurs uniquement)
export async function GET() {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id,email,first_name,last_name,plan,created_at")
      .eq("reseller_id", session.reseller.id)
      .order("created_at", { ascending: false });
    if (profErr) throw profErr;

    const clients = (profiles ?? []) as ClientProfileRow[];
    const userIds = clients.map((c) => c.user_id);

    const quizCount: Record<string, number> = {};
    const surveyCount: Record<string, number> = {};
    const popquizCount: Record<string, number> = {};
    const leadCount: Record<string, number> = {};
    const lastSignIn: Record<string, string | null> = {};

    if (userIds.length > 0) {
      // Quiz + sondages (même table, discriminés par mode).
      const { data: quizzes, error: quizErr } = await supabaseAdmin
        .from("quizzes")
        .select("id,user_id,mode")
        .in("user_id", userIds);
      if (quizErr) throw quizErr;

      const quizIdToUser: Record<string, string> = {};
      for (const q of (quizzes ?? []) as Array<{ id: string; user_id: string; mode: string | null }>) {
        quizIdToUser[q.id] = q.user_id;
        if (q.mode === "survey") {
          surveyCount[q.user_id] = (surveyCount[q.user_id] ?? 0) + 1;
        } else {
          quizCount[q.user_id] = (quizCount[q.user_id] ?? 0) + 1;
        }
      }

      // Popquiz vidéo.
      const { data: popquizzes } = await supabaseAdmin
        .from("popquizzes")
        .select("user_id")
        .in("user_id", userIds);
      for (const p of (popquizzes ?? []) as Array<{ user_id: string }>) {
        popquizCount[p.user_id] = (popquizCount[p.user_id] ?? 0) + 1;
      }

      // Leads : COMPTEUR uniquement (jamais les données du lead).
      const quizIds = Object.keys(quizIdToUser);
      if (quizIds.length > 0) {
        const { data: leads } = await supabaseAdmin
          .from("quiz_leads")
          .select("quiz_id")
          .in("quiz_id", quizIds);
        for (const l of (leads ?? []) as Array<{ quiz_id: string }>) {
          const uid = quizIdToUser[l.quiz_id];
          if (uid) leadCount[uid] = (leadCount[uid] ?? 0) + 1;
        }
      }

      // Dernière connexion via l'API auth admin (paginé : le listing
      // global peut dépasser une page, on s'arrête dès qu'on a couvert
      // tous les clients du portefeuille).
      const wanted = new Set(userIds);
      let page = 1;
      while (wanted.size > 0 && page <= 20) {
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (authErr) break;
        const users = authData?.users ?? [];
        for (const u of users) {
          if (wanted.has(u.id)) {
            lastSignIn[u.id] = u.last_sign_in_at ?? null;
            wanted.delete(u.id);
          }
        }
        if (users.length < 1000) break;
        page += 1;
      }
    }

    const result = clients.map((c) => ({
      user_id: c.user_id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      plan: c.plan,
      is_paid: isPaidPlan(c.plan),
      created_at: c.created_at,
      quiz_count: quizCount[c.user_id] ?? 0,
      survey_count: surveyCount[c.user_id] ?? 0,
      popquiz_count: popquizCount[c.user_id] ?? 0,
      lead_count: leadCount[c.user_id] ?? 0,
      last_sign_in: lastSignIn[c.user_id] ?? null,
    }));

    return NextResponse.json({
      ok: true,
      reseller: { name: session.reseller.name },
      clients: result,
    });
  } catch (e) {
    console.error("[reseller/clients] GET failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
}

// POST — créer un compte client + envoyer le magic link d'accès
export async function POST(req: NextRequest) {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName =
      typeof body?.first_name === "string" ? body.first_name.trim() : "";
    const plan = body?.plan;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (!isResellerAllowedPlan(plan)) {
      return NextResponse.json({ ok: false, error: "invalid_plan" }, { status: 400 });
    }

    // Anti-captation : si l'email correspond déjà à un profil Tiquiz qui
    // n'est PAS dans le portefeuille du revendeur (client direct de Béné,
    // client d'un autre revendeur...), on refuse. Un revendeur ne peut
    // pas s'approprier un compte existant.
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id,reseller_id,plan")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile && existingProfile.reseller_id !== session.reseller.id) {
      return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
    }

    if (existingProfile && existingProfile.reseller_id === session.reseller.id) {
      // Déjà dans son portefeuille : idempotent, on renvoie juste l'accès.
      const sent = await sendAccessEmail(email);
      await logResellerAction({
        resellerId: session.reseller.id,
        actorUserId: session.userId,
        targetUserId: existingProfile.user_id,
        targetEmail: email,
        action: "resend_access",
        meta: { via: "create_existing", sent: sent.ok },
      });
      return NextResponse.json({ ok: true, already_exists: true, access_sent: sent.ok });
    }

    // Création du compte auth (email confirmé : l'accès passe par le
    // magic link, pas par un mot de passe).
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    let userId: string;
    if (created?.user) {
      userId = created.user.id;
    } else if (createErr?.message?.includes("already been registered")) {
      // Compte auth existant sans profil rattaché à ce revendeur : même
      // règle anti-captation, on refuse plutôt que de s'approprier.
      return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
    } else {
      throw createErr ?? new Error("createUser failed");
    }

    const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id: userId,
        email,
        plan,
        reseller_id: session.reseller.id,
        ...(firstName ? { first_name: firstName } : {}),
      },
      { onConflict: "user_id" },
    );
    if (upsertErr) throw upsertErr;

    // Audit plan initial dans le log standard (même table que webhook/admin).
    await supabaseAdmin.from("plan_change_log").insert({
      actor_user_id: session.userId,
      target_user_id: userId,
      target_email: email,
      old_plan: null,
      new_plan: plan,
      reason: `reseller_create:${session.reseller.id}`,
    });

    const sent = await sendAccessEmail(email);

    await logResellerAction({
      resellerId: session.reseller.id,
      actorUserId: session.userId,
      targetUserId: userId,
      targetEmail: email,
      action: "create_client",
      meta: { plan, access_sent: sent.ok },
    });

    return NextResponse.json({ ok: true, user_id: userId, access_sent: sent.ok });
  } catch (e) {
    console.error("[reseller/clients] POST failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
}

// PATCH — renvoyer l'email d'accès à un client du portefeuille
export async function PATCH(req: NextRequest) {
  const session = await getResellerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId =
      typeof body?.user_id === "string" ? body.user_id.trim() : "";
    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: "user_id_required" }, { status: 400 });
    }

    // Vérification d'appartenance au portefeuille AVANT toute action.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id,email,reseller_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!profile || profile.reseller_id !== session.reseller.id || !profile.email) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const sent = await sendAccessEmail(profile.email);
    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: "send_failed" }, { status: 400 });
    }

    await logResellerAction({
      resellerId: session.reseller.id,
      actorUserId: session.userId,
      targetUserId,
      targetEmail: profile.email,
      action: "resend_access",
      meta: {},
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reseller/clients] PATCH failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
  }
}
