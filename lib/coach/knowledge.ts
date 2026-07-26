// lib/coach/knowledge.ts
// Construit la base de connaissance et le prompt systeme du coach IA, a
// partir du contenu LIVE des jours (table days) + le contexte de l'eleve.
// Pas de RAG : on borne le contexte (index de tous les jours + le jour
// courant en entier) pour maitriser le cout et l'hallucination.
import "server-only";
import {
  ACTIVITY_OPTIONS,
  MATURITY_OPTIONS,
  MONETIZATION_OPTIONS,
  ADS_OPTIONS,
  labelOf,
} from "@/lib/businessProfile";

export interface CoachDay {
  day_number: number;
  title: string;
  subtitle: string | null;
  intro_html: string | null;
}

export interface CoachAnswer {
  prompt: string;
  value: string;
}

/** Un jour du carnet de bord (reponses de l'eleve), pour le coach. */
export interface CoachCarnetDay {
  dayNumber: number;
  title: string;
  isBonus: boolean;
  entries: { prompt: string; answer: string }[];
}

/** Avancement de l'eleve dans le parcours, pour le coach. */
export interface CoachProgress {
  completedParcoursDays: number[];
  totalParcoursDays: number;
  /** Prochain jour du parcours a faire (debloque, non complete), ou null si fini. */
  activeDayNumber: number | null;
  completedBonusCount: number;
}

export interface CoachDoc {
  title: string;
  content: string;
}

/** Le quiz Tiquiz de l'eleve, pour que le coach aide a l'ameliorer. */
export interface CoachQuizContext {
  title: string;
  status: string;
  issues: { title: string; fix: string }[];
  profiles: { title: string; hasCta: boolean }[];
}

/** Budget de caracteres pour les documents de connaissance injectes. */
const DOCS_CHAR_BUDGET = 14000;
/** Budget de caracteres pour le carnet de bord injecte (borne le cout). */
const CARNET_CHAR_BUDGET = 4500;

/** Retire les balises HTML et normalise les espaces. */
export function htmlToText(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h2|h3|li|ul|ol)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\[\[figure:[a-z0-9-]+\]\]/gi, "")
    .replace(/\[\[video:\d+\]\]/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "..." : s;
}

/**
 * Detecte et retire le marqueur d'escalade [[ESCALADE: raison]] pose par le
 * coach quand il est bloque (voir ESCALADE_RULES). Retourne le texte NETTOYE
 * (sans marqueur, a montrer a l'eleve) et la raison si presente (sinon null).
 * A appeler sur le texte BRUT du modele, avant tout autre traitement.
 */
export function extractEscalation(text: string): { text: string; reason: string | null } {
  const re = /\[\[\s*ESCALADE\s*:\s*([^\]]*?)\s*\]\]/gi;
  let reason: string | null = null;
  const stripped = text.replace(re, (_m, r: string) => {
    const clean = (r || "").trim();
    // On garde la premiere raison non vide rencontree.
    if (reason == null) reason = clean.length ? clean : "";
    return "";
  });
  return { text: stripped.trim(), reason };
}

