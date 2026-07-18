// app/api/certificat/submit/route.ts
// Corrige l'examen de certification cote serveur. Si l'eleve atteint le
// seuil, on cree (ou met a jour) son certificat et on renvoie le token
// de partage. La correction ne fait JAMAIS confiance au client : les
// bonnes reponses ne quittent pas le serveur (cf. lib/certification).
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getViewer, getDaysWithProgress } from "@/lib/parcours";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { scoreExam } from "@/lib/certification";

function makeToken(): string {
  // 12 caracteres url-safe, suffisant et non devinable.
  return randomBytes(9).toString("base64url");
}

export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });
  }
  if (!viewer.enrolled) {
    return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403 });
  }

  // Garde-fou : le parcours doit etre termine avant de passer l'examen.
  const days = await getDaysWithProgress(viewer.userId);
  const parcours = days.filter((d) => !d.is_bonus);
  const allDone =
    parcours.length > 0 && parcours.every((d) => d.progress === "completed");
  if (!allDone) {
    return NextResponse.json(
      { ok: false, reason: "parcours_incomplete" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    answers?: Record<string, string>;
  };
  const answers = body.answers ?? {};

  const { score, total, passed } = scoreExam(answers);

  if (!passed) {
    return NextResponse.json({ ok: true, passed: false, score, total });
  }

  // Reussi : on cree le certificat, ou on met a jour le score en gardant
  // le token de partage existant (les liens deja partages restent valides).
  const fullName =
    viewer.profile?.full_name?.trim() ||
    viewer.email ||
    "Élève de l'Atelier";

  const { data: existing } = await supabaseAdmin
    .from("certificates")
    .select("share_token")
    .eq("user_id", viewer.userId)
    .maybeSingle();

  const shareToken = (existing?.share_token as string) ?? makeToken();

  const { error } = await supabaseAdmin.from("certificates").upsert(
    {
      user_id: viewer.userId,
      share_token: shareToken,
      full_name: fullName,
      score,
      total,
      issued_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, reason: "db" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, passed: true, score, total, token: shareToken });
}
