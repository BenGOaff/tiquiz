// lib/integrations/store.ts
//
// LES CONNEXIONS CRM EN BASE : lecture, écriture, chiffrement, et la
// résolution "vers où part ce lead". AUCUNE décision ici (elles sont
// dans `decision.ts`, pur) : ce module importe `supabaseAdmin`, donc
// aucun test ne peut le charger, donc rien de ce qui y vivrait ne
// serait testé.
//
// -- LE SECRET EST UNE ENVELOPPE, ET ELLE DIT SA FORME -----------------
//
// `secret_chiffre` porte un JSON chiffré (même AES-GCM que les clés
// Systeme.io, `lib/sio/keyCrypto.ts`). Sa forme dépend de la façon dont
// la connexion a été faite, et c'est un CHAMP (`kind`), jamais deviné :
//
//   - `pit`           : un jeton "Private Integration" collé à la main.
//                       Il n'expire pas.
//   - `oauth-location`: le bouton "Connecter avec GoHighLevel", sur UN
//                       sous-compte. Le jeton d'accès expire (un jour),
//                       le jeton de rafraîchissement le renouvelle.
//   - `oauth-agence`  : le même bouton, sur une AGENCE. Le jeton est
//                       celui de l'agence ; un jeton de sous-compte se
//                       demande à chaque envoi (`/oauth/locationToken`).
//
// Deviner à la forme du jeton (`pit-` devant ou pas) marcherait
// aujourd'hui et casserait le jour où GoHighLevel change son préfixe :
// c'est la règle du 1er août, la mécanique est un paramètre.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptApiKey, encryptApiKey } from "@/lib/sio/keyCrypto";
import { resolveProjectIdForInsert } from "@/lib/projects/scopeFilter";
import { resolveApiKey } from "@/lib/sio/resolveApiKey";
import { ghlRequete } from "@/lib/integrations/adaptateurs/gohighlevel";
import {
  choisirDestination,
  derniersCaracteres,
  type ConnexionPourDecision,
} from "@/lib/integrations/decision";
import { estFournisseurCrm, type Fournisseur } from "@/lib/integrations/fournisseurs";

export type SecretConnexion =
  | { kind: "pit"; token: string }
  | { kind: "oauth-location"; access: string; refresh: string; expiresAt: number }
  | { kind: "oauth-agence"; access: string; refresh: string; expiresAt: number; companyId: string };

export interface ConnexionRow {
  id: string;
  user_id: string;
  project_id: string | null;
  fournisseur: string;
  nom: string;
  secret_chiffre: string;
  secret_last4: string | null;
  config: Record<string, unknown>;
  actif: boolean;
  est_defaut: boolean;
  etat: "ok" | "deconnecte";
  derniere_erreur: string | null;
  deconnecte_le: string | null;
  alerte_deconnexion_le: string | null;
  derniere_validation_le: string | null;
  created_at: string;
  updated_at: string;
}

/** Ce qui part vers le navigateur : jamais le secret, ni chiffré ni en clair. */
export interface ConnexionPublique {
  id: string;
  fournisseur: Fournisseur;
  nom: string;
  last4: string | null;
  /** Comment elle a été faite : "jeton" ou "oauth". Le navigateur l'affiche. */
  mode: "jeton" | "oauth";
  locationId: string | null;
  actif: boolean;
  est_defaut: boolean;
  etat: "ok" | "deconnecte";
  derniere_erreur: string | null;
  deconnecte_le: string | null;
  derniere_validation_le: string | null;
  created_at: string;
}

export function versPublique(r: ConnexionRow): ConnexionPublique {
  const config = (r.config ?? {}) as Record<string, unknown>;
  return {
    id: r.id,
    fournisseur: r.fournisseur as Fournisseur,
    nom: r.nom,
    last4: r.secret_last4,
    mode: String(config.mode ?? "jeton") === "oauth" ? "oauth" : "jeton",
    locationId: typeof config.locationId === "string" ? config.locationId : null,
    actif: r.actif !== false,
    est_defaut: r.est_defaut === true,
    etat: r.etat === "deconnecte" ? "deconnecte" : "ok",
    derniere_erreur: r.derniere_erreur,
    deconnecte_le: r.deconnecte_le,
    derniere_validation_le: r.derniere_validation_le,
    created_at: r.created_at,
  };
}

