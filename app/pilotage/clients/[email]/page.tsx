// app/pilotage/clients/[email]/page.tsx
//
// LA FICHE D'UNE PERSONNE, DANS LA CONSOLE.
//
// C'est le MÊME composant que l'ancienne fiche, pas une copie : deux
// fiches finiraient par ne pas dire la même chose de la même personne,
// et c'est celle qu'on a sous les yeux qu'on croirait.
//
// La garde est double, comme partout ici : le middleware protège le
// préfixe, et on revalide. Une page qui affiche l'argent d'un client et
// qui rembourse ne se contente pas d'un seul verrou.

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import ClientFiche from "@/components/admin/ClientFiche";
import { CARTE } from "@/components/pilotage/carte";
import { lireAffiliesDistants } from "@/lib/pilotage/affilies";
import { isAdminEmail } from "@/lib/adminEmails";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fiche client" };

export default async function FichePilotagePage({
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

  // QUI L'A AMENÉ. Béné : "pour leurs clients je veux voir qui est leur
  // affilié." L'information vit sur l'autre base, et son absence ne
  // prive de rien : la ligne ne s'affiche simplement pas. On ne montre
  // JAMAIS "aucun affilié" faute d'avoir pu lire, ce serait une réponse
  // fausse à une vraie question.
  const { attributions, etat } = await lireAffiliesDistants();
  const amenePar = etat.ok ? attributions[email.trim().toLowerCase()] : null;

  return (
    <div className="space-y-4">
      {/* LA FLÈCHE REMONTE LA HIÉRARCHIE, jamais l'historique : deux
          écrans qui se citent l'un l'autre font tourner en boucle
          (drame Gwenn, 1er août). */}
      <Link
        href="/pilotage/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Clients et élèves
      </Link>
      {amenePar && (
        <section className={`${CARTE} px-4 py-3`}>
          <p className="text-xs text-muted-foreground">Amené par</p>
          <p className="text-sm font-medium">{amenePar}</p>
        </section>
      )}
      <ClientFiche email={email} />
    </div>
  );
}
