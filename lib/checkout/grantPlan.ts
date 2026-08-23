// lib/checkout/grantPlan.ts
//
// OUVRIR UN PLAN TIQUIZ APRÈS UN PAIEMENT À NOUS.
//
// "Il a payé le client, il doit recevoir ses accès, point barre."
// (Béné, 7 août 2026, drame Ivan.)
//
// -- POURQUOI CETTE FONCTION EXISTE, ET CE QU'ELLE N'EST PAS -----------
//
// Le webhook Systeme.io fait déjà tout ça, mais mélangé à des choses qui
// ne concernent QUE Systeme.io : annuler les anciens abonnements chez
// eux, poser `expected_sio_cancel_until` pour que l'écho de cette
// annulation ne fasse pas retomber le client en gratuit, deviner le plan
// à partir de trois indices... Rien de tout ça n'a de sens sur un
// paiement que NOUS déclenchons : on sait ce qui a été acheté.
//
// Cette fonction est donc le noyau commun, réduit à ce qui est vrai dans
// les deux cas : trouver ou créer le compte, poser le plan, laisser une
// trace, envoyer le lien de connexion.
//
// **Le webhook Systeme.io ne l'appelle PAS encore**, et c'est assumé
// plutôt qu'oublié : il traite les vraies ventes de Béné aujourd'hui, et
// le brancher demande une passe attentive, pas un effet de bord d'un
// chantier sur le paiement. C'est la prochaine étape de rangement.
//
// -- CE QUI EST DÉLIBÉRÉMENT DIFFÉRENT DE L'ATELIER --------------------
//
// Côté Atelier, `grantAccessByEmail()` existait déjà et notre paiement
// l'appelle telle quelle. Ici il n'y avait rien d'extractible sans
// toucher au chemin de production : d'où ce fichier, écrit pour être ce
// que les deux chemins partageront.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildAuthCallbackUrl, resolveAppUrl } from "@/lib/authLinks";
import { sendPlanOpenedEmail } from "@/lib/email/planOpenedEmail";
import { isLifetimePlan } from "@/lib/plans/lifetime";
import { poserTagAchat } from "@/lib/sio/appliquerTag";
import type { TiquizPlan } from "@/lib/sio/webhookInference";

export interface GrantPlanResult {
  ok: boolean;
  /** Le compte a-t-il été créé par cet achat ? */
  created: boolean;
  /** Le plan AVANT l'achat. `null` = aucun profil, donc premier achat. */
  previousPlan: string | null;
  /** Renseignée quand `ok` est faux : ce qui a empêché l'ouverture. */
  reason?: string;
  /** Le lien de connexion est-il parti ? */
  loginLinkSent?: boolean;
  /** L'étiquette Systeme.io a-t-elle été posée ? */
  tagPose?: boolean;
}

async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  // `listUsers` ne filtre pas par email : on pagine. Volume attendu très
  // faible, et c'est déjà ce que fait le webhook Systeme.io.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return { id: hit.id };
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Ouvre `plan` pour `email`, en créant le compte si besoin.
 *
 * `source` sert la traçabilité (`plan_change_log.reason`) : on doit
 * pouvoir répondre à "d'où vient ce changement de plan" six mois après.
 */
