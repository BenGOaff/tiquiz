// app/admin/ventes/page.tsx
//
// TES VENTES DIRECTES TIQUIZ, ET LE BOUTON POUR REMBOURSER.
//
// Jumeau de l'ecran de l'Atelier. Il ne montre QUE les ventes encaissees
// par Tiquiz lui-meme (Stripe) : les abonnements vendus via Systeme.io
// ont leur propre journal, dans la carte "Appels Systeme.io" du tableau
// de bord. Melanger les deux dans un seul tableau donnerait deux notions
// de "rembourse" cote a cote, et un ecran qui finit par mentir.
//
// La garde est la MEME que celle de /admin : le middleware protege deja
// le prefixe, et on revalide ici (defense en profondeur). Une page qui
// liste des ventes et rembourse ne se contente pas d'un seul verrou.

import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import VentesClient from "./VentesClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ventes" };

export default async function AdminVentesPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  return (
    <AppShell userEmail={user.email ?? ""} headerTitle="Ventes directes">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Ventes directes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les abonnements encaisses par Tiquiz lui-meme. Rembourser depuis ici retire le
            plan et envoie ton email d&apos;au revoir, exactement comme si tu remboursais
            depuis Stripe.
          </p>
        </div>
        <VentesClient />
      </div>
    </AppShell>
  );
}