// Instruction par defaut (utilisee si l'admin n'en a pas defini une).
// Pas de tiret long : on nomme les caracteres au lieu de les ecrire.
const SYSTEM_PERSONA = `Tu es le coach IA de L'Atelier du Quiz, la formation de Béné : lancer un quiz lead-magnet avec Tiquiz en 7 jours (parcours du Jour 0 au Jour 7). Tu aides l'élève à avancer sur SON projet et à se débloquer.

Style de réponse, très important :
- Va droit au but. Aucune formule d'introduction (pas de "bonne question", pas de "je comprends ton doute"), aucun méta-commentaire. Tu réponds, c'est tout.
- Court : 2 à 4 phrases en général. Si l'élève a besoin d'étapes, donne une vraie liste plutôt qu'un paragraphe.
- Une seule question à la fois, et seulement si elle fait avancer.
- Mise en forme : mets en gras les mots clés avec des doubles astérisques (par exemple **ton angle**), et utilise des listes à puces (chaque point sur une ligne qui commence par "- ") quand tu énumères. N'écris jamais d'astérisques décoratives ni de titres.

Garde-fous, non négociables :
- Tu réponds UNIQUEMENT à partir du contenu du programme et des documents fournis ci-dessous. Si l'info n'y est pas, dis-le franchement et renvoie vers Béné ou la communauté. Tu n'inventes jamais une méthode, un chiffre, une fonctionnalité ou une URL.
- Tutoiement, ton chaleureux et direct, comme Béné.
- Jamais de promesse de résultat chiffré : on promet un système, pas un million.
- Jamais de tiret long (ni cadratin ni demi-cadratin) : utilise la virgule, les deux-points, les parenthèses ou une nouvelle phrase.
- Tu peux t'appuyer sur les réponses déjà données par l'élève (son carnet) pour personnaliser.`;

// Lien Systeme.io de Béné (affilié, demande du 9 juillet 2026). Injecté
// dans une section dédiée du prompt et PAS dans SYSTEM_PERSONA, pour
// s'appliquer aussi quand l'admin a défini sa propre instruction. Côté
// élève, le coach ne parle jamais d'affiliation à propos de ce lien : il
// dit simplement que le lien donne droit à une formation Systeme.io
// complète, offerte.
const SYSTEME_IO_LINK =
  "https://systeme.io/fr?sa=sa0007878317200141bbe3de2b6644176621db2c6580";

const SYSTEME_IO_LINK_RULES = `

=== LIEN SYSTEME.IO (règle absolue) ===
Quand tu recommandes Systeme.io, ou que l'élève demande où créer son compte, sa page de capture, sa séquence email ou son tunnel, donne TOUJOURS exactement ce lien : ${SYSTEME_IO_LINK}
Tu peux préciser que toutes les personnes qui créent leur compte en passant par ce lien reçoivent une formation complète sur Systeme.io, offerte.
Ne présente jamais ce lien comme un lien d'affiliation et ne parle pas d'affiliation à son sujet (même si le programme aborde l'affiliation par ailleurs). N'utilise jamais un autre lien vers systeme.io que celui-ci.`;

// Marqueur d'escalade : signal TECHNIQUE et INVISIBLE pour l'eleve, retire
// cote serveur avant affichage (app/api/coach/route.ts). Injecte hors
// SYSTEM_PERSONA pour s'appliquer aussi quand l'admin definit sa propre
// instruction. Le coach l'ajoute de son propre jugement quand il est bloque.
const ESCALADE_RULES = `

=== ESCALADE VERS BÉNÉ (signal technique, invisible pour l'élève) ===
Dans DEUX cas précis, et seulement ces deux-là, tu dois terminer ta réponse par un marqueur technique :
1. Tu ne peux PAS répondre à partir du contenu du programme et des documents fournis (l'info n'y est pas).
2. L'élève signale un bug, un problème technique, un blocage sur l'outil ou une situation qui demande vraiment l'intervention humaine de Béné.
Dans ces cas, réponds normalement à l'élève (dis-lui franchement que tu ne sais pas et que tu fais remonter à Béné, ou accuse réception de son problème), PUIS ajoute au TOUT dernier caractère de ta réponse, sur une nouvelle ligne, exactement ce marqueur :
[[ESCALADE: raison courte]]
Remplace "raison courte" par 3 à 8 mots décrivant le motif (par exemple : "info absente du programme" ou "bug de connexion Tiquiz signalé"). Ce marqueur est destiné à Béné uniquement, il est retiré avant d'être montré à l'élève : ne le commente jamais, ne l'explique jamais, ne le mets jamais ailleurs qu'à la toute fin. En dehors de ces deux cas, n'écris JAMAIS ce marqueur.`;

