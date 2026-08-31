// lib/blog/commentaires.ts
//
// LES COMMENTAIRES D'UN ARTICLE : CE QU'ON ACCEPTE, ET CE QU'ON REFUSE.
//
// Béné, 30 août 2026 : "y'a pas de proposition de partage de l'article,
// ni de commentaires : dommage ça aide à ranker."
//
// -- POURQUOI TOUT EST ICI, ET RIEN DANS LA ROUTE ---------------------
//
// Un formulaire public est la porte la plus exposée d'un site : c'est
// par là qu'arrivent le spam, les liens vendus et les injections. Les
// règles qui décident quoi accepter doivent donc être TESTÉES, et un
// module qui importe `supabaseAdmin` n'est importable par aucun test
// (leçon du verrou des webhooks, 24 août). Ce fichier ne connaît ni la
// base ni la requête : il reçoit un formulaire, il rend un verdict.
//
// -- CE QUI PASSE TOUT SEUL, ET CE QUI ATTEND (Béné, 31 août 2026) ----
//
// "Qui les valide, quand et comment ? J'ai voulu tester et il était
// écrit 'votre commentaire est en cours de validation'. Sauf que, ben
// c'est pas fait la suite ? On peut regarder ce que font les blogs les
// plus modernes et fiables en ce moment et calquer sur leur
// comportement ? Peut être une auto modération (pas de liens, pas de
// discours négatifs ou déplacés, pas de spam). L'idée c'est de
// permettre aux gens de laisser des commentaires (mais je dois être
// alertée pour savoir qu'il y en a) et de montrer aux moteurs de
// recherche et à l'IA que mon blog intéresse le public."
//
// **TOUT METTRE EN ATTENTE ÉTAIT LE VRAI DÉFAUT.** La file existait,
// l'écran d'admin existait, et personne ne relève une file tous les
// jours : en pratique, aucun commentaire n'aurait jamais été publié.
// Un blog dont la section commentaires reste vide dit à Google et aux
// modèles exactement le contraire de ce qu'elle cherche, ET la lectrice
// qui ne voit jamais son message ne revient pas.
//
// C'est ce que font les blogs qui marchent (Akismet, Disqus, le réglage
// par défaut de WordPress depuis des années) : on PUBLIE tout de suite
// ce qui n'a aucun signal douteux, on RETIENT ce qui en a un, et on
// REFUSE ce qui est manifestement inacceptable. Trois issues, pas deux.
//
//   publie      -> en ligne immédiatement, Béné est prévenue quand même
//   en_attente  -> un signal l'a retenu, elle tranche, elle est prévenue
//   refuse      -> propos haineux : ça n'atteint jamais la page
//
// **UN LIEN RETIENT TOUJOURS.** C'est sa règle ("pas de liens"), et
// c'est la seule qui protège vraiment : le spam de commentaire n'existe
// que pour poser un lien. Un lecteur honnête qui cite une source attend
// quelques heures, ce n'est pas cher payé.
//
// **ON RETIENT, ON NE REFUSE PAS, sauf haine.** Un doute mal placé qui
// REFUSE fait perdre un vrai lecteur sans que personne ne le sache. Un
// doute mal placé qui RETIENT coûte un clic à Béné. Les deux erreurs
// n'ont pas le même prix.
//
// -- L'ADRESSE EMAIL NE SORT JAMAIS -----------------------------------
//
// Elle est demandée (facultative) pour pouvoir répondre, elle est
// stockée, et AUCUNE lecture publique ne la renvoie. C'est la règle des
// IBAN du 25 août, transposée : ce qu'un écran peut afficher, un écran
// finit par l'afficher.

export type RaisonRefus =
  | "nom-manquant"
  | "nom-trop-long"
  | "message-court"
  | "message-long"
  | "email-invalide"
  | "trop-de-liens"
  | "piege"
  | "propos-interdits"
  | "article-inconnu";

export interface FormulaireCommentaire {
  slug: unknown;
  auteur: unknown;
  message: unknown;
  email?: unknown;
  /**
   * Le champ PIÈGE, invisible pour un humain.
   *
   * Un robot remplit tous les champs d'un formulaire ; une personne ne
   * voit même pas celui là. C'est le filtre anti-spam le moins cher qui
   * existe, et le seul qui ne demande rien au visiteur (un captcha, lui,
   * fait fuir une lectrice sur cinq et envoie ses données à un tiers).
   */
  siteWeb?: unknown;
}

