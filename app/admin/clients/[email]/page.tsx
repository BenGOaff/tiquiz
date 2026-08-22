// app/admin/clients/[email]/page.tsx
//
// LA FICHE D'UNE PERSONNE.
//
// Béné, 22 août : "Tu trouves ça pratique ? lisible ? facile à utiliser ?
// Quand j'aurai 200000 clients, je fais comment ?"
//
// Un tiroir dans une liste sert à regarder, pas à travailler. La liste
// reste la liste ; tout ce qu'on FAIT sur une personne se passe ici.
//
// La garde est la MÊME que celle de /admin : le middleware protège déjà
// le préfixe, et on revalide ici. Une page qui affiche l'argent d'un
// client et qui rembourse ne se contente pas d'un seul verrou.

import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import ClientFiche from "@/components/admin/ClientFiche";
import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fiche client" };

export default async function FicheClientPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  // Next décode déjà le segment : `a%40b.fr` arrive en `a@b.fr`.
  const { email } = await params;

  return (
    <AppShell userEmail={user.email ?? ""} headerTitle="Fiche client">
      <ClientFiche email={decodeURIComponent(email)} />
    </AppShell>
  );
}
