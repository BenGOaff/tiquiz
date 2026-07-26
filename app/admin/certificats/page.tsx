// app/admin/certificats/page.tsx — galerie admin des certificats delivres.
// Preuve sociale : combien d'eleves certifies depuis le debut, avec pour
// chacun le nom affiche, le numero, la date, et de quoi recuperer l'image
// (copier le lien, telecharger) pour la reutiliser (blog, reseaux, pages
// de vente). Lecture via la service_role (bypass RLS), garde requireAdmin.
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAppUrl } from "@/lib/appUrl";
import { AdminCertList, type AdminCert } from "./AdminCertList";

export const dynamic = "force-dynamic";

export default async function AdminCertificatsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const { data } = await supabaseAdmin
    .from("certificates")
    .select("id, share_token, cert_number, full_name, issued_at")
    .order("issued_at", { ascending: false });

  const rows = (data ?? []) as {
    id: string;
    share_token: string;
    cert_number: string | null;
    full_name: string | null;
    issued_at: string;
  }[];

  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const certs: AdminCert[] = rows.map((r) => ({
    id: r.id,
    token: r.share_token,
    number: r.cert_number ?? "",
    name: r.full_name?.trim() || "Élève de l'Atelier",
    date: dateFmt.format(new Date(r.issued_at)),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">Certificats</h1>
        <p className="text-sm text-muted-foreground">
          {certs.length === 0
            ? "Aucun certificat délivré pour l'instant."
            : certs.length === 1
              ? "1 personne certifiée depuis le début."
              : `${certs.length} personnes certifiées depuis le début.`}
        </p>
      </header>

      <AdminCertList certs={certs} appUrl={getAppUrl()} />
    </div>
  );
}
