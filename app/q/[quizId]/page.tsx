// app/q/[quizId]/page.tsx
// Public quiz page (no auth required).
// The "[quizId]" URL segment accepts either the quiz UUID or a custom slug.
import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PublicQuizClient from "@/components/quiz/PublicQuizClient";
import QuizJsonLd from "@/components/quiz/QuizJsonLd";
import { TrackingPixels } from "@/components/tracking/TrackingPixels";
import { resolveEffectivePixels } from "@/lib/effectivePixels";
import { stripHtml } from "@/lib/richText";
import { toShareLine } from "@/lib/quiz/shareText";
import { interpolateText } from "@/lib/quizPersonalization";
import { buildCanonicalUrl, fetchOwnerBranding } from "@/lib/publicUrl";
import { echapperMotifLike } from "@/lib/db/motifLike";
import { chargerQuizPublic, quizLivreAuViewer } from "@/lib/quiz/chargerQuizPublic";
import type { PublicQuizData } from "@/components/quiz/PublicQuizClient";
import type { QuizBranding } from "@/lib/quizBranding";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ compact?: string; rp?: string; embed?: string }>;
};

// "J'ai obtenu : <profil>" dans la langue du quiz, pour l'og:title des
// URL de partage de resultat (?rp=<resultId>). La formule marche au
// tutoiement comme au vouvoiement (c'est le partageur qui parle).
const OG_GOT: Record<string, (t: string) => string> = {
  fr: (t) => `J'ai obtenu : ${t}`,
  en: (t) => `I got: ${t}`,
  es: (t) => `He obtenido: ${t}`,
  de: (t) => `Mein Ergebnis: ${t}`,
  pt: (t) => `Meu resultado: ${t}`,
  it: (t) => `Ho ottenuto: ${t}`,
  ar: (t) => `حصلت على: ${t}`,
};

// App Facebook de Bene (facultatif) : quand FACEBOOK_APP_ID est pose,
// on emet fb:app_id et le debogueur FB n'affiche plus d'avertissement.
const FB_APP_ID = (process.env.FACEBOOK_APP_ID ?? "").trim();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Header set by middleware when the request arrived through a creator
// custom domain. When present, the resolved quiz MUST belong to that
// domain's owner — without this check, anyone who connects their own
// domain could serve someone else's quizzes through it (e.g. phishing).
const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

/**
 * Le proprietaire du domaine perso par lequel la requete est arrivee.
 *
 * TROIS ETATS, ET ILS NE SE CONFONDENT PAS (9 septembre 2026). Avant,
 * la fonction rendait `null` aussi bien pour "on n'est pas sur un
 * domaine perso" que pour "la requete a echoue" : dans le second cas le
 * controle de locataire etait donc SAUTE, et le domaine d'une creatrice
 * pouvait servir le quiz de quelqu'un d'autre. C'est exactement ce que
 * le commentaire de `CUSTOM_HOST_HEADER` interdit, et l'erreur n'etait
 * meme pas lue. "Je n'ai pas pu regarder" et "il n'y a rien" sont deux
 * reponses differentes (regle du 23 aout).
 */
type LocataireDuDomaine =
  /** Pas de domaine perso : la page se sert normalement. */
  | { surUnDomainePerso: false }
  /** Domaine perso, proprietaire connu (ou aucune ligne verifiee). */
  | { surUnDomainePerso: true; lisible: true; proprietaire: string | null }
  /** Domaine perso, registre illisible : on ne sert RIEN. */
  | { surUnDomainePerso: true; lisible: false };

const resolveCustomDomainOwner = cache(async function resolveCustomDomainOwner(): Promise<LocataireDuDomaine> {
  const h = await headers();
  const host = h.get(CUSTOM_HOST_HEADER);
  if (!host) return { surUnDomainePerso: false };
  const { data, error } = await supabaseAdmin
    .from("custom_domains")
    .select("user_id")
    .ilike("hostname", echapperMotifLike(host))
    .eq("status", "verified")
    .maybeSingle();
  if (error) {
    // Le sens du repli est ASYMETRIQUE : un 404 de trop sur un domaine
    // perso pendant une panne de base coute une page ; servir sans
    // verifier coute le quiz d'une creatrice affiche chez une autre.
    console.error("[q/page] registre des domaines perso illisible :", error.message);
    return { surUnDomainePerso: true, lisible: false };
  }
  return {
    surUnDomainePerso: true,
    lisible: true,
    proprietaire: (data?.user_id as string | undefined) ?? null,
  };
});

