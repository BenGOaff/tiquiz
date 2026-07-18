// app/api/integrations/tiquiz/start/route.ts
// Demarre la connexion 1-clic : pose un state anti-CSRF en cookie et
// redirige vers la page de consentement Tiquiz.
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { TIQUIZ_AUTHORIZE_URL } from "@/lib/integrations/tiquiz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(`${TIQUIZ_AUTHORIZE_URL}?state=${encodeURIComponent(state)}`);
  res.cookies.set("tiquiz_oauth_state", state, {
    httpOnly: true,
    // En dev (http://localhost) un cookie Secure est ignore par le
    // navigateur : on ne le force qu'en production.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