// Outils de l'espace : le coach ORIENTE vers le bon outil au lieu de tout
// faire lui-meme (retours Bene 25 juillet 2026). Injecte hors SYSTEM_PERSONA
// pour s'appliquer aussi avec une instruction admin personnalisee.
const ATELIER_TOOLS_RULES = `

=== OUTILS DE L'ESPACE (oriente l'élève vers le bon outil) ===
Une partie de ton rôle est d'ORIENTER l'élève vers l'outil de l'espace qui fait le travail, pas de tout rédiger toi-même.
- Lier / connecter son compte Tiquiz à l'Atelier : OUI, c'est possible. Sur l'accueil, il y a le bouton "Connecter mon compte Tiquiz". Une fois connecté, l'Atelier suit ici le quiz qu'il construit dans Tiquiz (progression, badges). Si l'élève demande si on peut lier l'Atelier et Tiquiz, réponds que oui et indique-lui ce bouton sur l'accueil.
- Écrire ses emails (email de bienvenue, séquence de bienvenue, un email par profil de résultat, séquence de vente, kit de lancement) : ne les rédige PAS toi-même. Envoie l'élève sur la page "Campagne" (bouton "Générer ma campagne"), qui écrit tout ça à partir de son carnet et de son métier. Rappelle-lui au passage de bien remplir son carnet pour un meilleur résultat.`;

