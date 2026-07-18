// app/cert/[token]/opengraph-image.tsx — image d'apercu (1200x630) du
// certificat, generee a la volee pour le partage social. Runtime Node car
// on lit la table via la service_role.
import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CERT_BRAND, CERT_TITLE } from "@/lib/certification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const alt = `${CERT_TITLE} - ${CERT_BRAND}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data } = await supabaseAdmin
    .from("certificates")
    .select("full_name, issued_at")
    .eq("share_token", token)
    .maybeSingle();

  const name = (data?.full_name as string)?.trim() || "Élève de l'Atelier";
  const date = data?.issued_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(data.issued_at as string))
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 40,
          background: "linear-gradient(135deg, #5D6CDB 0%, #34C3E0 100%)",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            borderRadius: 24,
            border: "4px solid rgba(93,108,219,0.25)",
            padding: 48,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#6b7191",
              fontWeight: 600,
            }}
          >
            {CERT_TITLE}
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              color: "#2E386E",
              marginTop: 6,
            }}
          >
            {CERT_BRAND}
          </div>

          {/* Sceau */}
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 999,
              margin: "30px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #5D6CDB 0%, #34C3E0 100%)",
              fontSize: 56,
            }}
          >
            🏅
          </div>

          <div style={{ fontSize: 24, color: "#6b7191" }}>Décerné à</div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#2E386E",
              marginTop: 4,
            }}
          >
            {name}
          </div>
          {date ? (
            <div style={{ fontSize: 22, color: "#9aa0bf", marginTop: 28 }}>
              Délivré le {date}
            </div>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
