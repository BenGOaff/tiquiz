// app/cert/[token]/page.tsx — page PUBLIQUE du certificat (hors espace
// membre). Lue par n'importe qui avec le lien, et scrapee par les reseaux
// pour l'apercu. Lecture par token via la service_role (pas de policy
// publique sur la table). On affiche le VRAI certificat (image rendue
// depuis le template) et on invite le visiteur a decouvrir l'Atelier.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAppUrl } from "@/lib/appUrl";
import { CERT_BRAND, CERT_TITLE } from "@/lib/certification";
import { CertificateShare } from "@/components/CertificateShare";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface CertRow {
  full_name: string | null;
  cert_number: string | null;
}

async function loadCertificate(token: string): Promise<CertRow | null> {
  const { data } = await supabaseAdmin
    .from("certificates")
    .select("full_name, cert_number")
    .eq("share_token", token)
    .maybeSingle();
  return (data as CertRow) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const cert = await loadCertificate(token);
  if (!cert) return { title: CERT_TITLE };

  const name = cert.full_name?.trim() || "Un élève";
  const title = `${CERT_TITLE} - ${CERT_BRAND}`;
  const description = `${name} a terminé le parcours de ${CERT_BRAND}.`;
  const url = `${getAppUrl()}/cert/${token}`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: `${url}/opengraph-image`, width: 1200, height: 848 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${url}/opengraph-image`],
    },
  };
}

export default async function PublicCertificatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cert = await loadCertificate(token);
  if (!cert) notFound();

  const url = `${getAppUrl()}/cert/${token}`;
  const imageUrl = `${url}/image?dl=1`;

  return (
    <main className="min-h-screen bg-surface py-10">
      <div className="container flex max-w-3xl flex-col items-center gap-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/cert/${token}/image?w=1400`}
          alt={CERT_TITLE}
          className="w-full h-auto rounded-xl border border-border shadow-card"
        />

        <CertificateShare url={url} imageUrl={imageUrl} />

        <div className="flex flex-col items-center gap-3 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Toi aussi, apprends à faire un quiz qui capte, segmente et vend.
          </p>
          <Button asChild>
            <Link href="/">Découvrir {CERT_BRAND}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