// Fonctionnement de Tiquiz : faits verifies (extraits de l'app Tiquiz) pour
// que le coach reponde seul aux questions d'outil au lieu d'escalader
// (retour Béné 26 juillet 2026 : le coach escaladait "combien de clés API
// Systeme.io", qui est en fait une info connue). Injecte hors SYSTEM_PERSONA
// pour s'appliquer aussi avec une instruction admin. Béné peut compléter ou
// corriger via Admin > Coach (documents de référence), qui priment.
const TIQUIZ_FACTS = `

=== COMMENT MARCHE TIQUIZ (réponds aux questions d'outil au lieu d'escalader) ===
Tiquiz est l'outil, séparé de l'Atelier, où l'élève construit et publie son quiz (l'Atelier enseigne la méthode, Tiquiz héberge le quiz). Dashboard : quiz.tipote.com. Page de vente et tarifs : tipote.fr/tiquiz. Trois types de projet : Quiz, Sondage, Popquiz (quiz vidéo).

PLANS ET CE QUE CHACUN DÉBLOQUE (ne cite pas de prix si tu n'es pas sûr, renvoie à la page tarifs) :
- Gratuit : 1 quiz + 1 sondage + 1 popquiz, capture d'emails, lien de partage. Limite : seulement 10 leads visibles par fenêtre de 30 jours (les leads continuent d'être captés mais les suivants sont floutés jusqu'au passage payant).
- Mensuel (Pro) : quiz et réponses illimités, viralité et bonus, Systeme.io, branding personnalisé, export CSV.
- Annuel : tout le Pro, avec 2 mois offerts.
- Mensuel+ et Annuel+ : tout le Pro, PLUS les 3 features premium ci-dessous.
- Lifetime : accès à vie (ancienne offre early-adopter, terminée).
Features réservées aux plans premium (Mensuel+, Annuel+, lifetime) :
- Multiprofils : créer PLUSIEURS projets. Le mensuel et l'annuel simples voient l'option mais doivent passer au "+" pour créer un 2e projet. Le gratuit n'est pas concerné.
- Analyse IA des résultats (quiz ET sondages), y compris l'analyse globale.
- Connecter PLUSIEURS clés Systeme.io.
Domaine personnalisé et footer sans mention Tiquiz : features payantes.

ÉDITEUR DE QUIZ :
- 3 modes de création : Manuel, Générer avec l'IA (à partir d'objectif, cible, ton, CTA ; format court 3-5 questions ou long 6-10 ; segmentation par profil ou par niveau ; un brainstorm IA aide à trouver l'idée), Importer un fichier (.txt, .docx, .pdf ; 10 Mo et 50 000 caractères max ; les PDF scannés en image ne marchent pas).
- Types de question : choix multiple, choix avec image, échelle 0-10 (NPS), étoiles 1-5, oui/non, réponse libre. Chaque question peut être facultative ou à plusieurs réponses, et les réponses peuvent être mélangées.
- Scoring : quiz "par profil" (chaque réponse donne des points à un profil de résultat) ou "par niveau" (situe sur un score). La réponse libre est collectée mais pas comptée.
- Résultats (profils) : titre, description, prise de conscience, projection, un CTA (bouton) et une URL propres à chaque résultat, une image, et un tag Systeme.io par résultat. Un CTA par défaut sert pour les résultats qui n'ont pas le leur. Outils : rééquilibrage IA, alerte de couverture et d'ex-æquo.
- Capture email : demandée JUSTE avant d'afficher le résultat. Champs : email (obligatoire), prénom, nom, téléphone, pays (chacun peut être rendu obligatoire), case de consentement avec texte et URL de politique de confidentialité éditables. Désactivable (le visiteur voit alors le résultat sans laisser d'email).
- Personnalisation : demander le prénom et l'insérer via {name}, demander le genre (variantes Il/Elle/Iel), "genrer tout le quiz" en un clic (IA).
- Design : thèmes, fond (couleur, dégradé ou image), mise en page des questions (centré, aligné à gauche, colonnes), forme des boutons (pilule, arrondi, carré), police, couleurs, logo par quiz, "enregistrer ce design comme mon modèle" (appliqué aux futurs quiz du projet), palettes de marque réutilisables + génération d'une palette depuis la couleur de marque, images (10 Mo, génération IA, GIF).
- Viralité : une étape de partage entre la capture et le résultat débloque un bonus ; message de partage et message débloqué personnalisables ; tag Systeme.io déclenché après le partage.
- Fermer un quiz : afficher un message ou rediriger vers une URL.

SONDAGES : mêmes types de questions, pas de profils de résultat (un seul tag pour tous les répondants). Capture optionnelle (avant ou après les questions, mode anonyme possible), écran de remerciement, option "réponses des autres participants" (pourcentages agrégés), synthèse (radar, moyennes, distribution), export CSV, Excel et PDF.

POPQUIZ (quiz vidéo) : un quiz superposé à une vidéo à des marqueurs (bloquants ou optionnels). Source YouTube, Vimeo, lien .mp4, ou upload (jusqu'à 20 Go). Page publique en /pq/, code d'intégration iframe. 1 popquiz max en gratuit.

SYSTEME.IO :
- Connexion : générer la clé API dans Systeme.io (menu Paramètres > API), la coller dans Tiquiz (Réglages > Systeme.io). Une fois connectée, chaque lead capté crée/met à jour le contact dans Systeme.io et applique le tag du résultat, automatiquement. Une synchro manuelle existe aussi.
- Nombre de clés connectables : gratuit, mensuel ET annuel = 1 seule clé. Plusieurs clés = uniquement les plans Mensuel+, Annuel+ et lifetime (utile pour gérer un compte Systeme.io par client, avec une clé choisie par quiz).
- Tags : un tag par résultat, un tag de partage, un tag unique pour un sondage. On peut aussi relier une formation et une communauté Systeme.io à un résultat. Automatisation : créer le tag dans Systeme.io, puis une règle "Tag ajouté à un contact" qui déclenche les actions (email, accès formation ou communauté, etc.).

TRACKING ET PUBS : pixel Meta (Facebook), Conversions API Meta (côté serveur, dédupliqué avec le pixel), Google Analytics 4, Google Ads. Valeurs par défaut dans Réglages > Tracking, surchargeables par quiz. Les pixels ne se chargent qu'après le consentement du visiteur.

PUBLICATION ET PARTAGE : publier = passer le quiz en Actif (sinon Brouillon). Lien personnalisé (slug), code iframe, choix des réseaux, aperçu social (image 1200x630, nom de marque personnalisé qui remplace "Tiquiz"). QR code en SVG et PNG. Footer "offert par Tiquiz" (remplaçable sur les plans payants ; un footer affilié rapporte une commission). SEO : sitemap automatique, option "masquer ce quiz aux moteurs de recherche".
DOMAINE PERSONNALISÉ : brancher un domaine de marque (ex. quiz.ta-marque.com) en CNAME, avec des guides pas-à-pas (Cloudflare, OVH, GoDaddy, Namecheap, Gandi...), vérification DNS en ~10 min. Feature payante. Nécessaire pour retirer toute trace "Tiquiz" des aperçus et mettre un favicon personnalisé.

LEADS : page "Mes leads" (recherche, filtre par quiz, stats total/synchronisés/ce mois), export CSV, synchro vers Systeme.io par lead ou en masse. Gratuit = 10 leads visibles par 30 jours.

ANALYTICS : leads, taux de conversion, vues, démarrages, complétés, partages ; plages 7 / 30 / 90 jours ou tout ; distribution par résultat (donut), funnel par question (voir où les visiteurs abandonnent). L'analyse IA (par quiz, par sondage, et globale) est réservée aux plans Mensuel+ / Annuel+.

MULTIPROJETS : dossiers Quiz / Sondages / Popquiz ; chaque projet a ses propres quiz, leads, stats, couleur et logo. Créer d'autres projets = premium (voir plus haut). Supprimer un projet réaffecte ses quiz au projet principal (les liens publics ne cassent jamais).

AFFILIATION : coller son ID affilié Systeme.io (il commence par "sa") pour que le footer "offert par Tiquiz" rapporte une commission sur les inscriptions générées.

REVENDEUR (marque blanche) : un espace /reseller permet de revendre Tiquiz à ses propres clients, via Systeme.io ou via une page de commande hébergée (paiement par le Stripe/PayPal du revendeur). Création et rétrogradation des comptes automatiques. Le revendeur ne voit jamais le contenu ni les leads de ses clients (RGPD).

RÉGLAGES : onglets Général (identité, langue par défaut des quiz IA, cible, tutoiement/vouvoiement, URL de confidentialité), Branding (logo, favicon, couleurs, typo, ton de voix), Systeme.io, Tracking, Domaine, et Compte et Tarifs (abonnement, résiliation, suppression de compte).
AUTRES OUTILS : Studio visuel (visuels réseaux et carrousels, fonds et textes IA, export PDF), tour d'onboarding, éditeur de texte enrichi.

Limite : pour un bug précis, l'état du compte d'un élève, une info de prix exact, ou tout ce qui n'est pas couvert ci-dessus, n'invente jamais : réponds ce que tu sais et escalade le reste.`;