export async function grantPlanByEmail(args: {
  email: string;
  plan: TiquizPlan;
  source: string;
  /** Référence de la vente chez le fournisseur, pour l'audit. */
  reference?: string | null;
  /** L'origine de la requête, pour que le lien de connexion pointe chez nous. */
  requestOrigin?: string | null;
  /** La langue du bon de commande, pour que l'email arrive dans la sienne. */
  locale?: string | null;
  /**
   * Le nom du plan tel qu'il a ete AFFICHE sur le bon de commande
   * ("Tiquiz mensuel"). Il vient du catalogue, jamais d'un payload.
   *
   * Sans lui, l'email de confirmation dirait "ton plan est ouvert" sans
   * nommer lequel, ce qui est exactement le reproche du 23 aout : un
   * message qui ne confirme pas ce qui vient d'etre paye.
   */
  planLabel?: string | null;
}): Promise<GrantPlanResult> {
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return { ok: false, created: false, previousPlan: null, reason: "invalid_email" };
  }

  // 1. Trouver ou créer le compte.
  let userId: string;
  let created = false;
  const { data: nouveau, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (nouveau?.user) {
    userId = nouveau.user.id;
    created = true;
  } else if (createErr?.message?.toLowerCase().includes("already been registered")) {
    const trouve = await findUserByEmail(email);
    if (!trouve) {
      // Le compte existe pour Supabase mais reste introuvable : on ne se
      // tait pas, quelqu'un a payé.
      return { ok: false, created: false, previousPlan: null, reason: "user_exists_but_not_found" };
    }
    userId = trouve.id;
  } else {
    return {
      ok: false,
      created: false,
      previousPlan: null,
      reason: `create_failed:${createErr?.message ?? "inconnu"}`,
    };
  }

  // 2. Lire l'état AVANT, pour l'audit et pour les cas particuliers.
  //
  // `select("*")` volontaire, comme dans le webhook Systeme.io :
  // `reseller_id` peut ne pas exister sur un déploiement plus ancien, et
  // un select nominatif sur une colonne absente ferait tout échouer.
  const { data: avant } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const previousPlan =
    String((avant as { plan?: string | null } | null)?.plan ?? "").trim().toLowerCase() || null;

  // Client d'un REVENDEUR. Le webhook Systeme.io refuse ce cas, parce
  // qu'une vente sur un tunnel de Béné y est presque toujours une erreur
  // de parcours. Ici, la personne a payé BÉNÉ, sur SON bon de commande :
  // lui refuser l'accès contredirait la règle du 7 août. On ouvre donc,
  // et on le signale fort : c'est une situation qui mérite un humain.
  const resellerId = (avant as { reseller_id?: string | null } | null)?.reseller_id ?? null;
  if (resellerId) {
    console.warn(
      `[grantPlan] ${email} est client du revendeur ${resellerId} et vient d'acheter en direct. ` +
        `Acces ouvert (il a paye), mais la situation demande un arbitrage.`,
    );
  }

  // 3. Poser le plan.
  const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
    { user_id: userId, email, plan: args.plan, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (upsertErr) {
    return { ok: false, created, previousPlan, reason: `upsert:${upsertErr.message}` };
  }

  // 4. Tracer le changement. Au mieux : si la table n'existe pas encore
  // sur un déploiement ancien, ça ne doit pas priver quelqu'un d'accès.
  if (args.plan !== previousPlan) {
    try {
      await supabaseAdmin.from("plan_change_log").insert({
        target_user_id: userId,
        target_email: email,
        old_plan: previousPlan,
        new_plan: args.plan,
        reason: `${args.source}:${args.reference ?? "sans_reference"}`,
      });
    } catch {
      // audit best-effort
    }
  }

  // 5. L'ÉTIQUETTE SYSTEME.IO.
  //
  // Béné, 22 août : "on utilise les mêmes [tags] pour ceux qui vont payer
  // via notre système comme ça je ne suis pas perdue."
  //
  // Ses automatisations et ses séquences d'emails sont bâties sur ces
  // étiquettes. Un client payé par NOTRE bon de commande et non étiqueté
  // sort de tous ses scénarios sans que rien ne le signale.
  //
  // Best-effort, et APRÈS le plan : une étiquette qui échoue ne doit
  // jamais priver quelqu'un de l'accès qu'il vient de payer.
  const tagPose = await poserTagAchat(email, args.plan).catch(() => false);

  // 6. LA CONFIRMATION D'ACHAT, ÉCRITE PAR NOUS, AVEC LE LIEN D'ENTRÉE.
  //
  // Elle part APRÈS que le plan est posé : si l'envoi échoue, la personne
  // a quand même son accès et peut demander un lien elle-même. L'inverse
  // (envoyer puis échouer à poser le plan) lui ferait découvrir un compte
  // en gratuit après avoir payé.
  //
  // **Et ça ne passe plus par l'email de Supabase.** Béné, 22 août :
  // "je demande un lien magique sur tiquiz et je reçois les trucs tipote
  // c'est pas pro du tout !!" Les gabarits de Supabase sont configurés
  // dans SON tableau de bord, pour l'autre app, et aucun code ne peut
  // les changer. On génère donc le jeton et on envoie NOTRE email.
  //
  // **Et ce n'est plus l'email "ton lien de connexion".** Béné, 23 août,
  // après le premier vrai paiement : "j'ai bien reçu un lien de connexion
  // mais pas le mail de bienvenue : il faut vérifier qu'une personne qui
  // était en gratuit et passe en payant reçoit bien ce qu'il faut."
  // Le message commençait par "Tu as demandé à te connecter à Tiquiz
  // sans mot de passe" : elle n'avait pas demandé à se connecter, elle
  // avait payé. Rien ne confirmait l'achat ni ne nommait le plan.
  //
  // La SITUATION est un paramètre du texte, jamais une devinette : un
  // compte créé par l'achat reçoit une bienvenue, un compte qui existait
  // déjà reçoit une confirmation de montée de palier. C'est la
  // correction faite dans l'Atelier le 7 août et jamais portée ici.
  const appUrl = resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, args.requestOrigin);
  let lienParti = false;
  try {
    const { data: lien, error: lienErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    });
    const hashedToken = lien?.properties?.hashed_token;
    if (lienErr || !hashedToken) {
      console.error(
        `[grantPlan] jeton de connexion NON emis pour ${email} : ${lienErr?.message ?? "absent"}`,
      );
    } else {
      lienParti = await sendPlanOpenedEmail({
        email,
        situation: created ? "nouveau-compte" : "montee-de-palier",
        planLabel: args.planLabel ?? args.plan,
        actionLink: buildAuthCallbackUrl(appUrl, { tokenHash: hashedToken, type: "magiclink" }),
        locale: args.locale ?? null,
      });
      if (!lienParti) {
        console.error(`[grantPlan] confirmation d'achat NON partie a ${email}.`);
      }
    }
  } catch (e) {
    console.error(`[grantPlan] lien de connexion : ${e instanceof Error ? e.message : String(e)}`);
  }

  // `ok: true` même si l'email ou l'étiquette ont échoué : l'accès EST
  // ouvert. Renvoyer un échec ici ferait rejouer la vente par le
  // fournisseur alors que le paiement, lui, a bien abouti.
  return { ok: true, created, previousPlan, loginLinkSent: lienParti, tagPose };
}

