// lib/blog/commentairesStore.ts
//
// LA BASE, ET RIEN D'AUTRE.
//
// Aucune décision ne vit ici : elles sont dans `commentaires.ts`, qui
// n'importe pas `supabaseAdmin` et que les tests peuvent donc charger.
// Ce fichier lit et écrit, c'est tout.
//
// -- TOUTES LES LECTURES SONT FAIL-OPEN --------------------------------
//
// La page d'article est rendue STATIQUEMENT, au build. Si Supabase
// répond mal ce jour là, ou si la migration n'est pas encore passée,
// l'article doit sortir quand même, sans sa section commentaires. Une
// page en erreur pour une liste de commentaires serait une régression
// bien plus chère que l'absence de la liste.
//
// L'ÉCRITURE, elle, ne se tait jamais : quelqu'un a cliqué "Envoyer" et
// doit savoir. C'est la règle du `ok: false` du 3 août.

import { createHash } from "node:crypto";

import type { CommentairePropre } from "./commentaires";

/**
 * LE CLIENT EST CHARGÉ À LA DEMANDE, ET C'EST NÉCESSAIRE.
 *
 * `lib/supabaseAdmin.ts` LÈVE au chargement du module quand
 * `NEXT_PUBLIC_SUPABASE_URL` ou la clé de service manquent. Un `import`
 * en tête de fichier faisait donc répondre **500 à toute la page
 * d'article** dès que l'environnement était incomplet, alors que le blog
 * n'a jamais eu besoin de base pour s'afficher : dix articles, dix
 * fichiers du dépôt.
 *
 * Constaté en lançant le serveur, pas déduit. C'est exactement le piège
 * que ce dépôt paie depuis juin (une page publique qui meurt parce
 * qu'une variable manque), et il est arrivé ici en ajoutant une
 * fonctionnalité annexe.
 *
 * Avec l'import dynamique, une base absente coûte la SECTION
 * commentaires, jamais l'article.
 */
async function client() {
  const mod = await import("@/lib/supabaseAdmin");
  return mod.supabaseAdmin;
}

export interface CommentairePublie {
  id: string;
  auteur: string;
  message: string;
  cree_le: string;
}

export interface CommentaireEnAttente extends CommentairePublie {
  slug: string;
  statut: string;
}

/**
 * Les commentaires PUBLIÉS d'un article, du plus ancien au plus récent.
 *
 * La colonne `email` n'est pas dans le `select`, et ce n'est pas une
 * économie : un `select("*")` finit toujours par arriver jusqu'à un
 * navigateur. C'est exactement ce qui s'est passé le 25 août avec les
 * IBAN des versements.
 */
export async function lireCommentairesPublies(slug: string): Promise<CommentairePublie[]> {
  try {
    const { data, error } = await (await client())
      .from("blog_commentaires")
      .select("id, auteur, message, cree_le")
      .eq("slug", slug)
      .eq("statut", "publie")
      .order("cree_le", { ascending: true })
      .limit(200);
    if (error) return [];
    return (data ?? []) as CommentairePublie[];
  } catch {
    return [];
  }
}

/** Combien de commentaires publiés porte chaque article, en une requête. */
export async function compterParArticle(): Promise<Record<string, number>> {
  try {
    const { data, error } = await (await client())
      .from("blog_commentaires")
      .select("slug")
      .eq("statut", "publie")
      .limit(5000);
    if (error) return {};
    const out: Record<string, number> = {};
    for (const l of data ?? []) out[(l as { slug: string }).slug] = (out[(l as { slug: string }).slug] ?? 0) + 1;
    return out;
  } catch {
    return {};
  }
}

/**
 * L'adresse IP, HACHÉE avec un sel.
 *
 * On veut repérer un envoi en rafale, pas identifier quelqu'un. Une IP
 * en clair dans une table est une donnée personnelle qu'on n'a aucune
 * raison de garder ; son empreinte suffit à comparer deux envois.
 */
export function empreinteIp(ip: string): string {
  const sel = process.env.PII_MASTER_KEY ?? "sel-par-defaut-blog";
  return createHash("sha256").update(`${sel}:${ip}`).digest("hex").slice(0, 32);
}

export type ResultatEcriture = { ok: true } | { ok: false; raison: "table_absente" | "ecriture" };

/** Enregistre un commentaire EN ATTENTE. Rien n'est publié par cette route. */
export async function enregistrerCommentaire(
  c: CommentairePropre,
  ip: string,
): Promise<ResultatEcriture> {
  try {
    const { error } = await (await client()).from("blog_commentaires").insert({
      slug: c.slug,
      auteur: c.auteur,
      message: c.message,
      email: c.email,
      ip_hash: empreinteIp(ip),
      statut: "en_attente",
    });
    if (!error) return { ok: true };
    // PostgREST répond `PGRST205` quand la table n'existe pas encore :
    // on le DIT au lieu d'un "erreur serveur" qui enverrait chercher un
    // bug dans le code (drame du 404 muet, 19 août).
    const code = String((error as { code?: string }).code ?? "");
    const message = String(error.message ?? "");
    if (code === "PGRST205" || /schema cache|does not exist/i.test(message)) {
      console.error("[blog] table blog_commentaires absente : migration 20260830 non appliquee");
      return { ok: false, raison: "table_absente" };
    }
    console.error("[blog] ecriture commentaire refusee", message);
    return { ok: false, raison: "ecriture" };
  } catch (e) {
    console.error("[blog] ecriture commentaire impossible", e);
    return { ok: false, raison: "ecriture" };
  }
}

/** La file de modération : ce qui attend depuis le plus longtemps d'abord. */
export async function lireFileModeration(limite = 100): Promise<CommentaireEnAttente[]> {
  try {
    const { data, error } = await (await client())
      .from("blog_commentaires")
      .select("id, slug, auteur, message, cree_le, statut")
      .eq("statut", "en_attente")
      .order("cree_le", { ascending: true })
      .limit(limite);
    if (error) return [];
    return (data ?? []) as CommentaireEnAttente[];
  } catch {
    return [];
  }
}

/** Publie ou refuse un commentaire. Rend `false` si rien n'a bougé. */
export async function modererCommentaire(
  id: string,
  statut: "publie" | "refuse",
  par: string,
): Promise<boolean> {
  try {
    const { error } = await (await client())
      .from("blog_commentaires")
      .update({ statut, modere_le: new Date().toISOString(), modere_par: par })
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}
