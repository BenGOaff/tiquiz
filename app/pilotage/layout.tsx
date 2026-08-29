// app/pilotage/layout.tsx
//
// LE CENTRE DE PILOTAGE (Béné, 29 août 2026).
//
// Servi sur `pilotage.tipote.com` (rewrite dans next.config.ts), mais
// hébergé par le dépôt Tiquiz : une 4e app voudrait dire un 4e `.env`,
// un 4e build et un 4e `pm2` dans un déploiement manuel, c'est à dire
// exactement la configuration qui a croisé les clés Supabase le 22
// août. L'adresse dédiée sans le risque.
//
// -- LA GARDE EST DOUBLE, ET CE N'EST PAS DE LA PARANOÏA ---------------
//
// Le middleware refuse déjà `/pilotage` à qui n'est pas admin. On
// revérifie ici parce que cet écran montre les clients, l'argent et
// l'état des clés : une garde qui vit à un seul endroit tombe le jour
// où quelqu'un touche à un matcher, et personne ne le verrait.

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { PilotageNav } from "@/components/pilotage/PilotageNav";

export const metadata: Metadata = { title: "Pilotage" };

export default async function PilotageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-muted/20 lg:flex">
      <PilotageNav email={user.email ?? ""} />
      {/* La colonne de contenu porte SA largeur et SON rythme, une seule
          fois. Chaque page ne décide que de son espacement vertical :
          sans ça, deux écrans finissent avec deux marges différentes et
          l'un paraît plus étroit que l'autre sans raison (leçon de
          l'espace affilié). */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
