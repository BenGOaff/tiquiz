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
