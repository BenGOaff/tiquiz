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
import { corpsCreationContact } from "@/lib/sio/contactFields";
import { readSioTag } from "@/lib/sio/tags";
import { sioUserRequest } from "@/lib/sio/userApiClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Acheteur } from "@/lib/facture/identite";

/** Ce qu'on sait de l'acheteur au moment de le créer chez Systeme.io. */
export interface IdentiteContact {
  /** La langue de ses emails. */
  locale?: string | null;
  /**
   * Son identité de facturation, quand on l'a.
   *
   * Elle porte le prénom, le nom, et aussi la société, le numéro de TVA
   * et l'adresse : les champs existent dans sa fiche contact
   * (`company_name`, `tax_number`, `street_address`...) et n'étaient
   * jamais renseignés. C'est de la donnée qu'on collecte déjà pour les
   * factures depuis le 24 août.
   */
  acheteur?: Acheteur | null;
}

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

/**
 * LE CONTACT, TROUVÉ OU CRÉÉ.
 *
 * Béné, 24 août : les emails restent chez Systeme.io. Un client qui n'y
 * existe pas est donc un client injoignable : pas de bienvenue, pas de
 * relance, pas de segment. Et c'est le cas NORMAL de quelqu'un qui
 * achète sur notre bon de commande sans jamais toucher un tunnel.
 *
 * **À N'APPELER QUE QUAND LA PERSONNE L'A DEMANDÉ.** Créer un contact,
 * c'est faire entrer quelqu'un dans sa liste. Deux cas le justifient, et
 * deux seulement : il vient d'ACHETER, ou il vient de S'INSCRIRE (compte
 * gratuit, newsletter). L'appeler depuis une simple lecture ferait
 * grossir sa liste de gens qui n'ont rien demandé, abîmerait sa
 * délivrabilité, et serait illégal pour une liste de diffusion.
 *
 * On RE-CHERCHE après un refus de création : deux webhooks qui arrivent
 * en même temps peuvent créer la course, et Systeme.io refuse le second
 * doublon. Ce refus veut dire "il existe", pas "ça a raté".
 */
async function assurerContact(
  apiKey: string,
  email: string,
  identite: IdentiteContact,
): Promise<number | null> {
  const existant = await trouverContact(apiKey, email);
  if (existant) return existant;

  const corps = corpsCreationContact({
    email,
    locale: identite.locale,
    acheteur: identite.acheteur,
  });
  if (!corps) {
    console.warn(`[sio/tag] adresse inexploitable, contact non cree : ${email}`);
    return null;
  }

  const res = await sioUserRequest<{ id?: number }>(apiKey, "/contacts", {
    method: "POST",
    body: corps as unknown as Record<string, unknown>,
  });
  const id = Number(res.data?.id);
  if (res.ok && Number.isFinite(id) && id > 0) {
    console.log(`[sio/tag] contact cree chez Systeme.io pour ${email}`);
    return id;
  }

  // Refus : soit il existait déjà (course entre deux webhooks), soit
  // l'API a dit non. On redemande avant de conclure.
  const apres = await trouverContact(apiKey, email);
  if (apres) return apres;
  console.error(
    `[sio/tag] contact NON cree pour ${email} (${res.status}) : ${res.error ?? "sans detail"}. ` +
      `Cette personne sortira des sequences email.`,
  );
  return null;
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
 * Le contact est CRÉÉ s'il n'existe pas : voir `assurerContact`. Sans
 * ça, un acheteur venu de notre bon de commande n'entrait dans aucune
 * séquence email, alors que les emails restent chez Systeme.io.
 *
 * Rend `false` sans rien casser quand : aucune clé n'est connectée, le
 * palier n'a pas d'étiquette connue, le contact n'a pas pu être créé,
 * ou l'étiquette n'existe pas.
 *
 * **On ne CRÉE jamais l'étiquette manquante**, et c'est délibéré : une
 * étiquette créée par nous avec une faute de frappe se retrouverait en
 * double dans sa liste, et ses automatisations continueraient de pointer
 * l'ancienne. Mieux vaut ne rien poser et le dire.
 */
/**
 * -- ELLE SERT AUSSI A L'INSCRIPTION GRATUITE (Bene, 25 aout 2026) -----
 *
 * "Inscrit gratos chez nous = contact cree chez systeme io et abonne a
 * la campagne tiquiz free !"
 *
 * Elle s'appelait `poserTagAchat`, ce qui laissait croire qu'elle ne
 * concernait qu'une vente. Elle pose le tag d'un PLAN, et `free` en est
 * un : c'est le meme geste, avec le tag `tiquiz-free`.
 */
export async function poserTagPlan(
  email: string,
  plan: string,
  identite: IdentiteContact = {},
): Promise<boolean> {
  const tag = readSioTag(plan);
  if (!tag) return false;
  return poserTagParNom(email, tag, identite);
}

/**
 * POSE UNE ÉTIQUETTE DÉSIGNÉE PAR SON NOM.
 *
 * Sortie de `poserTagPlan` le 30 août 2026, pour l'inscription à la
 * newsletter : son tag (`newsletter`) n'est le tag d'aucun palier, mais
 * le GESTE est exactement le même (trouver ou créer le contact, résoudre
 * l'étiquette, la poser). Recopier ces trois étapes dans une deuxième
 * route aurait donné deux implémentations qui divergent, ce que ce dépôt
 * a déjà payé quatre fois.
 *
 * L'étiquette n'est JAMAIS créée si elle n'existe pas : voir plus haut.
 */
export async function poserTagParNom(
  email: string,
  tag: string,
  identite: IdentiteContact = {},
): Promise<boolean> {
  const adresse = String(email ?? "").trim().toLowerCase();
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

    // TROUVÉ OU CRÉÉ. Avant le 25 août on se contentait de chercher, et
    // on abandonnait quand le contact n'existait pas : c'est à dire le
    // cas normal d'un client venu de NOTRE bon de commande. Il sortait
    // de toutes ses séquences, en silence.
    const contactId = await assurerContact(cle.apiKey, adresse, identite);
    if (!contactId) return false;

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