// Champs sélectionnés sur quizzes — étendre ici si on ajoute des
// colonnes (ex : pixel ids) dont on a besoin server-side.
// `created_at` et `updated_at` sont ICI depuis le 9 septembre 2026, et
// pas dans une requete a part : cette page les redemandait a `quizzes`
// alors qu'elle venait de lire la meme ligne, donc un aller-retour de
// plus a chaque chargement d'un quiz public. Les deux colonnes sont
// aussi vieilles que la table : elles ne peuvent pas manquer, donc
// elles ne risquent pas de faire refuser le select entier (le drame
// `survey_thanks_*` du 2 juin).
const QUIZ_META_FIELDS = "id, user_id, slug, title, introduction, og_image_url, og_description, share_message, locale, seo_noindex, meta_pixel_id, ga4_measurement_id, google_ads_conversion_id, created_at, updated_at";

// MEMOISE PAR REQUETE. `generateMetadata` et le composant de page
// tournent tous les deux sur la MEME requete et appelaient chacun cette
// fonction : deux allers-retours Supabase pour la meme ligne, a chaque
// chargement d'un quiz public. Next ne deduplique que `fetch`, jamais un
// client Supabase, donc c'est `cache()` de React qui le fait ici.
// Meme raison pour `resolveCustomDomainOwner`, appelee deux fois aussi.
const fetchQuizMeta = cache(async function fetchQuizMeta(slugOrId: string) {
  if (UUID_RE.test(slugOrId)) {
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .select(QUIZ_META_FIELDS)
      .eq("id", slugOrId)
      .eq("status", "active")
      .maybeSingle();
    // ON LIT L'ERREUR, ET ON CRIE. Depuis le 9 septembre cette seule
    // requete porte le titre, l'image de partage, les dates du JSON-LD
    // ET la decision d'injecter la charge dans le HTML : un select
    // refuse (une colonne ajoutee sans sa migration) ferait donc
    // disparaitre tout ca d'un coup, et `maybeSingle` rend `null` sans
    // un mot. C'est exactement ce qui a vide le JSON-LD en silence
    // pendant des mois (mesure du 7 septembre).
    if (error) console.error("[q/page] meta du quiz illisible :", error.message);
    if (data) return data;
  }
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select(QUIZ_META_FIELDS)
    .ilike("slug", echapperMotifLike(slugOrId))
    .eq("status", "active")
    .maybeSingle();
  if (error) console.error("[q/page] meta du quiz illisible (slug) :", error.message);
  return data;
});