export interface CommentairePropre {
  slug: string;
  auteur: string;
  message: string;
  email: string | null;
}

export const NOM_MAX = 60;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;
/**
 * Au delà, ce n'est plus un avis, c'est un placement de liens.
 *
 * DEUX et pas un : ce blog parle d'outils, et quelqu'un qui raconte son
 * cas cite naturellement Systeme.io et sa propre page. Un garde-fou qui
 * refuse un commentaire légitime finit désactivé, et on se retrouve
 * alors sans garde-fou du tout.
 */
export const LIENS_MAX = 2;

/** Où va le commentaire une fois accepté. */
export type StatutCommentaire = "publie" | "en_attente";

/** Ce qui a retenu un commentaire. Vide = il est passé tout seul. */
export type MotifRetenue =
  | "lien"
  | "spam"
  | "propos"
  | "cris"
  | "repetition"
  | "premier-mot-copie";

export type Verdict =
  | { ok: true; valeur: CommentairePropre; statut: StatutCommentaire; motifs: MotifRetenue[] }
  | { ok: false; raison: RaisonRefus };

/**
 * Le verdict sur un formulaire reçu.
 *
 * `slugsConnus` est un PARAMÈTRE OBLIGATOIRE : sans lui, n'importe qui
 * pourrait écrire des commentaires sous un slug inventé, et faire
 * grossir la table sans qu'aucune page ne les montre jamais.
 */
export function jugerCommentaire(
  f: FormulaireCommentaire,
  slugsConnus: readonly string[],
): Verdict {
  // Le piège d'abord : inutile de valider le reste d'un robot.
  if (texte(f.siteWeb).length > 0) return { ok: false, raison: "piege" };

  const slug = texte(f.slug);
  if (!slugsConnus.includes(slug)) return { ok: false, raison: "article-inconnu" };

  const auteur = texte(f.auteur);
  if (auteur.length < 2) return { ok: false, raison: "nom-manquant" };
  if (auteur.length > NOM_MAX) return { ok: false, raison: "nom-trop-long" };

  const message = texte(f.message);
  if (message.length < MESSAGE_MIN) return { ok: false, raison: "message-court" };
  if (message.length > MESSAGE_MAX) return { ok: false, raison: "message-long" };
  if (compterLiens(message) > LIENS_MAX) return { ok: false, raison: "trop-de-liens" };

  const brutEmail = texte(f.email);
  if (brutEmail && !emailPlausible(brutEmail)) return { ok: false, raison: "email-invalide" };

  // La haine ne va pas dans une file d'attente : elle n'entre pas.
  if (proposInterdits(message) || proposInterdits(auteur)) {
    return { ok: false, raison: "propos-interdits" };
  }

  const motifs = motifsDeRetenue(auteur, message);

  return {
    ok: true,
    statut: motifs.length === 0 ? "publie" : "en_attente",
    motifs,
    valeur: {
      slug,
      auteur,
      message,
      email: brutEmail ? brutEmail.toLowerCase() : null,
    },
  };
}

// ── CE QUI RETIENT UN COMMENTAIRE ────────────────────────────────────
//
// Chaque signal est SÉPARÉ et NOMMÉ : l'écran d'admin affiche le motif,
// donc Béné sait en une seconde si elle a affaire à du spam ou à une
// lectrice enthousiaste qui écrit en majuscules. Un booléen "suspect"
// lui ferait relire chaque message pour deviner ce qui l'a retenu.

/**
 * Les familles de spam de commentaire, telles qu'elles arrivent.
 *
 * Ce ne sont pas des mots isolés : "casino" seul peut apparaître dans
 * une phrase honnête. Ce sont des tournures de PLACEMENT (offre,
 * contact hors site, promesse de gain), qui ne servent qu'à ça.
 */
