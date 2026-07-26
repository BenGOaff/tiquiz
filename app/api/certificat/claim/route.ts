// app/api/certificat/claim/route.ts
// Genere (ou met a jour) le certificat de reussite de l'eleve. Plus
// d'examen : le seul prerequis est d'avoir TERMINE les 7 jours du
// parcours. L'eleve choisit librement le nom affiche (nom + prenom,
// marque, surnom...). Le numero de certificat est attribue une seule
// fois (a la premiere generation) et ne bouge plus, meme si l'eleve
// change ensuite le nom affiche.
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getViewer, getDaysWithProgress } from "@/lib/parcours";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanCertName } from "@/lib/certificateRender";
import {
  buildAffiliateLink,
  isValidAffiliateId,
  ATELIER_SALES_URL,
} from "@/lib/affiliate";

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

  // Garde-fou : le parcours (jours non-bonus) doit etre boucle.
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

  const body = (await req.json().catch(() => ({}))) as { displayName?: string };
  const name =
    cleanCertName(body.displayName) ||
    cleanCertName(viewer.profile?.full_name) ||
    cleanCertName(viewer.email) ||
    "Élève de l'Atelier";

  // Certificat deja delivre ? On garde le token ET le numero, on met juste
  // a jour le nom affiche. Si un ancien certificat (ere examen) n'a pas de
  // numero, on lui en attribue un maintenant.
  const { data: existing } = await supabaseAdmin
    .from("certificates")
    .select("share_token, cert_number")
    .eq("user_id", viewer.userId)
    .maybeSingle();

  let shareToken = (existing?.share_token as string) ?? makeToken();
  let certNumber = (existing?.cert_number as string) ?? null;

  if (!certNumber) {
    const { data: allocated, error: allocErr } = await supabaseAdmin.rpc(
      "allocate_cert_number",
    );
    if (allocErr || !allocated) {
      return NextResponse.json({ ok: false, reason: "number" }, { status: 500 });
    }
    certNumber = allocated as string;
  }

  // QR : lien affilie tracke de l'eleve s'il a renseigne son ID Systeme.io,
  // sinon lien de vente simple. Recalcule a chaque generation pour qu'un ID
  // ajoute apres coup soit pris en compte quand l'eleve regenere.
  const sa = viewer.profile?.sio_affiliate_id ?? null;
  const qrUrl =
    sa && isValidAffiliateId(sa) ? buildAffiliateLink(sa) : ATELIER_SALES_URL;

  const { error } = await supabaseAdmin.from("certificates").upsert(
    {
      user_id: viewer.userId,
      share_token: shareToken,
      cert_number: certNumber,
      full_name: name,
      qr_url: qrUrl,
      issued_at: existing ? undefined : new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, reason: "db" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    token: shareToken,
    number: certNumber,
    name,
  });
}
