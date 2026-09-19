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
import { lireRattachementDuClient } from "@/lib/pilotage/affilies";
import { isAdminEmail } from "@/lib/adminEmails";
import { lireEmailParam } from "@/lib/admin/emailParam";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fiche client" };

/** Le mot de chaque origine. La DÉCISION vit chez Tipote. */
const ORIGINE_CLIENT: Record<string, string> = {
  clic: "il a cliqué sur son lien",
  inscription: "inscrit par son lien",
  vente: "sa vente portait le code",
  import_sio: "repris d'un tunnel Systeme.io",
  manuel: "attribué à la main",
};

const PREUVE_CLIENT: Record<string, { mot: string; ton: string }> = {
  mesuree: { mot: "mesuré", ton: "text-emerald-700 dark:text-emerald-300" },
  declaree: { mot: "déclaré", ton: "text-amber-700 dark:text-amber-300" },
  inconnue: { mot: "non vérifiable", ton: "" },
};

/** Une date, écrite en toutes lettres : c'est une pièce, pas un tableau. */
function quandLong(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(t));
}

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

  // NON, NEXT NE DÉCODE PAS LE SEGMENT. Ce commentaire disait
  // l'inverse, et c'est pour ça que personne ne décodait : la fiche
  // s'ouvrait sur `blagardette%2Btestaffi2%40gmail.com`, et surtout la
  // recherche de "Amené par" échouait pour TOUT LE MONDE, puisque `@`
  // s'encode toujours en `%40`. Le suivi d'affiliation avait donc l'air
  // de ne connaître personne. Sa jumelle `/admin/clients/[email]`
  // décodait, elle (31 août 2026).
  const { email: brut } = await params;
  const email = lireEmailParam(brut);

  // QUI L'A AMENÉ, ET COMMENT (Béné, 18 septembre 2026).
  //
  // "Je dois tout savoir sur tout, de façon fiable et sécurisée."
  //
  // Cette ligne n'affichait qu'un PRÉNOM. Ça ne permet pas de trancher
  // quoi que ce soit : un rattachement décidé à la main s'y lisait
  // exactement comme un clic mesuré, et c'est précisément la différence
  // qui compte le jour où deux affiliés se disputent le même client.
  //
  // On rend maintenant le DOSSIER : depuis quand, par quel chemin, ce
  // que ce chemin vaut comme preuve, et qui l'a décidé s'il s'agit d'un
  // geste humain. Et on ne montre JAMAIS "aucun affilié" faute d'avoir
  // pu lire : les deux cas ont leur phrase.
  const rattachement = await lireRattachementDuClient(email);

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
      <section className={`${CARTE} px-4 py-3`}>
        <p className="text-xs text-muted-foreground">Amené par</p>
        {!rattachement.lisible ? (
          // "JE N'AI PAS PU REGARDER" N'EST PAS "PERSONNE". Sur cet
          // écran là, confondre les deux ferait conclure qu'un client
          // est arrivé seul alors qu'un affilié attend sa commission.
          <p className="text-sm text-amber-700 dark:text-amber-300">
            L&apos;espace affilié n&apos;a pas répondu. Ce n&apos;est pas la preuve que
            personne ne l&apos;a amené.
          </p>
        ) : !rattachement.rattache ? (
          <p className="text-sm font-medium">
            Personne. Le registre a regardé : cette personne est arrivée seule.
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {rattachement.dossier.nom ?? rattachement.dossier.ref ?? rattachement.dossier.sa}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {rattachement.dossier.depuis && `depuis le ${quandLong(rattachement.dossier.depuis)}`}
              {rattachement.dossier.origine &&
                ` · ${ORIGINE_CLIENT[rattachement.dossier.origine] ?? rattachement.dossier.origine}`}
              {!rattachement.dossier.origine && " · origine non mesurée"}
              {" · "}
              <span className={PREUVE_CLIENT[rattachement.dossier.preuve].ton}>
                {PREUVE_CLIENT[rattachement.dossier.preuve].mot}
              </span>
              {rattachement.dossier.decidePar && ` · décidé par ${rattachement.dossier.decidePar}`}
            </p>
            {rattachement.dossier.note && (
              <p className="mt-0.5 text-xs italic text-muted-foreground">
                « {rattachement.dossier.note} »
              </p>
            )}
          </>
        )}
      </section>
      <ClientFiche email={email} />
    </div>
  );
}
