// app/api/me/coach/route.ts
//
// Le coach de Tiquiz N'EST PAS un coach Tiquiz : c'est le coach de
// l'Atelier, joint par le pont app-a-app (demande Béné, 2 août 2026).
// Un seul cerveau, une seule base de connaissances, une seule
// conversation qui suit d'une app à l'autre.
//
// Cette route ne fait que trois choses : identifier l'utilisateur
// connecté, ajouter ce qu'il regarde à cet instant, et transmettre. Le
// secret partagé ne quitte JAMAIS le serveur.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMAQUIZ_BASE = (process.env.FORMAQUIZ_BASE_URL ?? "https://quizing.tipote.com").trim();
const SHARED = (process.env.PARTNER_SHARED_SECRET ?? "").trim();

type Payload = {
  message?: unknown;
  context?: unknown;
  historyOnly?: boolean;
};

async function callCoach(body: Record<string, unknown>) {
  return fetch(`${FORMAQUIZ_BASE}/api/partner/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-partner-secret": SHARED },
    body: JSON.stringify(body),
    cache: "no-store",
    // Une réponse de coach prend quelques secondes ; au delà de 45s on
    // rend la main plutôt que de laisser tourner une roue sans fin.
    signal: AbortSignal.timeout(45_000),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  }
  if (!SHARED) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const raw = (await req.json().catch(() => null)) as Payload | null;
  const historyOnly = raw?.historyOnly === true;
  const message = typeof raw?.message === "string" ? raw.message.trim() : "";
  if (!historyOnly && !message) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }

  // L'identifiant affilié du parrain, pour que le lien proposé par le
  // coach lui soit attribué. On l'envoie seulement si on l'a : un `sa`
  // inventé volerait la commission de quelqu'un d'autre.
  let affiliateSa: string | undefined;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("referrer_sa")
      .eq("id", user.id)
      .maybeSingle();
    const v = (data as { referrer_sa?: string | null } | null)?.referrer_sa;
    if (typeof v === "string" && v.trim()) affiliateSa = v.trim();
  } catch {
    // Colonne absente ou erreur : le coach répond, le lien sera nu.
  }

  try {
    const res = await callCoach({
      email: user.email.toLowerCase(),
      message: historyOnly ? "." : message,
      app: "tiquiz",
      context: typeof raw?.context === "string" ? raw.context.slice(0, 400) : undefined,
      affiliateSa,
      historyOnly,
    });
    const json = await res.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ ok: false, reason: "bridge_failed" }, { status: 502 });
    }
    // On transmet tel quel, y compris les refus de quota : le widget sait
    // les afficher avec la porte de sortie que le coach a choisie.
    return NextResponse.json(json, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ ok: false, reason: "bridge_failed" }, { status: 502 });
  }
}