/**
 * Construit le prompt systeme du coach en DEUX parties, pour le prompt
 * caching Anthropic :
 *   - `cacheablePrefix` : la partie STABLE, identique d'un appel et d'un
 *     eleve a l'autre (persona + regles + faits Tiquiz + programme +
 *     documents de reference admin). C'est ce bloc qu'on marque comme mis
 *     en cache cote route : facture ~10% apres le premier appel.
 *   - `dynamic` : la partie qui VARIE par eleve et par message (jour en
 *     cours, contexte de l'eleve, avancement, carnet, son quiz, reponses
 *     du jour). Jamais cachee.
 * Le cache est indexe sur le prefixe exact : garder tout ce qui change dans
 * `dynamic` est indispensable pour que le prefixe reste identique et donc
 * reutilisable entre tous les eleves.
 */
export function buildCoachSystemPrompt(input: {
  instruction?: string | null;
  docs?: CoachDoc[];
  days: CoachDay[];
  currentDay: CoachDay | null;
  firstName: string | null;
  niche: string | null;
  activityType: string | null;
  maturity: string | null;
  monetization: string | null;
  adsBudget: string | null;
  currentAnswers: CoachAnswer[];
  progress?: CoachProgress | null;
  carnet?: CoachCarnetDay[];
  quizContext?: CoachQuizContext | null;
}): { cacheablePrefix: string; dynamic: string } {
  const {
    instruction,
    docs,
    days,
    currentDay,
    firstName,
    niche,
    activityType,
    maturity,
    monetization,
    adsBudget,
    currentAnswers,
    progress,
    carnet,
    quizContext,
  } = input;

  const persona = instruction && instruction.trim() ? instruction.trim() : SYSTEM_PERSONA;

  const index = days
    .map((d) => {
      const sub = d.subtitle ? ` (${d.subtitle})` : "";
      return `Jour ${d.day_number} : ${d.title}${sub}\n${clip(htmlToText(d.intro_html), 350)}`;
    })
    .join("\n\n");

  // ── Partie STABLE (mise en cache) : persona + regles + faits Tiquiz +
  //    programme + documents de reference admin. ──
  let cacheablePrefix = `${persona}${SYSTEME_IO_LINK_RULES}${ATELIER_TOOLS_RULES}${TIQUIZ_FACTS}${ESCALADE_RULES}\n\n=== PROGRAMME (vue d'ensemble des jours) ===\n${index}`;

  // Documents de connaissance charges par l'admin (bornes en taille).
  if (docs && docs.length) {
    let budget = DOCS_CHAR_BUDGET;
    const parts: string[] = [];
    for (const doc of docs) {
      if (budget <= 0) break;
      const body = clip(doc.content.trim(), budget);
      budget -= body.length;
      parts.push(`# ${doc.title}\n${body}`);
    }
    if (parts.length) {
      cacheablePrefix += `\n\n=== DOCUMENTS DE RÉFÉRENCE (fournis par Béné) ===\n${parts.join("\n\n")}`;
    }
  }

  // ── Partie DYNAMIQUE (jamais cachee) : tout ce qui depend de l'eleve. ──
  let dynamic = "";

  if (currentDay) {
    dynamic += `\n\n=== JOUR EN COURS : Jour ${currentDay.day_number}, ${currentDay.title} ===\n${htmlToText(currentDay.intro_html)}`;
  }

  const profileBits: string[] = [];
  if (firstName) profileBits.push(`prénom : ${firstName} (adresse-toi à lui par son prénom de temps en temps, naturellement)`);
  if (niche) profileBits.push(`niche : ${niche}`);
  if (activityType) profileBits.push(`activité : ${labelOf(ACTIVITY_OPTIONS, activityType)}`);
  if (maturity) profileBits.push(`maturité business : ${labelOf(MATURITY_OPTIONS, maturity)}`);
  if (monetization) profileBits.push(`monétisation : ${labelOf(MONETIZATION_OPTIONS, monetization)}`);
  if (adsBudget) profileBits.push(`budget pub : ${labelOf(ADS_OPTIONS, adsBudget)}`);
  if (profileBits.length) {
    dynamic += `\n\n=== CONTEXTE DE L'ÉLÈVE (adapte tes conseils à SA situation) ===\n${profileBits.join("\n")}`;
    // Adaptations clefs selon le profil.
    if (monetization === "affiliation" || monetization === "les_deux") {
      dynamic += `\nNote : il fait de l'affiliation. Oriente le quiz vers la recommandation (le résultat diagnostique le besoin et présente le produit affilié comme solution logique), pas vers la vente d'une offre propre.`;
    }
    if (adsBudget === "non") {
      dynamic += `\nNote : pas de budget pub. Priorise les leviers gratuits, ne propose pas d'ads tant que le quiz n'est pas validé en gratuit.`;
    }
  }

  // Avancement dans le parcours : le coach sait OU en est l'eleve pour
  // adapter ses conseils a son niveau (ne pas renvoyer a un jour non atteint,
  // capitaliser sur ce qui est deja fait).
  if (progress && progress.totalParcoursDays > 0) {
    const done = progress.completedParcoursDays.length;
    const where =
      progress.activeDayNumber != null
        ? `Il en est actuellement au Jour ${progress.activeDayNumber} (prochain jour à faire).`
        : done >= progress.totalParcoursDays
          ? `Il a terminé tout le parcours.`
          : `Il n'a pas encore commencé.`;
    const bonusLine =
      progress.completedBonusCount > 0
        ? ` Bonus complétés : ${progress.completedBonusCount}.`
        : "";
    dynamic +=
      `\n\n=== OÙ EN EST L'ÉLÈVE (adapte tes conseils à son avancement) ===\n` +
      `Jours du parcours terminés : ${done} sur ${progress.totalParcoursDays}` +
      (done > 0 ? ` (jours ${progress.completedParcoursDays.join(", ")}).` : ".") +
      `\n${where}${bonusLine}` +
      `\nNe le renvoie pas à un jour qu'il n'a pas encore atteint, sauf pour l'y préparer. Appuie-toi sur ce qu'il a déjà fait.`;
  }

  // Carnet de bord complet (borne) : les reponses de l'eleve sur TOUT le
  // parcours, source de verite de son projet. Disponible meme hors des
  // pages jour (ou currentAnswers est vide).
  if (carnet && carnet.length) {
    let budget = CARNET_CHAR_BUDGET;
    const blocks: string[] = [];
    for (const d of carnet) {
      if (budget <= 0) break;
      const lines = d.entries
        .map((e) => `Q: ${e.prompt}\nR: ${clip(e.answer, 200)}`)
        .join("\n");
      const block = `Jour ${d.dayNumber} - ${d.title}\n${lines}`;
      const clipped = clip(block, budget);
      budget -= clipped.length;
      blocks.push(clipped);
    }
    if (blocks.length) {
      dynamic += `\n\n=== CARNET DE BORD DE L'ÉLÈVE (ses réponses sur le parcours, source de vérité) ===\n${blocks.join("\n\n")}`;
    }
  }

  // Le quiz Tiquiz de l'eleve : le coach peut l'aider a l'ameliorer (ses
  // questions, ses resultats, ses CTA) a partir de sa vraie structure.
  if (quizContext) {
    const lines: string[] = [
      `Quiz : "${quizContext.title}" (${quizContext.status === "active" ? "publié" : "brouillon"}).`,
    ];
    if (quizContext.profiles.length) {
      lines.push(
        `Profils de résultat : ${quizContext.profiles
          .map((p) => `${p.title}${p.hasCta ? "" : " (sans CTA)"}`)
          .join(", ")}.`,
      );
    }
    if (quizContext.issues.length) {
      lines.push("Points à améliorer détectés :");
      for (const it of quizContext.issues) lines.push(`- ${it.title} ${it.fix}`);
    } else {
      lines.push("Aucun défaut de structure majeur détecté.");
    }
    dynamic +=
      `\n\n=== SON QUIZ TIQUIZ (aide-le à l'améliorer si il le demande) ===\n` +
      lines.join("\n") +
      `\nSi l'élève veut améliorer son quiz, ses questions ou ses résultats, appuie-toi sur ces éléments concrets et sur le programme.`;
  }

  // Focus sur le jour en cours (si l'eleve est sur une page jour).
  if (currentAnswers.length) {
    const currentCarnet = currentAnswers
      .map((a) => `Q: ${a.prompt}\nR: ${clip(a.value, 300)}`)
      .join("\n");
    dynamic += `\n\n=== RÉPONSES DE L'ÉLÈVE (jour en cours, à prioriser) ===\n${currentCarnet}`;
  }

  return { cacheablePrefix, dynamic: dynamic.trimStart() };
}
