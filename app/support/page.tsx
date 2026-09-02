// app/support/page.tsx
//
// ÉCRIRE À UN HUMAIN, DEPUIS TIQUIZ.
//
// Béné, 22 août : "côté support (...) c'est carré ou pas encore ?"
//
// Pas encore : le centre d'aide existait (57 articles servis par
// Tipote), mais aucun chemin ne menait à quelqu'un. Une cliente bloquée
// n'avait que l'adresse du pied de page, si elle la trouvait.
//
// -- PUBLIQUE, ET C'EST LE POINT ---------------------------------------
//
// Aucune redirection vers /login : celle qui a le plus besoin d'aide est
// celle qui n'arrive pas à se connecter. Quand une session existe, on
// pré-remplit son adresse ; sinon elle la saisit.

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AppShell from "@/components/AppShell";
import SiteShell from "@/components/site/SiteShell";
import SupportForm from "@/components/support/SupportForm";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supportForm");
  return { title: t("title") };
}

export default async function SupportPage() {
  const t = await getTranslations("supportForm");

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let prenom: string | null = null;
  if (user?.id) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("first_name")
      .eq("user_id", user.id)
      .maybeSingle();
    prenom = (data as { first_name?: string | null } | null)?.first_name ?? null;
  }

  // LE TITRE NE S'ECRIT QU'UNE FOIS (Bene, 2 septembre 2026 : "y'a trop
  // de titres sur une meme page c'est tout en doublon"). Connectee, la
  // barre du haut le porte deja via `headerTitle` ; hors session il n'y
  // a pas de barre, donc le titre revient dans la page.
  const formulaire = (
    <SupportForm emailConnecte={user?.email ?? null} nomConnecte={prenom} />
  );

  const enveloppe = (avecTitre: boolean) => (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      {avecTitre ? <h1 className="text-2xl font-bold">{t("title")}</h1> : null}
      {formulaire}
    </div>
  );

  // Connectée : la page vit dans l'app, avec sa barre latérale. Non
  // connectée : elle vit seule, parce qu'une barre latérale pleine de
  // liens qui renverraient vers /login serait une deuxième impasse.
  // SANS SESSION, C'EST UN VISITEUR DU SITE, PAS UN UTILISATEUR.
  //
  // Cette branche ne portait AUCUN cadre : le formulaire seul, sans
  // en-tête, sans pied de page, donc sans un seul lien pour repartir.
  // Quelqu'un qui arrive de `tiquiz.fr/support`, pose sa question et
  // veut ensuite regarder le produit se retrouvait dans un cul-de-sac
  // (trouvé le 30 août en raccordant les pages publiques entre elles).
  //
  // Connecté, il garde `AppShell` : il est dans l'app, et la navigation
  // de l'app est celle qui lui sert.
  if (!user) {
    return <SiteShell>{enveloppe(true)}</SiteShell>;
  }

  return (
    <AppShell userEmail={user.email ?? ""} headerTitle={t("title")}>
      {enveloppe(false)}
    </AppShell>
  );
}
