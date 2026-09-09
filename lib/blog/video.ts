// lib/blog/video.ts
//
// LA VIDÉO D'UN ARTICLE : ce qu'on a le droit d'en faire.
//
// Béné, 8 septembre 2026 : "oui je veux la vidéo Youtube".
//
// Sa page `avis-tiquiz` porte une vidéo depuis l'origine. L'import la
// SIGNALAIT sans la poser (`restes.videos`), pour une raison qui était
// juste : `nettoyerBloc` retire les `iframe`, donc la poser en bloc
// `html` aurait donné un bloc VIDE, et personne ne l'aurait vu.
//
// -- LE BLOG NE PORTE AUCUNE BANNIÈRE DE CONSENTEMENT ------------------
//
// MESURÉ avant d'écrire une ligne, pas supposé : le bandeau cookies est
// celui de Béné, il vit dans la page de vente CAPTURÉE, et il range son
// choix dans `aq_consent_v1` (cf. `components/analytics/
// GoogleAnalytics.tsx`). Un article de blog n'en porte AUCUN.
//
// Donc rien de tiers ne doit être contacté avant que la personne ne le
// demande. Ni un cookie, ni une adresse IP transmise, ni même une
// requête vers Google au chargement.
//
// -- CE QUE `youtube-nocookie.com` FAIT, ET CE QU'IL NE FAIT PAS -------
//
// Il ne dépose pas de cookie de suivi TANT QUE la vidéo n'est pas
// lancée. Il ne rend pas la page anonyme pour autant : dès que le cadre
// existe, l'adresse IP du visiteur part chez Google. C'est pour ça que
// le domaine ne suffit pas et que le cadre n'est POSÉ QU'AU CLIC.
//
// -- LA MINIATURE EST RECOPIÉE CHEZ NOUS -------------------------------
//
// Une miniature servie depuis `i.ytimg.com` serait exactement la
// requête tierce qu'on cherche à éviter, et elle partirait sur CHAQUE
// chargement de l'article. Elle vit donc sur notre disque, dans
// `public/blog/video/`.
//
// -- L'IDENTIFIANT EST VALIDÉ, JAMAIS RECOPIÉ --------------------------
//
// Il finit dans un attribut `src`. Une URL qu'on ne sait pas lire rend
// `null`, et l'import la SIGNALE au lieu de poser un cadre cassé : on
// ne fabrique jamais une adresse à partir de ce qu'on n'a pas compris.

/** La forme d'un identifiant YouTube. 11 caractères, et rien d'autre. */
const FORME_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * L'identifiant d'une vidéo, lu dans son adresse.
 *
 * Les trois formes qui circulent : `youtu.be/<id>`,
 * `youtube.com/watch?v=<id>` et `youtube.com/embed/<id>`. Tout le reste
 * rend `null`, y compris une adresse qui porte bien un identifiant mais
 * sur un hôte qu'on ne connaît pas.
 */
export function idYouTube(url: unknown): string | null {
  const brut = String(url ?? "").trim();
  if (!brut) return null;

  let u: URL;
  try {
    u = new URL(brut);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;

  const hote = u.hostname.replace(/^www\./, "").toLowerCase();
  let candidat = "";

  if (hote === "youtu.be") {
    candidat = u.pathname.slice(1).split("/")[0] ?? "";
  } else if (hote === "youtube.com" || hote === "m.youtube.com" || hote === "youtube-nocookie.com") {
    const seg = u.pathname.split("/").filter(Boolean);
    if (seg[0] === "embed" || seg[0] === "shorts" || seg[0] === "v") candidat = seg[1] ?? "";
    else candidat = u.searchParams.get("v") ?? "";
  } else {
    return null;
  }

  return FORME_ID.test(candidat) ? candidat : null;
}

/**
 * L'adresse du cadre, posée SEULEMENT au clic.
 *
 * `autoplay=1` parce qu'on arrive ici par un clic sur la miniature : la
 * personne a déjà demandé la vidéo, lui faire cliquer une deuxième fois
 * serait un geste pour rien.
 *
 * `rel=0` borne les suggestions de fin aux vidéos de la même chaîne :
 * sans lui, YouTube propose n'importe quoi sous un article de Béné.
 */
export function urlEmbedYouTube(id: string): string | null {
  if (!FORME_ID.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

/** L'adresse publique de la vidéo, celle du repli sans JavaScript. */
export function urlYouTube(id: string): string | null {
  if (!FORME_ID.test(id)) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Où vit la miniature RECOPIÉE chez nous. */
export function cheminMiniature(id: string): string | null {
  if (!FORME_ID.test(id)) return null;
  return `/blog/video/${id}.webp`;
}
