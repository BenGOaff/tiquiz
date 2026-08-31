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

/**
 * Le compte dont la clé Systeme.io porte les contacts de Tiquiz.
 *
 * ON ESSAIE TOUS LES ADMINS, PAS SEULEMENT LE PREMIER (31 août 2026).
 * Cette fonction ne regardait que `ADMIN_EMAILS[0]` : si le profil qui
 * porte la clé est enregistré sous l'autre adresse, elle rendait `null`
 * et TOUTE la chaîne s'arrêtait là, en silence.
 *
 * `.maybeSingle()` ÉCHOUE quand deux lignes matchent, et son erreur
 * était ignorée. On prend donc la première ligne d'une liste bornée
 * plutôt qu'un `maybeSingle` qui transforme un doublon en absence.
 */
async function idProprietaire(): Promise<string | null> {
  for (const admin of ADMIN_EMAILS) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", admin.trim().toLowerCase())
      .limit(1);
    if (error) {
      console.warn(`[sio/tag] lecture du profil admin impossible : ${error.message}`);
      continue;
    }
    const id = (data as { user_id?: string }[] | null)?.[0]?.user_id;
    if (id) return id;
  }
  return null;
}

/**
 * LA CLÉ DU COMPTE PROPRIÉTAIRE, BASE PUIS `.env`.
 *
 * PANNE DU 31 AOÛT 2026. Béné : "j'ai ma clé api dans tiquiz, dans
 * .env, partout... je ne sais pas ce qui merde." Elle avait raison de
 * s'énerver : `resolveApiKey` ne lit QUE la base de données
 * (`sio_api_keys`, ou l'ancienne colonne du profil). **Une clé posée
 * dans le `.env` n'était lue par personne sur ce chemin**, alors que
 * `SYSTEME_IO_API_KEY` est déjà la variable que `lib/systemeIoClient.ts`
 * utilise pour la facturation. Deux endroits qui ont besoin de la même
 * clé, et un seul qui savait où elle était.
 *
 * **LE REPLI EST ICI, PAS DANS `resolveApiKey`, et c'est capital.**
 * `resolveApiKey` sert AUSSI les revendeurs, qui ont chacun LEUR clé et
 * LEUR compte Systeme.io. Y mettre le repli ferait écrire les contacts
 * d'un revendeur dans le compte de Béné le jour où sa clé manque : une
 * fuite d'une cliente vers une autre, silencieuse. Le repli ne vaut que
 * pour le compte PROPRIÉTAIRE, donc il vit dans cette fonction là.
 */
async function cleDuProprietaire(): Promise<{ apiKey: string; source: string } | null> {
  const proprietaire = await idProprietaire();
  if (proprietaire) {
    const cle = await resolveApiKey(proprietaire);
    if (cle) return { apiKey: cle.apiKey, source: cle.source };
  }
  const duFichier = process.env.SYSTEME_IO_API_KEY?.trim();
  if (duFichier) return { apiKey: duFichier, source: "env" };
  return null;
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
/**
 * POURQUOI LA POSE A ÉCHOUÉ.
 *
 * PANNE DU 31 AOÛT 2026 : le formulaire de la newsletter répondait 502
 * et Béné n'avait aucun moyen de savoir POURQUOI. Cette fonction
 * écrasait CINQ causes distinctes en un seul `false` : pas de compte
 * admin, pas de clé, contact impossible, étiquette inconnue, pose
 * refusée. Un booléen ne dit pas où chercher.
 *
 * C'est le drame du 19 août ("trois causes, un seul message : le 404
 * muet") dans une autre famille. Le serveur rend une RAISON.
 */
export type RaisonPoseTag =
  | "ok"
  | "adresse_ou_tag_vide"
  | "aucun_admin"
  | "aucune_cle"
  | "contact_impossible"
  | "tag_inconnu"
  | "pose_refusee"
  | "exception";

export interface ResultatPoseTag {
  ok: boolean;
  raison: RaisonPoseTag;
}

/**
 * La version qui DIT ce qui s'est passé.
 *
 * `poserTagParNom` reste un booléen pour tous les appelants qui n'ont
 * rien à en faire (les webhooks de vente : ils ne doivent jamais
 * bloquer un accès). Les écrans qui répondent à un humain appellent
 * celle-ci.
 */
export async function poserTagParNomDetaille(
  email: string,
  tag: string,
  identite: IdentiteContact = {},
): Promise<ResultatPoseTag> {
  const adresse = String(email ?? "").trim().toLowerCase();
  if (!adresse || !tag) return { ok: false, raison: "adresse_ou_tag_vide" };

  try {
    const cle = await cleDuProprietaire();
    if (!cle) {
      console.warn(
        `[sio/tag] aucune cle Systeme.io trouvee (ni dans sio_api_keys pour ` +
          `${ADMIN_EMAILS.join(" / ")}, ni dans SYSTEME_IO_API_KEY) : ` +
          `${adresse} n'est pas etiquete ${tag}.`,
      );
      return { ok: false, raison: "aucune_cle" };
    }
    console.log(`[sio/tag] cle Systeme.io resolue (source: ${cle.source}).`);

    // TROUVÉ OU CRÉÉ. Avant le 25 août on se contentait de chercher, et
    // on abandonnait quand le contact n'existait pas : c'est à dire le
    // cas normal d'un client venu de NOTRE bon de commande. Il sortait
    // de toutes ses séquences, en silence.
    const contactId = await assurerContact(cle.apiKey, adresse, identite);
    if (!contactId) return { ok: false, raison: "contact_impossible" };

    const tagId = await trouverTag(cle.apiKey, tag);
    if (!tagId) {
      console.warn(`[sio/tag] l'etiquette ${tag} n'existe pas chez Systeme.io.`);
      return { ok: false, raison: "tag_inconnu" };
    }

    const res = await sioUserRequest(cle.apiKey, `/contacts/${contactId}/tags`, {
      method: "POST",
      body: { tagId },
    });
    if (!res.ok) {
      console.warn(`[sio/tag] pose refusee pour ${adresse} (${res.status}).`);
      return { ok: false, raison: "pose_refusee" };
    }
    return { ok: true, raison: "ok" };
  } catch (e) {
    console.error(`[sio/tag] ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, raison: "exception" };
  }
}

/**
 * La même chose, en booléen.
 *
 * Gardée pour les webhooks de vente : une étiquette qui échoue ne doit
 * JAMAIS priver quelqu'un de l'accès qu'il vient de payer (règle du
 * 7 août), donc ils n'ont rien à faire de la raison.
 */
export async function poserTagParNom(
  email: string,
  tag: string,
  identite: IdentiteContact = {},
): Promise<boolean> {
  const r = await poserTagParNomDetaille(email, tag, identite);
  return r.ok;
}
