// app/api/partner/authorize/route.ts
// Etape de consentement (cote Tiquiz) : l'utilisateur CONNECTE autorise
// FormaQuiz a lire ses metriques. On cree un code a usage unique (TTL
// 10 min) et on renvoie l'URL de retour vers FormaQuiz (callback FIXE,
// jamais pris depuis la requete, pour eviter les redirections ouvertes).
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomSecret, hashSecret } from "@/lib/partner/tokens";
import { atelierConnectCallback } from "@/lib/partner/atelierUrl";

export const dynamic = "force-dynamic";

// Le domaine vit dans lib/partner/atelierUrl.ts, jamais ici : cette URL
// pointait encore sur formaquiz.tipote.com, mort depuis le rebrand du 18
// juin, donc le retour du consentement tombait sur un 404 (Bene, 3 aout).

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { state?: unknown };
  const state = typeof body.state === "string" ? body.state.slice(0, 256) : "";
  if (!state) return NextResponse.json({ ok: false, reason: "no_state" }, { status: 400 });

  const code = randomSecret();
  const { error } = await supabaseAdmin.from("partner_auth_codes").insert({
    code_hash: hashSecret(code),
    user_id: user.id,
    partner: "formaquiz",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 500 });

  const redirect = `${atelierConnectCallback()}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  return NextResponse.json({ ok: true, redirect });
}