const SPAM = [
  /\b(viagra|cialis|casino en ligne|paris sportifs|crypto ?(pump|signal))/i,
  /\b(gagner|gagnez|earn) [^.!?]{0,30}\b(argent|money|euros?|\$|\d+ ?€)[^.!?]{0,30}\b(facile|rapide|jour|semaine|maison|home)/i,
  /\b(seo|backlinks?|referencement|référencement) [^.!?]{0,25}\b(pas cher|cheap|garanti|1000|offre)/i,
  /\b(whatsapp|telegram|wechat)\b[^.!?]{0,20}(\+?\d[\d ().-]{7,})/i,
  /\b(investi(r|ssement)|trading) [^.!?]{0,25}\b(garanti|sans risque|rendement)/i,
  /\b(hack(er|ing)?|pirat(er|age)) [^.!?]{0,25}\b(compte|mot de passe|whatsapp|instagram)/i,
];

/**
 * Les propos qui n'atteignent JAMAIS la page.
 *
 * La liste est courte et volontairement limitée aux insultes visant une
 * PERSONNE ou un GROUPE. Une liste longue de gros mots retiendrait
 * "putain c'est génial", qui est un compliment : un filtre qui crie
 * pour rien finit désactivé (leçon du filet genre-neutre, 24 août).
 *
 * Le `\p{L}` et le `u` sont nécessaires : sans eux, `\b` coupe mal sur
 * les mots accentués.
 */
const HAINE =
  /(\b(sale|sales)\s+(pd|pédé|pede|nègre|negre|arabe|juif|juive|noir|noire|bougnoule|youpin)\b)|\b(bougnoule|youpin|negro|nigger|pédé|pede|enculé|encule|salope|connasse|fdp|ntm|pute)\b/iu;

/** Vrai quand le texte porte une insulte ou un propos haineux. */
export function proposInterdits(texteBrut: string): boolean {
  return HAINE.test(String(texteBrut ?? ""));
}

/** Vrai quand le message a la forme d'un placement publicitaire. */
export function ressembleAuSpam(message: string): boolean {
  const m = String(message ?? "");
  return SPAM.some((r) => r.test(m));
}

/**
 * La part de MAJUSCULES d'un message, entre 0 et 1.
 *
 * Comptée sur les seules LETTRES : sinon un message court plein de
 * chiffres et de ponctuation sortirait à 100 % sans crier du tout.
 */
export function partDeMajuscules(message: string): number {
  const lettres = String(message ?? "").match(/\p{L}/gu) ?? [];
  if (lettres.length < 20) return 0;
  const hautes = lettres.filter((c) => c === c.toLocaleUpperCase() && c !== c.toLocaleLowerCase());
  return hautes.length / lettres.length;
}

/**
 * Tout ce qui retient ce commentaire, dans l'ordre du plus parlant.
 *
 * Rendre une LISTE et pas un booléen : deux signaux valent mieux qu'un
 * pour trancher, et l'écran d'admin les affiche tels quels.
 */
export function motifsDeRetenue(auteur: string, message: string): MotifRetenue[] {
  const m = String(message ?? "");
  const motifs: MotifRetenue[] = [];

  // UN LIEN RETIENT TOUJOURS. C'est sa règle, et c'est la seule qui
  // protège vraiment : le spam de commentaire n'existe que pour poser
  // un lien.
  if (compterLiens(m) > 0) motifs.push("lien");
  if (ressembleAuSpam(m)) motifs.push("spam");
  if (partDeMajuscules(m) > 0.6) motifs.push("cris");
  // Huit fois le même caractère : personne n'écrit ça, un robot si.
  if (/(.)\1{7,}/.test(m)) motifs.push("repetition");
  // Un "nom" qui est en fait un slogan ("Meilleur casino 2026").
  if (String(auteur ?? "").split(" ").length > 5) motifs.push("premier-mot-copie");

  return motifs;
}

/**
 * L'OBJET DE L'ALERTE ENVOYÉE À BÉNÉ.
 *
 * Il vit ICI, dans le module pur, et pas dans le module d'email : ce
 * dernier porte `import "server-only"`, donc aucun test ne peut le
 * charger. C'est exactement le piège qui avait caché le verrou des
 * webhooks le 24 août.
 *
 * L'objet DIT s'il y a quelque chose à faire : elle trie sa boîte sans
 * ouvrir. Un objet identique dans les deux cas la forcerait à ouvrir
 * chaque email pour savoir s'il l'attend.
 */