function versDecision(r: ConnexionRow): ConnexionPourDecision {
  return {
    id: r.id,
    fournisseur: r.fournisseur as Fournisseur,
    actif: r.actif !== false,
    est_defaut: r.est_defaut === true,
    etat: r.etat === "deconnecte" ? "deconnecte" : "ok",
    alerte_deconnexion_le: r.alerte_deconnexion_le ?? null,
  };
}

function chiffrerSecret(s: SecretConnexion): string {
  return encryptApiKey(JSON.stringify(s));
}

function dechiffrerSecret(enveloppe: string): SecretConnexion | null {
  try {
    const brut = JSON.parse(decryptApiKey(enveloppe)) as Partial<SecretConnexion> & { kind?: string };
    if (brut.kind === "pit" && typeof brut.token === "string") return { kind: "pit", token: brut.token };
    if (
      (brut.kind === "oauth-location" || brut.kind === "oauth-agence") &&
      typeof brut.access === "string" &&
      typeof brut.refresh === "string"
    ) {
      const expiresAt = typeof brut.expiresAt === "number" ? brut.expiresAt : 0;
      if (brut.kind === "oauth-agence") {
        const companyId = String((brut as { companyId?: unknown }).companyId ?? "");
        if (!companyId) return null;
        return { kind: "oauth-agence", access: brut.access, refresh: brut.refresh, expiresAt, companyId };
      }
      return { kind: "oauth-location", access: brut.access, refresh: brut.refresh, expiresAt };
    }
    return null;
  } catch {
    return null;
  }
}

function last4DuSecret(s: SecretConnexion): string {
  return derniersCaracteres(s.kind === "pit" ? s.token : s.access);
}

// ── Lecture ───────────────────────────────────────────────────────────

export async function listerConnexions(userId: string, projectId?: string | null): Promise<ConnexionPublique[]> {
  const scope = projectId ?? (await resolveProjectIdForInsert(userId));
  let q = supabaseAdmin
    .from("connexions_crm")
    .select("*")
    .eq("user_id", userId)
    .order("est_defaut", { ascending: false })
    .order("created_at", { ascending: true });
  if (scope) q = q.eq("project_id", scope);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as ConnexionRow[]).map(versPublique);
}

/** Lecture par id, cross-projet (comme `getDecryptedKey` côté Systeme.io). */
export async function lireConnexion(userId: string, id: string): Promise<ConnexionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("connexions_crm")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ConnexionRow | null) ?? null;
}

// ── Écriture ──────────────────────────────────────────────────────────

