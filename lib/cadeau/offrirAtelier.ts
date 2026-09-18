// lib/cadeau/offrirAtelier.ts
//
// ON OFFRE L'ATELIER, UNE SEULE FOIS, ET SEULEMENT SI C'EST DÛ.
//
// La DÉCISION vit dans `lib/cadeau/atelierOffert.ts`, pure et testée.
// Ici il n'y a que les lectures, l'appel à l'Atelier, et la trace.
//
// -- UN SEUL ENDROIT, PARCE QU'IL Y A TROIS PORTES ---------------------
//
// Trois chemins ouvrent un plan payant : le checkout Stripe, le webhook
// PayPal, et le webhook Systeme.io. Si chacun décidait de son côté si le
// cadeau est dû, les trois finiraient par ne pas dire la même chose, et
// c'est le piège numéro 1 de ce dépôt (sorti huit fois).
//
// Cette fonction est donc la SEULE porte. Les trois l'appellent avec ce
// qu'elles savent, elle fait le reste.
//
// -- ELLE NE JETTE JAMAIS ET NE BLOQUE RIEN ---------------------------
//
// Un cadeau qui échoue ne doit pas priver quelqu'un du plan qu'il vient
// de payer. On CRIE, par contre : une promesse faite par email et pas
// tenue coûte plus cher qu'un bug silencieux.

import "server-only";

// L'URL DE L'ATELIER VIT À UN SEUL ENDROIT (drame Béné, 3 août 2026).
//
// J'avais commencé par la relire depuis l'environnement ici, avec un
// repli en dur. C'est exactement la faute que `atelierUrl.ts` existe
// pour empêcher : une adresse écrite à deux endroits ne se corrige
// jamais qu'à moitié, et le rebrand "quizing" l'avait déjà prouvé en
// cassant l'aller et le retour séparément.
import { ATELIER_BASE_URL } from "@/lib/partner/atelierUrl";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cadeauAtelierOuvert,
  estUnUpgradeDepuisLeGratuit,
  type FenetreCadeau,
} from "@/lib/cadeau/atelierOffert";


export type ResultatCadeau =
  | { offert: true; fenetre: FenetreCadeau; compteCree: boolean }
  | { offert: false; motif: string };

/**
 * Offre l'Atelier à quelqu'un qui vient de passer du gratuit au payant.
 *
 * `maintenant` est un PARAMÈTRE : l'appelant lit l'horloge, pas nous.
 * C'est la règle de ce dépôt, et elle rend le chemin testable.
 */
export async function offrirAtelierSiDu(args: {
  email: string;
  /** Le plan AVANT l'octroi, tel que `grantPlanByEmail` l'a rendu. */
  planAvant: string | null;
  planApres: string | null;
  maintenant: Date;
}): Promise<ResultatCadeau> {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email) return { offert: false, motif: "pas_d_adresse" };

  // 1. EST-CE UN UPGRADE DEPUIS LE GRATUIT ? Un passage de `monthly` à
  //    `yearly` n'en est pas un, et l'oublier reviendrait à offrir
  //    l'Atelier à chaque changement de palier, donc à tout le monde.
  if (!estUnUpgradeDepuisLeGratuit(args.planAvant, args.planApres)) {
    return { offert: false, motif: "pas_un_upgrade_depuis_le_gratuit" };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "created_at, cadeau_atelier_offert_le, cadeau_atelier_relance_6mois_le, " +
          "cadeau_atelier_relance_1an_le",
      )
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { offert: false, motif: "profil_introuvable" };

    const p = data as unknown as Record<string, unknown>;

    // 2. LA FENÊTRE EST-ELLE OUVERTE ? Décision pure.
    const verdict = cadeauAtelierOuvert(
      {
        inscritLe: (p.created_at as string | null) ?? null,
        relance6moisLe: (p.cadeau_atelier_relance_6mois_le as string | null) ?? null,
        relance1anLe: (p.cadeau_atelier_relance_1an_le as string | null) ?? null,
        offertLe: (p.cadeau_atelier_offert_le as string | null) ?? null,
      },
      args.maintenant,
    );
    if (!verdict.ouvert) return { offert: false, motif: verdict.motif };

    // 3. ON OUVRE L'ACCÈS CHEZ L'ATELIER. Lui seul peut le faire : c'est
    //    son compte, sa base, et son email de bienvenue.
    const secret = String(process.env.PARTNER_SHARED_SECRET ?? "").trim();
    if (!secret) {
      console.error(
        `[cadeau-atelier] PARTNER_SHARED_SECRET absente : ${email} a droit a l'Atelier ` +
          `et ne l'aura pas. A ouvrir a la main.`,
      );
      return { offert: false, motif: "not_configured" };
    }

    const res = await fetch(`${ATELIER_BASE_URL}/api/partner/acces-offert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-partner-secret": secret },
      body: JSON.stringify({ email, motif: verdict.fenetre }),
      // UN APPEL SANS DÉLAI MAXIMUM BLOQUE LE WEBHOOK QUI L'APPELLE
      // (audit du 24 août). Le cadeau peut attendre, l'accès payant non.
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; created?: boolean; reason?: string };

    if (!res.ok || json.ok !== true) {
      // ON NE MARQUE PAS `offert_le` : la fenêtre reste ouverte, et la
      // prochaine tentative (un réessai du webhook) repassera. Marquer
      // ici fermerait la porte sur un cadeau jamais reçu.
      console.error(
        `[cadeau-atelier] ${email} a droit a l'Atelier (${verdict.fenetre}) et l'Atelier a ` +
          `refuse (${json.reason ?? res.status}). A ouvrir a la main.`,
      );
      return { offert: false, motif: `atelier_refuse:${json.reason ?? res.status}` };
    }

    // 4. ON MARQUE, ET SEULEMENT MAINTENANT. L'ordre n'est pas un
    //    détail : marquer avant l'appel perdrait le cadeau sur une
    //    panne réseau, et personne ne le saurait.
    const { error: errMarque } = await supabaseAdmin
      .from("profiles")
      .update({
        cadeau_atelier_offert_le: args.maintenant.toISOString(),
        cadeau_atelier_fenetre: verdict.fenetre,
      })
      .eq("email", email);
    if (errMarque) {
      // L'accès EST ouvert. Ne pas savoir qu'on l'a offert est un
      // désagrément (un deuxième email de bienvenue au pire) ; ne pas
      // l'avoir ouvert aurait été une promesse non tenue.
      console.error(
        `[cadeau-atelier] Atelier ouvert pour ${email} mais NON marque : ${errMarque.message}. ` +
          `Si la colonne est absente, appliquer supabase/migrations/20260918_cadeau_atelier.sql.`,
      );
    }

    console.log(
      `[cadeau-atelier] Atelier offert a ${email} (fenetre ${verdict.fenetre}, ` +
        `compte ${json.created ? "cree" : "existant"})`,
    );
    return { offert: true, fenetre: verdict.fenetre, compteCree: json.created === true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[cadeau-atelier] ${email} : ${message}. A regarder.`);
    return { offert: false, motif: "erreur" };
  }
}