/**
 * RETIRE LE PLAN PAYANT APRÈS UN REMBOURSEMENT TOTAL.
 *
 * Béné, 20 août 2026 : "si je rembourse les 47 €, l'accès est coupé ou
 * pas ?" Avant ce chantier, non : le webhook n'écoutait que les
 * paiements réussis, donc quelqu'un pouvait acheter, se faire rembourser
 * et garder son plan.
 *
 * Deux refus, et ils comptent tous les deux :
 *
 * 1. **Un plan promis à vie ne redescend jamais ici** (`beta`,
 *    `lifetime`). Le seul chemin légitime pour les retirer est la route
 *    d'administration. La liste vit dans `lib/plans/lifetime.ts`, la
 *    MÊME que celle du webhook Systeme.io : deux copies finiraient par
 *    diverger, et la divergence coûterait un compte à vie.
 * 2. **Déjà en gratuit : on ne fait rien**, et on le dit. Réécrire
 *    `free` par-dessus `free` polluerait le journal des changements de
 *    plan avec des lignes qui ne racontent rien.
 *
 * On ne supprime PAS le compte : les quiz et les leads restent à leur
 * propriétaire. C'est ce que dit la page de commande, et une promesse
 * faite sur un bon de commande se tient.
 */
export async function downgradeToFreeByEmail(args: {
  email: string;
  source: string;
  reference?: string | null;
}): Promise<{ ok: boolean; skipped?: string; previousPlan?: string | null; reason?: string }> {
  const email = args.email.trim().toLowerCase();
  const user = await findUserByEmail(email);
  if (!user) return { ok: true, skipped: "no_account" };

  const { data: avant } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const previousPlan =
    String((avant as { plan?: string | null } | null)?.plan ?? "").trim().toLowerCase() || null;

  if (!previousPlan || previousPlan === "free") {
    return { ok: true, skipped: "already_free", previousPlan };
  }
  if (isLifetimePlan(previousPlan)) {
    console.warn(
      `[downgradeToFree] REFUS de retrograder un plan a vie (${previousPlan}) pour ${email}. ` +
        `Passer par la route d'administration si c'est vraiment voulu.`,
    );
    return { ok: true, skipped: "lifetime_plan", previousPlan };
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan: "free", updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) {
    return { ok: false, previousPlan, reason: `update:${error.message}` };
  }

  // Best-effort : la traçabilité ne doit pas annuler la rétrogradation.
  try {
    await supabaseAdmin.from("plan_change_log").insert({
      target_user_id: user.id,
      target_email: email,
      old_plan: previousPlan,
      new_plan: "free",
      reason: `${args.source}:${args.reference ?? "sans_reference"}`,
    });
  } catch {
    // Le plan est déjà retiré, c'est ce qui compte.
  }

  return { ok: true, previousPlan };
}
