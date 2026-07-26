// app/api/integrations/tiquiz/callback/route.ts
// Retour du consentement Tiquiz : verifie le state, echange le code
// contre un token durable, enregistre la connexion et fait une premiere
// synchro des metriques. Redirige vers le dashboard.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  exchangeCodeForToken,
  saveConnection,
  syncMetrics,
} from "@/lib/integrations/tiquiz";

export const dynamic = "force-dynamic";

// Base de redirection : on prefere NEXT_PUBLIC_APP_URL (protocole/host
// fiables par environnement) plutot que req.url, dont le protocole peut
// basculer en https derriere un proxy / une redirection cross-app et
// casser le retour en dev (http://localhost:3002).
function appUrl(req: NextRequest, path: string): string {
  const env = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  const base = env || new URL(req.url).origin;
  return `${base}${path}`;
}

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(appUrl(req, "/login"));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("tiquiz_oauth_state")?.value;

  const fail = () => {
    const r = NextResponse.redirect(appUrl(req, "/dashboard?tiquiz=error"));
    r.cookies.delete("tiquiz_oauth_state");
    return r;
  };

  if (!code || !state || !cookieState || state !== cookieState) return fail();

  const exchanged = await exchangeCodeForToken(code);
  if (!exchanged) return fail();

  await saveConnection(user.id, exchanged.token, exchanged.tiquizUserId, exchanged.email);
  await syncMetrics(user.id); // premiere synchro (best-effort)

  const res = NextResponse.redirect(appUrl(req, "/dashboard?tiquiz=connected"));
  res.cookies.delete("tiquiz_oauth_state");
  return res;
}