export function objetAlerte(a: { statut: StatutCommentaire; auteur: string }): string {
  return a.statut === "publie"
    ? `Blog : nouveau commentaire de ${a.auteur} (en ligne)`
    : `Blog : commentaire de ${a.auteur} à relire`;
}

/** Ce que chaque motif veut dire, pour l'écran d'admin. */
export const PHRASE_MOTIF: Record<MotifRetenue, string> = {
  lien: "contient un lien",
  spam: "tournure de spam",
  propos: "propos déplacés",
  cris: "écrit en majuscules",
  repetition: "caractères répétés",
  "premier-mot-copie": "le nom ressemble à un slogan",
};

/** Espaces normalisés, bornes retirées, jamais `undefined`. */
function texte(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** Les raccourcisseurs : une adresse dont on ne peut pas voir la destination. */
const RACCOURCISSEURS =
  /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|lnkd\.in)\b/gi;

/**
 * Combien de liens un message contient.
 *
 * DEUX FAMILLES, et une seule aurait été un mauvais garde-fou :
 *
 *   - les adresses explicites (`https://...`) ;
 *   - les RACCOURCISSEURS écrits en clair (`bit.ly/xyz`), qui sont la
 *     signature du spam parce qu'ils cachent la destination.
 *
 * Ce qu'on ne compte PAS, et c'est délibéré : un nom de domaine nu comme
 * `Systeme.io` ou `involve.me`. Ce blog parle d'outils, ces noms
 * apparaissent dans toute discussion normale, et les compter refuserait
 * les commentaires les plus intéressants. Un garde-fou qui crie pour
 * rien finit désactivé (leçon du filet genre-neutre, 24 août).
 *
 * On retire les adresses déjà comptées avant de chercher les
 * raccourcisseurs : sans ça, `https://bit.ly/x` compterait deux fois.
 */
export function compterLiens(message: string): number {
  const m = String(message ?? "");
  const explicites = m.match(/https?:\/\/\S+/gi) ?? [];
  const reste = m.replace(/https?:\/\/\S+/gi, " ");
  const raccourcis = reste.match(RACCOURCISSEURS) ?? [];
  return explicites.length + raccourcis.length;
}

/**
 * Une adresse email plausible.
 *
 * On vérifie la FORME, pas l'existence. Un `??` de complaisance
 * laisserait passer n'importe quoi, et une validation trop stricte
 * refuserait des adresses valides : la seule règle qui tient est
 * "quelque chose, un arobase, un domaine avec un point".
 */
export function emailPlausible(valeur: string): boolean {
  const v = String(valeur ?? "").trim();
  return v.length <= 200 && /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v);
}

/**
 * Le message, prêt à être RENDU DANS DU HTML.
 *
 * Il vient d'un inconnu et il finit sur la page publique d'un article :
 * on échappe, toujours, et on ne laisse AUCUNE balise. Les retours à la
 * ligne sont conservés parce qu'ils portent le sens d'un paragraphe,
 * mais bornés à deux : trente lignes vides sont une façon de pousser le
 * commentaire suivant hors de l'écran.
 */
export function messageEnHtml(message: string): string {
  return String(message ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("<br />");
}

/** La phrase à afficher pour chaque refus, en français. */
export const PHRASE_REFUS: Record<RaisonRefus, string> = {
  "nom-manquant": "Il manque ton prénom.",
  "nom-trop-long": `Ton nom fait plus de ${NOM_MAX} caractères.`,
  "message-court": `Ton message fait moins de ${MESSAGE_MIN} caractères.`,
  "message-long": `Ton message dépasse ${MESSAGE_MAX} caractères.`,
  "email-invalide": "Cette adresse email ne ressemble pas à une adresse.",
  "trop-de-liens": "Deux liens au maximum par commentaire, sinon ça part en pub.",
  // Le robot n'a pas besoin de comprendre, et une personne ne peut pas
  // tomber dessus : le champ est invisible.
  piege: "Ce message n'a pas pu être envoyé.",
  // Dire ce qui bloque, sans commenter la personne. Une phrase qui
  // sermonne appelle une deuxième tentative plus agressive.
  "propos-interdits": "Ce message ne peut pas être publié tel quel.",
  "article-inconnu": "Cet article n'existe pas.",
};