export async function creerConnexion(args: {
  userId: string;
  projectId?: string | null;
  fournisseur: Fournisseur;
  nom: string;
  secret: SecretConnexion;
  config: Record<string, unknown>;
}): Promise<ConnexionPublique> {
  if (!estFournisseurCrm(args.fournisseur)) throw new Error("FOURNISSEUR_INCONNU");
  const scope = args.projectId ?? (await resolveProjectIdForInsert(args.userId));

  // La première connexion d'un projet devient son défaut : sans ça, un
  // quiz qui ne choisit rien continuerait d'aller chez Systeme.io alors
  // que la personne vient de connecter GoHighLevel et n'a pas de clé
  // Systeme.io du tout.
  let q = supabaseAdmin
    .from("connexions_crm")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId);
  if (scope) q = q.eq("project_id", scope);
  const { count } = await q;

  const { data, error } = await supabaseAdmin
    .from("connexions_crm")
    .insert({
      user_id: args.userId,
      project_id: scope,
      fournisseur: args.fournisseur,
      nom: args.nom.trim().slice(0, 80),
      secret_chiffre: chiffrerSecret(args.secret),
      secret_last4: last4DuSecret(args.secret),
      config: args.config,
      est_defaut: (count ?? 0) === 0,
      etat: "ok",
      derniere_validation_le: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return versPublique(data as ConnexionRow);
}

export async function majConnexion(
  userId: string,
  id: string,
  patch: { nom?: string; actif?: boolean; estDefaut?: boolean; secret?: SecretConnexion; config?: Record<string, unknown> },
): Promise<ConnexionPublique | null> {
  const cible = await lireConnexion(userId, id);
  if (!cible) return null;

  if (patch.estDefaut === true) {
    let unset = supabaseAdmin
      .from("connexions_crm")
      .update({ est_defaut: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("est_defaut", true)
      .neq("id", id);
    unset = cible.project_id ? unset.eq("project_id", cible.project_id) : unset.is("project_id", null);
    await unset;
  }

  const maj: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.nom === "string" && patch.nom.trim()) maj.nom = patch.nom.trim().slice(0, 80);
  if (typeof patch.actif === "boolean") maj.actif = patch.actif;
  if (typeof patch.estDefaut === "boolean") maj.est_defaut = patch.estDefaut;
  if (patch.secret) {
    maj.secret_chiffre = chiffrerSecret(patch.secret);
    maj.secret_last4 = last4DuSecret(patch.secret);
    // Un nouveau jeton remet les compteurs : c'est la personne qui vient
    // de réagir à l'alerte.
    maj.etat = "ok";
    maj.derniere_erreur = null;
    maj.deconnecte_le = null;
    maj.alerte_deconnexion_le = null;
    maj.derniere_validation_le = new Date().toISOString();
  }
  if (patch.config) maj.config = { ...(cible.config ?? {}), ...patch.config };

  const { data, error } = await supabaseAdmin
    .from("connexions_crm")
    .update(maj)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? versPublique(data as ConnexionRow) : null;
}

export async function supprimerConnexion(userId: string, id: string): Promise<void> {
  const cible = await lireConnexion(userId, id);
  if (!cible) return;
  const { error } = await supabaseAdmin.from("connexions_crm").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
  if (cible.est_defaut) {
    let q = supabaseAdmin
      .from("connexions_crm")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    q = cible.project_id ? q.eq("project_id", cible.project_id) : q.is("project_id", null);
    const { data } = await q.maybeSingle();
    const suivante = (data as { id?: string } | null)?.id;
    if (suivante) {
      await supabaseAdmin.from("connexions_crm").update({ est_defaut: true }).eq("id", suivante);
    }
  }
}

/** L'état après un envoi ou un test. `alerte` = on vient d'écrire l'email. */
export async function marquerEtatConnexion(
  id: string,
  etat: "ok" | "deconnecte",
  args: { erreur?: string | null; alerteEnvoyee?: boolean } = {},
): Promise<void> {
  const maintenant = new Date().toISOString();
  const maj: Record<string, unknown> =
    etat === "ok"
      ? { etat, derniere_erreur: null, deconnecte_le: null, alerte_deconnexion_le: null, derniere_validation_le: maintenant, updated_at: maintenant }
      : { etat, derniere_erreur: (args.erreur ?? "").slice(0, 500) || null, deconnecte_le: maintenant, updated_at: maintenant };
  if (etat === "deconnecte" && args.alerteEnvoyee) maj.alerte_deconnexion_le = maintenant;
  await supabaseAdmin.from("connexions_crm").update(maj).eq("id", id);
}

/** Le même marquage pour une clé Systeme.io (table `sio_api_keys`). */
export async function marquerEtatCleSio(
  keyId: string,
  etat: "ok" | "deconnecte",
  args: { alerteEnvoyee?: boolean } = {},
): Promise<void> {
  const maintenant = new Date().toISOString();
  const maj: Record<string, unknown> =
    etat === "ok"
      ? { validation_status: "validated", deconnecte_le: null, alerte_deconnexion_le: null, last_validated_at: maintenant, updated_at: maintenant }
      : { validation_status: "deconnecte", deconnecte_le: maintenant, updated_at: maintenant };
  if (etat === "deconnecte" && args.alerteEnvoyee) maj.alerte_deconnexion_le = maintenant;
  await supabaseAdmin.from("sio_api_keys").update(maj).eq("id", keyId);
}

// ── Les jetons OAuth GoHighLevel ──────────────────────────────────────

const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const GHL_LOCATION_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/locationToken";

export function oauthGhlConfigure(): boolean {
  return Boolean(process.env.GHL_CLIENT_ID?.trim() && process.env.GHL_CLIENT_SECRET?.trim());
}

interface ReponseJeton {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  locationId?: string;
  companyId?: string;
  userType?: string;
}

async function posterFormulaire(url: string, champs: Record<string, string>, bearer?: string): Promise<{ ok: boolean; status: number; data: ReponseJeton | null; erreur?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", Version: "2021-07-28" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const res = await fetch(url, { method: "POST", headers, body: new URLSearchParams(champs).toString(), signal: AbortSignal.timeout(15_000) });
    const text = await res.text();
    let data: ReponseJeton | null = null;
    try { data = text ? (JSON.parse(text) as ReponseJeton) : null; } catch { data = null; }
    return { ok: res.ok, status: res.status, data, erreur: res.ok ? undefined : text.slice(0, 200) };
  } catch (e) {
    return { ok: false, status: 0, data: null, erreur: e instanceof Error ? e.message : String(e) };
  }
}

/** Échange le code reçu au retour de GoHighLevel contre les jetons. */
export async function echangerCodeGhl(code: string, userType: "Location" | "Company", redirectUri: string) {
  return posterFormulaire(GHL_TOKEN_URL, {
    client_id: process.env.GHL_CLIENT_ID ?? "",
    client_secret: process.env.GHL_CLIENT_SECRET ?? "",
    grant_type: "authorization_code",
    code,
    user_type: userType,
    redirect_uri: redirectUri,
  });
}

async function rafraichirJetonGhl(refresh: string, userType: "Location" | "Company") {
  return posterFormulaire(GHL_TOKEN_URL, {
    client_id: process.env.GHL_CLIENT_ID ?? "",
    client_secret: process.env.GHL_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: refresh,
    user_type: userType,
  });
}

/** Les sous-comptes sur lesquels l'app est installée (installation d'agence). */
export async function sousComptesInstallesGhl(accessAgence: string, companyId: string): Promise<{ ok: boolean; status: number; locations: Array<{ id: string; name: string }>; erreur?: string }> {
  const appId = process.env.GHL_APP_ID?.trim() ?? "";
  const r = await ghlRequete<{ locations?: Array<{ _id?: string; id?: string; name?: string }> }>(
    accessAgence,
    `/oauth/installedLocations?companyId=${encodeURIComponent(companyId)}&appId=${encodeURIComponent(appId)}&isInstalled=true&limit=100`,
  );
  if (!r.ok) return { ok: false, status: r.status, locations: [], erreur: r.erreur };
  const locations = (Array.isArray(r.data?.locations) ? r.data!.locations! : [])
    .map((l) => ({ id: String(l._id ?? l.id ?? "").trim(), name: String(l.name ?? "").trim() }))
    .filter((l) => l.id);
  return { ok: true, status: r.status, locations };
}

/**
 * LE JETON QUI MARCHE MAINTENANT pour cette connexion, quelle que soit
 * sa forme. Rafraîchit et RÉÉCRIT le secret quand un jeton OAuth a
 * expiré (avec une marge de cinq minutes : un jeton qui expire pendant
 * l'envoi rend un 401 qu'on lirait comme "déconnecté").
 *
 * Rend `null` quand le rafraîchissement est refusé : c'est le vrai
 * "déconnecté" d'une connexion OAuth (l'app a été désinstallée, ou
 * l'accès révoqué).
 */
export async function jetonCourant(row: ConnexionRow): Promise<{ token: string; locationId: string } | null> {
  const secret = dechiffrerSecret(row.secret_chiffre);
  const config = (row.config ?? {}) as Record<string, unknown>;
  const locationId = typeof config.locationId === "string" ? config.locationId : "";
  if (!secret || !locationId) return null;
  const marge = 5 * 60 * 1000;

  if (secret.kind === "pit") return { token: secret.token, locationId };

  let access = secret.access;
  if (secret.expiresAt - marge < Date.now()) {
    const r = await rafraichirJetonGhl(secret.refresh, secret.kind === "oauth-agence" ? "Company" : "Location");
    if (!r.ok || !r.data?.access_token) {
      console.error(`[connexions] rafraichissement OAuth refuse pour ${row.id} (${r.status})`);
      return null;
    }
    access = r.data.access_token;
    const neuf: SecretConnexion = {
      ...secret,
      access,
      refresh: r.data.refresh_token || secret.refresh,
      expiresAt: Date.now() + Number(r.data.expires_in ?? 86_400) * 1000,
    };
    await supabaseAdmin
      .from("connexions_crm")
      .update({ secret_chiffre: chiffrerSecret(neuf), secret_last4: last4DuSecret(neuf), updated_at: new Date().toISOString() })
      .eq("id", row.id);
  }

  if (secret.kind === "oauth-location") return { token: access, locationId };

  // Agence : un jeton de sous-compte se demande à chaque fois. Court, et
  // c'est voulu : le garder en base doublerait les jetons à protéger.
  const l = await posterFormulaire(GHL_LOCATION_TOKEN_URL, { companyId: secret.companyId, locationId }, access);
  if (!l.ok || !l.data?.access_token) {
    console.error(`[connexions] jeton de sous-compte refuse pour ${row.id} (${l.status})`);
    return null;
  }
  return { token: l.data.access_token, locationId };
}

// ── Vers où part un lead ──────────────────────────────────────────────

export type Destination =
  | { type: "systemeio"; apiKey: string; keyId: string | null }
  | { type: "gohighlevel"; connexionId: string; nom: string; token: string; locationId: string; alerteDeja: boolean }
  /** Une connexion visée, en pause : rien ne part, et l'appelant le journalise. */
  | { type: "pause"; fournisseur: Fournisseur; id: string }
  /** Une connexion OAuth dont le jeton ne se rafraîchit plus : déconnectée. */
  | { type: "deconnecte"; fournisseur: Fournisseur; connexionId: string; alerteDeja: boolean }
  | null;

/**
 * Applique `choisirDestination` (pur) aux lignes de la base, puis
 * retombe sur la cascade Systeme.io. Voir `decision.ts` pour l'ordre
 * et ses raisons.
 */
export async function resoudreDestination(
  userId: string,
  args: { connexionId?: string | null; sioKeyId?: string | null; projectId?: string | null },
): Promise<Destination> {
  let connexionDuQuiz: ConnexionRow | null = null;
  if (args.connexionId) connexionDuQuiz = await lireConnexion(userId, args.connexionId);

  let connexionParDefaut: ConnexionRow | null = null;
  if (!connexionDuQuiz) {
    let q = supabaseAdmin
      .from("connexions_crm")
      .select("*")
      .eq("user_id", userId)
      .eq("est_defaut", true);
    q = args.projectId ? q.eq("project_id", args.projectId) : q.is("project_id", null);
    const { data } = await q.maybeSingle();
    connexionParDefaut = (data as ConnexionRow | null) ?? null;
  }

  const choix = choisirDestination({
    connexionDuQuiz: connexionDuQuiz ? versDecision(connexionDuQuiz) : null,
    connexionParDefaut: connexionParDefaut ? versDecision(connexionParDefaut) : null,
  });

  if (choix.type === "pause") return { type: "pause", fournisseur: choix.fournisseur, id: choix.id };

  if (choix.type === "connexion") {
    const row = (connexionDuQuiz ?? connexionParDefaut)!;
    if (row.fournisseur !== "gohighlevel") {
      return { type: "deconnecte", fournisseur: row.fournisseur as Fournisseur, connexionId: row.id, alerteDeja: row.alerte_deconnexion_le !== null };
    }
    const jeton = await jetonCourant(row);
    if (!jeton) {
      return { type: "deconnecte", fournisseur: "gohighlevel", connexionId: row.id, alerteDeja: row.alerte_deconnexion_le !== null };
    }
    return { type: "gohighlevel", connexionId: row.id, nom: row.nom, token: jeton.token, locationId: jeton.locationId, alerteDeja: row.alerte_deconnexion_le !== null };
  }

  const resolved = await resolveApiKey(userId, { explicitKeyId: args.sioKeyId ?? null, projectId: args.projectId ?? null });
  if (!resolved) return null;
  if (!resolved.actif) return { type: "pause", fournisseur: "systemeio", id: resolved.keyId ?? "legacy" };
  return { type: "systemeio", apiKey: resolved.apiKey, keyId: resolved.keyId };
}
