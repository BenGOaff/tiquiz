// lib/sio/appliquerTag.ts
//
// POSER L'ÉTIQUETTE SYSTEME.IO SUR UN CLIENT QUI A PAYÉ CHEZ NOUS.
//
// Béné, 22 août : "on utilise les mêmes [tags] pour ceux qui vont payer
// via notre système comme ça je ne suis pas perdue."
//
// Ses automatisations, ses séquences d'emails et ses segments sont bâtis
// sur ces étiquettes. Un client payé par NOTRE bon de commande et non
// étiqueté sort de tous ses scénarios sans que rien ne le signale : il
// ne reçoit pas la séquence d'accueil, il n'apparaît pas dans ses
// filtres, et personne ne s'en aperçoit avant des semaines.
//
// -- AVEC SA CLÉ, CELLE DE SES PARAMÈTRES ------------------------------
//
// "QUELLE clé il te manque et pour quoi ? On en a déjà créé et
// connecté." Elle avait raison : la clé vit dans `sio_api_keys`,
// chiffrée, et `resolveApiKey` la rend. Rien à poser sur le serveur.
//
// La clé utilisée est celle de la PROPRIÉTAIRE du service, c'est à dire
// le compte administrateur : c'est SON compte Systeme.io qui porte les
// contacts et les étiquettes de Tiquiz.
//
// -- BEST-EFFORT, ET JAMAIS BLOQUANT -----------------------------------
//
// Cette fonction ne jette jamais et rend un booléen. Une étiquette qui
// échoue ne doit PAS priver quelqu'un de l'accès qu'il vient de payer :
// c'est la règle du 7 août, "il a payé le client, il doit recevoir ses
// accès, point barre".

import "server-only";

import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { resolveApiKey } from "@/lib/sio/resolveApiKey";
import { readSioTag } from "@/lib/sio/tags";
import { sioUserRequest } from "@/lib/sio/userApiClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Le compte dont la clé Systeme.io porte les contacts de Tiquiz. */
async function idProprietaire(): Promise<string | null> {
  const admin = ADMIN_EMAILS[0];
  if (!admin) return null;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("email", admin.toLowerCase())
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

/** L'identifiant du contact chez Systeme.io, ou `null` s'il n'y est pas. */
async function trouverContact(apiKey: string, email: string): Promise<number | null> {
  const res = await sioUserRequest<{ items?: { id?: number; email?: string }[] }>(
    apiKey,
    `/contacts?email=${encodeURIComponent(email)}&limit=20`,
  );
  if (!res.ok || !Array.isArray(res.data?.items)) return null;
  // On ne fait PAS confiance au filtre : selon les API, `?email=` peut
  // être ignoré et rendre la première page complète. On revérifie
  // l'adresse nous mêmes, sinon on étiquetterait un inconnu.
  const trouve = res.data!.items!.find(
    (c) => String(c?.email ?? "").trim().toLowerCase() === email,
  );
  const id = Number(trouve?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** L'identifiant d'une étiquette par son nom, ou `null`. */
async function trouverTag(apiKey: string, nom: string): Promise<number | null> {
  const res = await sioUserRequest<{ items?: { id?: number; name?: string }[] }>(
    apiKey,
    "/tags?limit=200",
  );
  if (!res.ok || !Array.isArray(res.data?.items)) return null;
  const trouve = res.data!.items!.find(
    (t) => String(t?.name ?? "").trim().toLowerCase() === nom.toLowerCase(),
  );
  const id = Number(trouve?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Pose l'étiquette du palier acheté sur le contact.
 *
 * Rend `false` sans rien casser quand : aucune clé n'est connectée, le
 * palier n'a pas d'étiquette connue, le contact n'existe pas chez
 * Systeme.io, ou l'étiquette n'existe pas.
 *
 * **On ne CRÉE jamais l'étiquette manquante**, et c'est délibéré : une
 * étiquette créée par nous avec une faute de frappe se retrouverait en
 * double dans sa liste, et ses automatisations continueraient de pointer
 * l'ancienne. Mieux vaut ne rien poser et le dire.
 */
export async function poserTagAchat(email: string, plan: string): Promise<boolean> {
  const adresse = String(email ?? "").trim().toLowerCase();
  const tag = readSioTag(plan);
  if (!adresse || !tag) return false;

  try {
    const proprietaire = await idProprietaire();
    if (!proprietaire) {
      console.warn("[sio/tag] aucun compte administrateur : etiquette non posee.");
      return false;
    }
    const cle = await resolveApiKey(proprietaire);
    if (!cle) {
      console.warn(
        `[sio/tag] aucune cle Systeme.io connectee : ${adresse} n'est pas etiquete ${tag}.`,
      );
      return false;
    }

    const contactId = await trouverContact(cle.apiKey, adresse);
    if (!contactId) {
      // Le cas normal d'un client venu de NOTRE bon de commande sans
      // jamais passer par un tunnel Systeme.io. On le dit : c'est une
      // personne qui sortira de ses séquences.
      console.warn(`[sio/tag] ${adresse} n'existe pas chez Systeme.io : etiquette non posee.`);
      return false;
    }

    const tagId = await trouverTag(cle.apiKey, tag);
    if (!tagId) {
      console.warn(`[sio/tag] l'etiquette ${tag} n'existe pas chez Systeme.io.`);
      return false;
    }

    const res = await sioUserRequest(cle.apiKey, `/contacts/${contactId}/tags`, {
      method: "POST",
      body: { tagId },
    });
    if (!res.ok) {
      console.warn(`[sio/tag] pose refusee pour ${adresse} (${res.status}).`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[sio/tag] ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