// Note : la résolution du custom domain + share_site_name de l'owner
// vit dans `fetchOwnerBranding` (lib/publicUrl.ts) — partagé entre les
// 3 routes publiques pour rester cohérent.

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { quizId } = await params;
  const sp = await searchParams;
  const rp = typeof sp?.rp === "string" && UUID_RE.test(sp.rp) ? sp.rp : null;
  try {
    const data = await fetchQuizMeta(quizId);
    if (!data) return { title: "Quiz" };

    // Custom-domain ownership: when serving through a creator's branded
    // hostname, the loaded quiz must belong to them. Mismatch = 404 so
    // we never serve another creator's quiz through someone else's
    // domain (phishing / impersonation protection).
    const locataire = await resolveCustomDomainOwner();
    if (locataire.surUnDomainePerso) {
      if (!locataire.lisible || data.user_id !== locataire.proprietaire) {
        return { title: "Quiz" };
      }
    }

    // Description OG : le titre ET l'introduction sont éditables en
    // rich-text → on strip avant de truncate (sinon les 160 premiers
    // chars de l'intro peuvent être bourrés de balises HTML brutes ou
    // d'entités `&nbsp;` qui apparaissent en clair dans l'aperçu de
    // partage iMessage / WhatsApp). Cf. rapport Adeline (16 mai 2026).
    const ogDescRaw = stripHtml(data.og_description);
    // Facebook et LinkedIn ne preremplissent JAMAIS le texte d'un partage
    // (limitation de leurs sharers) : la seule chose visible est l'apercu
    // du lien. Pour que "la phrase definie par le createur" apparaisse
    // quand meme (retour Jocelyne 28 juillet 2026), le message de partage
    // sert de description d'apercu par defaut ; une description OG
    // explicite garde la priorite.
    const shareMsgPlain = toShareLine((data as { share_message?: string | null }).share_message);
    const introPlain = stripHtml(data.introduction);
    const rawDesc = ogDescRaw || shareMsgPlain || introPlain.slice(0, 160);
    const description = rawDesc.trim() || undefined;
    const plainTitle = stripHtml(data.title);

    // Partage du PROFIL obtenu (?rp=<resultId>) : l'og:title devient
    // "J'ai obtenu : <profil>" et l'og:image le visuel du profil (image
    // du createur, sinon carte generee /result-og). Retour Jocelyne
    // 28 juillet 2026 : le partage FB ne montrait jamais le profil.
    let resultShare: { ogTitle: string; imageUrl: string } | null = null;
    if (rp) {
      const { data: rrow } = await supabaseAdmin
        .from("quiz_results")
        .select("quiz_id, title, image_url")
        .eq("id", rp)
        .maybeSingle();
      if (rrow && rrow.quiz_id === data.id) {
        const cleanTitle = stripHtml(interpolateText(rrow.title as string, { name: "", gender: "x" }))
          .replace(/\s+/g, " ")
          .replace(/^[\s,;:.!?-]+/, "")
          .trim();
        if (cleanTitle) {
          const loc = String((data as { locale?: string | null }).locale ?? "fr").split("-")[0];
          const got = (OG_GOT[loc] ?? OG_GOT.fr)(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
          const generated =
            (await buildCanonicalUrl(`/api/quiz/${data.id}/result-og?rp=${rp}`)) ??
            `https://quiz.tipote.com/api/quiz/${data.id}/result-og?rp=${rp}`;
          const resultImage = String((rrow as { image_url?: string | null }).image_url ?? "").trim();
          resultShare = { ogTitle: got, imageUrl: resultImage || generated };
        }
      }
    }

    // Branding owner : custom domain vérifié + share_site_name (optionnel).
    // Permet de virer toute trace de "Tiquiz" des meta sociales quand
    // l'user a payé pour un domain brandé.
    const customHost = (await headers()).get(CUSTOM_HOST_HEADER);
    const branding = data.user_id
      ? await fetchOwnerBranding(String(data.user_id), customHost)
      : null;
    const ownerSlug = (data as { slug?: string | null }).slug?.trim() ?? "";

    // Canonical = brand URL si custom domain ; sinon URL réelle de la requête.
    const canonical = branding && ownerSlug
      ? `https://${branding.customHost}/${ownerSlug}`
      : await buildCanonicalUrl(`/q/${quizId}`);

    // site_name affiché par iMessage / WhatsApp / FB sous l'aperçu.
    // Sur main host : "Tiquiz" (via le template layout, comportement
    // historique). Sur custom domain : share_site_name si rempli sinon
    // le hostname brandé. Plus aucun "Tiquiz" qui leak.
    const siteName = branding ? (branding.siteName || branding.customHost) : null;

    // Title : sur custom domain on construit un `absolute` qui shunte
    // le template global `%s · Tiquiz` de app/layout.tsx. Sur main host
    // on retourne juste plainTitle et le template ajoute "· Tiquiz".
    const titleOverride = siteName
      ? { absolute: `${plainTitle} · ${siteName}` }
      : plainTitle;

    // Respecte le toggle "masquer aux moteurs de recherche" côté éditeur.
    // Quand activé, on émet `<meta name="robots" content="noindex,nofollow">`
    // et la row est exclue du sitemap.xml + llms.txt.
    // Les variantes ?rp= (partage de profil) sont TOUJOURS noindex : ce
    // sont des doublons de la page quiz, seul l'aperçu social change.
    const robotsMeta = (data as { seo_noindex?: boolean }).seo_noindex || resultShare
      ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }
      : {};

    // og:url : Facebook re-scrape l'URL déclarée ici et l'utilise comme
    // identité du partage. Pour une variante ?rp=, elle DOIT garder le
    // ?rp= (sinon FB retombe sur l'aperçu générique du quiz). Le
    // canonical SEO, lui, reste la page quiz nue.
    const ogUrl = canonical ? (resultShare && rp ? `${canonical}?rp=${rp}` : canonical) : null;
    const ogTitle = resultShare?.ogTitle ?? plainTitle;
    // og:image TOUJOURS explicite : vignette du createur, sinon carte
    // generee aux couleurs du quiz (sans balise, le debogueur FB alerte
    // "propriete deduite", retour Bene 28 juillet 2026).
    const defaultOgImage =
      (await buildCanonicalUrl(`/api/quiz/${data.id}/result-og`)) ??
      `https://quiz.tipote.com/api/quiz/${data.id}/result-og`;
    const ogImage = resultShare?.imageUrl ?? (String(data.og_image_url ?? "").trim() || defaultOgImage);

    return {
      title: titleOverride,
      description,
      ...(FB_APP_ID ? { facebook: { appId: FB_APP_ID } } : {}),
      ...robotsMeta,
      ...(siteName ? { applicationName: siteName } : {}),
      ...(canonical ? { alternates: { canonical } } : {}),
      ...(branding?.faviconUrl
        ? {
            icons: {
              // sizes="any" pour battre le <link sizes="any"> auto-injecté
              // par Next.js depuis app/favicon.ico. Sans cet attribut explicite,
              // Firefox préfère le link avec sizes (= favicon Tiquiz) au nôtre.
              // Cf. CLAUDE_PITFALLS.md section O.
              icon: [{ url: branding.faviconUrl, sizes: "any" }],
              shortcut: branding.faviconUrl,
              apple: branding.faviconUrl,
            },
          }
        : {}),
      openGraph: {
        title: ogTitle,
        description,
        type: "website",
        ...(siteName ? { siteName } : {}),
        ...(ogUrl ? { url: ogUrl } : {}),
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
      // Override des twitter:* aussi sinon le layout global laisse
      // « Tiquiz » dans twitter:title et la description marketing dans
      // twitter:description (Telegram, Slack, Discord lisent souvent
      // twitter:* en priorité).
      twitter: {
        card: "summary_large_image",
        title: ogTitle,
        ...(description ? { description } : {}),
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  } catch {
    return { title: "Quiz" };
  }
}

export default async function PublicQuizPage({ params, searchParams }: Props) {
  const { quizId } = await params;
  const { compact, embed } = await searchParams;
  const isCompact = compact === "1";

  // Same ownership check as in generateMetadata: a custom domain may
  // only render quizzes belonging to its owner. We do it server-side
  // here so a wrong-tenant request short-circuits before the client
  // bundle even loads.
  const locataire = await resolveCustomDomainOwner();
  const meta = await fetchQuizMeta(quizId);
  if (locataire.surUnDomainePerso) {
    if (!locataire.lisible) notFound();
    if (!meta || meta.user_id !== locataire.proprietaire) notFound();
  }

  // ─── JSON-LD pour SEO + indexation IA ─────────────────────────────
  // On lookup le nom de l'auteur côté `profiles` + compte les questions
  // pour enrichir les données structurées. Best-effort : si une query
  // échoue, on render quand même la page (le JSON-LD reste sans ces
  // champs optionnels).
  let authorName: string | null = null;
  let authorUrl: string | null = null;
  let questionCount: number | null = null;
  let createdAt: string | null = null;
  let updatedAt: string | null = null;
  let language: string | null = null;
  if (meta?.user_id) {
    // CES TROIS CHAMPS ETAIENT VIDES EN PRODUCTION, EN SILENCE.
    //
    // Mesure du 7 septembre 2026 sur `quiz.tipote.com/q/rps` : le
    // JSON-LD servi ne portait ni `numberOfQuestions`, ni `dateCreated`,
    // ni `dateModified`, ni `inLanguage`. La requete demandait
    // `questions` et `content_locale` sur la table `quizzes`, et AUCUNE
    // des deux colonnes n'y existe : les questions vivent dans
    // `quiz_questions`, `content_locale` vit sur `profiles`. PostgREST
    // rejette alors le select ENTIER, donc `created_at` et `updated_at`,
    // qui eux existent, tombaient avec.
    //
    // Personne ne l'a vu parce que l'erreur n'etait jamais lue : la ligne
    // faisait `fullQuizRes.data as ... | null` et se contentait du null.
    // On la lit maintenant, et on CRIE : un JSON-LD amputa ne casse aucun
    // ecran, il ne coute que le referencement et la lecture par les IA.
    const quizRowId = (meta as { id?: string }).id ?? quizId;
    const [profileRes, countRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("brand_website_url, full_name")
        .eq("user_id", meta.user_id)
        .maybeSingle(),
      // `head: true` : on veut le NOMBRE, pas les questions. Les tirer
      // pour les compter ramenerait tout l'enonce de chaque question sur
      // une page qui n'en affiche aucune.
      supabaseAdmin
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("quiz_id", quizRowId),
    ]);
    if (countRes.error) console.error("[q/page] nombre de questions illisible :", countRes.error.message);
    const profile = profileRes.data as
      | { brand_website_url?: string | null; full_name?: string | null }
      | null;
    authorName = profile?.full_name ?? null;
    authorUrl = profile?.brand_website_url ?? null;
    const dates = meta as { created_at?: string | null; updated_at?: string | null };
    createdAt = dates.created_at ?? null;
    updatedAt = dates.updated_at ?? null;
    questionCount = typeof countRes.count === "number" ? countRes.count : null;
    // La langue DECLAREE d'une page de quiz est celle que son visiteur
    // lit, c'est a dire `quizzes.locale`. `profiles.content_locale` est
    // la langue par defaut des contenus de la creatrice : ce n'est pas
    // la meme question, et ce n'est pas sur cette table.
    language = (meta as { locale?: string | null }).locale ?? null;
  }

  const canonical = (await buildCanonicalUrl(`/q/${quizId}`)) ?? "";

  // Config pixel effective : valeur par quiz, sinon fallback sur le
  // défaut du profil (sinon poser le pixel dans /settings n'a aucun
  // effet sur les quiz existants — bug Gwenn).
  const pixels = meta
    ? await resolveEffectivePixels(meta, (meta as { user_id?: string }).user_id)
    : null;

  // ─── LA CHARGE DU QUIZ PART AVEC LE HTML ──────────────────────────
  //
  // Avant le 9 septembre 2026, cette page ne rendait AUCUN contenu de
  // quiz : le visiteur attendait le HTML, puis 1146 Ko de JavaScript,
  // puis un appel a `/api/quiz/<id>/public`, et seulement la voyait sa
  // premiere question. Trois vagues reseau l'une apres l'autre, et la
  // troisieme ne pourra JAMAIS etre servie par un cache au bord (sa
  // reponse porte un `set-cookie`, voir `chargerQuizPublic`).
  //
  // On appelle donc LA MEME fonction que la route, et on passe le
  // resultat au viewer. La route reste en place et sert toujours : les
  // aperçus, l'embed, et le repli quand cette injection ne s'applique
  // pas.
  //
  // ON N'INJECTE QUE LE CHEMIN PUBLIC STRICT, et les deux gardes
  // comptent :
  //   - `meta` n'existe que pour un quiz ACTIF dont le locataire est le
  //     bon (le filtre `status = active` de `fetchQuizMeta` plus le
  //     controle de domaine perso juste au dessus) ;
  //   - un `?embed=` dans l'URL veut dire "montre-moi mon brouillon" :
  //     ce chemin a besoin du jeton ET des cookies, donc il reste au
  //     client.
  // Un brouillon montre a son auteur passe lui aussi par le client, qui
  // envoie sa session. Cette page n'en sert jamais un a un inconnu.
  let donneesServeur: { quiz: PublicQuizData; branding: QuizBranding | null } | null = null;
  if (meta && !embed) {
    const charge = await chargerQuizPublic({
      slugOrId: quizId,
      jetonEmbed: null,
      utilisateurConnecte: null,
    });
    if (charge.ok) {
      // UNE seule assertion, et elle dit ce qu'elle ne prouve pas : les
      // colonnes viennent de la base, donc leur forme n'est verifiee ni
      // ici ni sur le chemin de l'API (ou `res.json()` rend `any`). Ce
      // n'est PAS un `as unknown as` entre deux formes differentes : les
      // deux cotes decrivent la meme ligne de `quizzes`, et c'est la
      // MEME fonction qui la construit pour les deux portes.
      donneesServeur = {
        quiz: quizLivreAuViewer(charge) as PublicQuizData,
        branding: (charge.branding as QuizBranding | null) ?? null,
      };
    }
  }

  return (
    <>
      {meta && canonical && (
        <QuizJsonLd
          canonicalUrl={canonical}
          title={meta.title}
          description={meta.og_description || meta.introduction || null}
          imageUrl={meta.og_image_url || null}
          createdAt={createdAt}
          updatedAt={updatedAt}
          authorName={authorName}
          authorUrl={authorUrl}
          numberOfQuestions={questionCount}
          inLanguage={language}
        />
      )}
      {/* Pixel Meta + GA + Google Ads server-rendered. Visible
          immédiatement par les extensions de détection (Pixel Helper,
          Tag Assistant) sans attendre le mount React. */}
      {pixels && (
        <TrackingPixels
          metaPixelId={pixels.metaPixelId}
          ga4MeasurementId={pixels.ga4MeasurementId}
          googleAdsConversionId={pixels.googleAdsConversionId}
        />
      )}
      <PublicQuizClient quizId={quizId} compact={isCompact} donneesServeur={donneesServeur} />
    </>
  );
}
