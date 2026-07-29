// app/api/me/atelier-status/route.ts
// Dit si l'utilisateur CONNECTE est un eleve de l'Atelier du Quiz.
// Interroge l'Atelier (formaquiz) par email, app-a-app avec le secret
// partage du pont. Sert a la carte de conversion de la sidebar : eleve
// -> "Recommande l'Atelier (70% de commission)", sinon -> "Decouvre
// l'Atelier". Best-effort : toute erreur repond hasAtelier=false (on
// montre alors la carte decouverte, jamais bloquant).
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const FORMAQUIZ_BASE = (process.env.FORMAQUIZ_BASE_URL ?? "https://quizing.tipote.com").trim();
const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const email = (user.email ?? "").trim().toLowerCase();
  if (!email || !SHARED) return NextResponse.json({ ok: true, hasAtelier: false });

  try {
    const res = await fetch(`${FORMAQUIZ_BASE}/api/partner/enrollment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-partner-secret": SHARED },
      body: JSON.stringify({ email }),
      cache: "no-store",
      // L'Atelier repond en ~100ms ; au dela de 4s on retombe sur la
      // carte decouverte plutot que de bloquer la sidebar.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return NextResponse.json({ ok: true, hasAtelier: false });
    const json = await res.json();
    return NextResponse.json({ ok: true, hasAtelier: json?.ok === true && json.enrolled === true });
  } catch {
    return NextResponse.json({ ok: true, hasAtelier: false });
  }
}
