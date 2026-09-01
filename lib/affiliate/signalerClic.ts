// lib/affiliate/signalerClic.ts
//
// LE CLIC EST COMPTÉ LÀ OÙ LE LIEN ATTERRIT (Béné, 27 août 2026).
//
// "Je veux UN lien affilié pour chaque page, avec l'ID de l'affilié et
// ça doit tout compter, pourquoi tu me parles de deux URL là ?"
//
// Le lien affilié est, et reste, `tiquiz.fr/?ref=jocelyne`. Il posait
// déjà le cookie d'un an, rattachait à vie, ouvrait le mois offert et
// payait la commission tous les mois. La SEULE chose qui manquait,
// c'était le comptage du clic : un compteur existait (le redirecteur
// `/go/` de l'espace affilié, écrit le 19 août) et rien ne l'utilisait,
// parce que la page Promouvoir distribue le lien direct.
//
// On ne change donc pas le lien de tout le monde pour nourrir le
// compteur : on branche le compteur sur le lien.
//
// -- TROIS RÈGLES, ET ELLES SONT TOUTES DES REFUS ----------------------
//
// 1. ÇA NE FAIT JAMAIS ATTENDRE LE VISITEUR. L'appel part dans le
//    `waitUntil` du middleware, donc hors du chemin de la réponse, avec
//    un délai maximum court. Une page de vente ralentie coûte une vente ;
//    un clic non compté coûte une ligne dans un tableau.
// 2. ÇA NE LÈVE JAMAIS. Le registre des affiliées vit chez Tipote : si
//    Tipote ne répond pas, la page de Tiquiz s'affiche exactement pareil.
// 3. ÇA NE DÉCIDE RIEN. Qui est l'affiliée, si elle est active, et le
//    dédoublonnage par empreinte d'IP sur 30 minutes : tout ça se passe
//    là-bas, dans la MÊME fonction que le redirecteur `/go/`. Deux
//    compteurs écrits séparément finiraient par ne pas dire la même
//    chose, et c'est le tableau de bord de l'affiliée qui mentirait.
//
// Edge-compatible : ni Node, ni Supabase, ni dépendance. Ce module est
// importé par le middleware.

const TIPOTE_PAR_DEFAUT = "https://app.tipote.com";

/** L'app qui porte le registre. Validée, jamais locale (drame Véronique). */
export function tipoteBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const brut = String(env.TIPOTE_APP_URL ?? "").trim().replace(/\/+$/, "");
  if (/^https:\/\/[^/]+$/.test(brut) && !/localhost|127\.|::1|\.local/.test(brut)) return brut;
  return TIPOTE_PAR_DEFAUT;
}

/**
 * Un clic vaut d'être signalé quand il y a un code ET que la requête est
 * une VRAIE page.
 *
 * Sans ce second garde, une page qui charge une image ou appelle une de
 * nos routes en gardant `?ref=` dans l'URL ferait plusieurs clics pour
 * une seule visite. Le dédoublonnage par IP les absorberait la plupart
 * du temps, mais compter juste vaut mieux que compter puis corriger.
 *
 * Fonction PURE : c'est la seule décision de ce fichier, donc la seule
 * chose qui pouvait dériver, donc la seule chose à tester.
 */
/**
 * Le paramètre par lequel un affilié nomme son canal.
 *
 * `?ref=eric&sc=youtube`, `&sc=newsletter`, `&sc=story-mardi`.
 *
 * -- POURQUOI DEUX NOMS LUS, ET UN SEUL ÉCRIT -------------------------
 *
 * Il s'appelait `c` depuis le 19 août, et des liens le portent peut être
 * déjà. Renommer sec ferait perdre le canal de ceux là, en silence, et
 * un canal perdu ne se retrouve pas : le clic est passé.
 *
 * On LIT donc les deux, on n'en ÉCRIT qu'un (`sc`, plus explicite et
 * moins susceptible d'entrer en collision avec un paramètre de
 * quelqu'un d'autre). La règle habituelle tient : le nom de ce qu'on
 * fabrique vit à UN endroit.
 */
export const CANAL_PARAM = "sc";

/** Les noms acceptés en LECTURE, le nôtre d'abord. */
export const CANAL_PARAMS: readonly string[] = [CANAL_PARAM, "c"];

/**
 * Le canal porté par cette URL, quel que soit le nom utilisé.
 *
 * Le premier nom RENSEIGNÉ gagne : quelqu'un qui écrit les deux a
 * probablement corrigé son lien sans retirer l'ancien.
 */
export function canalDeLUrl(params: { get(cle: string): string | null }): string | null {
  for (const nom of CANAL_PARAMS) {
    const v = lireCanalBrut(params.get(nom));
    if (v) return v;
  }
  return null;
}

/** Ce qu'on accepte de transporter. Le nettoyage se fait chez Tipote. */
export function lireCanalBrut(valeur: string | null | undefined): string | null {
  const brut = String(valeur ?? "").trim().slice(0, 40);
  return brut || null;
}

export function clicASignaler(args: {
  ref: string | null | undefined;
  pathname: string;
  /** L'en-tête `accept` : un navigateur qui demande une PAGE dit `text/html`. */
  accept: string | null | undefined;
}): boolean {
  if (!String(args.ref ?? "").trim()) return false;
  if (args.pathname.startsWith("/api/")) return false;
  // Un fichier a une extension ; une page n'en a pas.
  if (/\.[a-z0-9]{2,5}$/i.test(args.pathname)) return false;
  return String(args.accept ?? "").includes("text/html");
}

/**
 * Signale le clic à Tipote. Ne lève jamais, n'attend presque pas.
 *
 * À appeler dans un `waitUntil` : la valeur de retour n'intéresse
 * personne, seul l'effet compte.
 */
export async function signalerClic(args: {
  ref: string;
  /**
   * Le tag que l'affilié a posée lui même (`?c=youtube`), BRUTE.
   *
   * On ne la nettoie PAS ici, et c'est voulu : la mise en forme d'un
   * canal vit dans `sanitizeChannel`, chez Tipote, avec le reste des
   * règles de comptage. La recopier ici en donnerait deux versions, et
   * le jour où elles divergent, `youtube` et `Youtube` deviennent deux
   * canaux différents dans le tableau de l'affilié.
   */
  canal: string | null;
  pageUrl: string;
  referrer: string | null;
  userAgent: string | null;
  ip: string | null;
}): Promise<void> {
  const secret = (process.env.AFFILIATE_INTERNAL_SECRET ?? "").trim();
  if (!secret) return;
  try {
    await fetch(`${tipoteBaseUrl()}/api/affiliate/clic`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Affiliate-Secret": secret },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Volontairement muet : c'est une statistique, et elle passe APRÈS
    // la page. Le journal de Tipote garde la trace des échecs côté
    // registre, là où quelqu'un peut agir.
  }
}
