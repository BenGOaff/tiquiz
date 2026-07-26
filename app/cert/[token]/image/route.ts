// app/cert/[token]/image/route.ts
// PNG du certificat, servi par token. Sert a la fois :
//   - l'apercu affiche a l'eleve (inline),
//   - le telechargement (?dl=1 -> piece jointe),
//   - l'apercu admin (miniature).
// Lecture de la ligne via la service_role (pas de policy publique sur la
// table certificates). Rendu par lib/certificateRender.
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderCertificate, cleanCertName } from "@/lib/certificateRender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { data } = await supabaseAdmin
    .from("certificates")
    .select("full_name, cert_number, qr_url")
    .eq("share_token", token)
    .maybeSingle();

  if (!data) {
    return new Response("Certificat introuvable", { status: 404 });
  }

  const name = cleanCertName((data.full_name as string) ?? "") || "Élève de l'Atelier";
  const number = (data.cert_number as string) ?? "";
  const qrUrl = (data.qr_url as string) ?? null;

  const url = new URL(req.url);
  // Largeur bornee : miniature admin legere, telechargement pleine def.
  const wRaw = Number.parseInt(url.searchParams.get("w") ?? "", 10);
  const width = Number.isFinite(wRaw) ? Math.min(2000, Math.max(600, wRaw)) : 2000;
  const download = url.searchParams.get("dl") === "1";

  const img = await renderCertificate({ name, number, qrUrl, width });

  // ImageResponse fixe deja Content-Type + cache. Pour forcer le
  // telechargement, on re-emballe le flux avec une entete Content-Disposition.
  if (download) {
    const headers = new Headers(img.headers);
    headers.set(
      "Content-Disposition",
      `attachment; filename="certificat-atelier-du-quiz-${number || "reussite"}.png"`,
    );
    return new Response(img.body, { status: 200, headers });
  }

  return img;
}
