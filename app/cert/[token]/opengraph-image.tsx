// app/cert/[token]/opengraph-image.tsx — apercu social (Open Graph) du
// certificat. On sert le VRAI certificat (template + nom + numero), rendu
// a une taille adaptee au partage. Runtime Node (lecture table + assets).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderCertificate, cleanCertName } from "@/lib/certificateRender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const alt = "Certificat de réussite - L'Atelier du Quiz";
// Ratio du certificat (2000x1414). Les reseaux acceptent ce format et le
// recadrent proprement.
export const size = { width: 1200, height: 848 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data } = await supabaseAdmin
    .from("certificates")
    .select("full_name, cert_number, qr_url")
    .eq("share_token", token)
    .maybeSingle();

  const name =
    cleanCertName((data?.full_name as string) ?? "") || "Élève de l'Atelier";
  const number = (data?.cert_number as string) ?? "";
  const qrUrl = (data?.qr_url as string) ?? null;

  return renderCertificate({ name, number, qrUrl, width: size.width });
}
