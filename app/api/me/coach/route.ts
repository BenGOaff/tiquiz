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

  // PAS de `sa` dans le lien que le coach proposera, et c'est un choix.
  //
  // Nos inscrits arrivent de Systeme.io, qui a deja pose son cookie
  // d'affiliation : un lien NU laisse ce cookie decider, donc l'affilie
  // qui a reellement amene la personne touche sa commission.
  //
  // Le seul identifiant que Tiquiz connaisse est
  // `profiles.tipote_affiliate_id`, celui de l'utilisateur EN TANT
  // QU'AFFILIE (son lien de pied de page). Le coller ici ecraserait
  // l'attribution du vrai parrain : ce serait exactement l'inverse de la
  // consigne "je ne veux jamais les leser".
  //
  // Le jour ou on stocke le parrain (capture du ?sa= a l'inscription),
  // il suffit de le passer en `affiliateSa` ci-dessous : le reste de la
  // chaine sait deja quoi en faire.

  try {
    const res = await callCoach({
      email: user.email.toLowerCase(),
      message: historyOnly ? "." : message,
      app: "tiquiz",
      context: typeof raw?.context === "string" ? raw.context.slice(0, 400) : undefined,
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
