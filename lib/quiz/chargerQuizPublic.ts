// lib/quiz/chargerQuizPublic.ts
//
// CE QU'UN VISITEUR RECOIT QUAND IL OUVRE UN QUIZ, calcule UNE fois.
//
// Le 9 septembre 2026, le meme quiz etait charge par DEUX chemins qui ne
// se parlaient pas : `GET /api/quiz/<id>/public` (appele par le
// navigateur apres l'hydratation) et rien du tout cote serveur. La page
// publique ne rendait AUCUN contenu de quiz : le visiteur attendait le
// HTML, puis 1146 Ko de JavaScript, puis un appel d'API, avant de voir
// sa premiere question. Trois vagues, l'une apres l'autre.
//
// MESURE DU 9 SEPTEMBRE, en production sur `quiz.tipote.com/q/rps` :
//
//   l'API du quiz     588 a 1150 ms, `cf-cache-status: DYNAMIC` 3 fois
//   sa reponse porte  `s-maxage=60, stale-while-revalidate=60`
//   et AUSSI          `set-cookie: ui_locale=...` (+ `tq_ref` sur un lien
//                     affilie)
//
// **Cette reponse ne pourra JAMAIS etre mise en cache au bord**, et il ne
// faut surtout pas essayer : un cache partage servirait le `tq_ref` d'UNE
// affiliee, et la langue d'UN visiteur, a tous les suivants. C'est
// exactement la regle `pages` que Bene a supprimee le 7 septembre. Ses
// en-tetes `s-maxage` sont donc une promesse que rien ne peut tenir, et
// une invitation pour le prochain qui posera une Cache Rule.
//
// Consequence : cet aller-retour coute une visite complete a l'origine, a
// CHAQUE visiteur, pour toujours. La seule facon de le retirer du chemin
// critique est de livrer la reponse AVEC le HTML.
//
// D'OU CE MODULE, ET LA REGLE QUI LE GOUVERNE : la page publique et la
// route d'API appellent la MEME fonction. Recalculer la charge cote page
// donnerait deux reponses pour le meme quiz, et c'est le defaut sorti six
// fois dans ce depot (les reseaux de partage, le score, l'alignement du
// sous-titre, la disposition des reponses...). Ici la divergence
// couterait le branding, le footer, les pixels ou la typographie d'une
// creatrice, selon la porte par laquelle son quiz a ete charge.
//
// CE QUI N'EST PAS ICI, ET C'EST VOULU : les en-tetes HTTP. La fonction
// rend `prive` (un jeton d'embed ou un brouillon montre a son auteur) ;
// c'est la ROUTE qui en tire ses en-tetes de cache, parce qu'elle seule
// repond en HTTP.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assetProxyEnabled, proxyAssetsDeep } from "@/lib/assetProxy";
import { resolveQuizBranding } from "@/lib/quizBranding";
import { isPaidPlan } from "@/lib/planLimits";
import { applyFrenchTypography, isFrenchLocale } from "@/lib/frenchTypography";
import { mergeOwnerBranding } from "@/lib/projects/businessProfile";
import { echapperMotifLike } from "@/lib/db/motifLike";
import { chargeDuViewer } from "@/lib/quiz/chargeViewer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { UUID_RE };

async function resolveQuizId(
  admin: typeof supabaseAdmin,
  slugOrId: string,
  opts: { requireActive?: boolean } = {},
): Promise<string | null> {
  const needle = slugOrId.trim();
  if (!needle) return null;

  if (UUID_RE.test(needle)) {
    const q = admin.from("quizzes").select("id").eq("id", needle);
    const { data } = opts.requireActive ? await q.eq("status", "active").maybeSingle() : await q.maybeSingle();
    if (data?.id) return data.id as string;
  }

  const q = admin.from("quizzes").select("id").ilike("slug", echapperMotifLike(needle));
  const { data } = opts.requireActive ? await q.eq("status", "active").maybeSingle() : await q.maybeSingle();
  return (data?.id as string) ?? null;
}

export { resolveQuizId };

function hostnameLabel(url: string): string {
  const raw = url.trim();
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./i, "");
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  }
}

export { hostnameLabel };

/** Ce que la fonction rend : la charge, ou un refus qui porte son code. */
export type ChargeQuizPublic =
  | {
      ok: true;
      /** Un jeton d'embed, ou un brouillon montre a son auteur : la
       *  reponse ne se met en cache nulle part, meme privee. */
      prive: boolean;
      isDraftPreview: boolean;
      quiz: Record<string, unknown>;
      questions: Record<string, unknown>[];
      results: Record<string, unknown>[];
      branding: unknown;
    }
  | { ok: false; statut: 404; erreur: string };

/**
 * Charge tout ce qu'un visiteur voit d'un quiz.
 *
 * `jetonEmbed` et `utilisateurConnecte` sont des PARAMETRES OBLIGATOIRES,
 * jamais devines : ils decident si un BROUILLON est servi. Les deduire de
 * l'environnement marcherait dans la route (qui a la requete sous la
 * main) et mentirait sur la page (qui ne veut jamais servir un brouillon
 * a un inconnu). C'est la regle du 1er aout : quand un cas a deux
 * mecaniques, la mecanique est un parametre.
 */
/**
 * Le quiz tel que le viewer l'attend.
 *
 * La recomposition elle meme vit dans `lib/quiz/chargeViewer.ts`, le
 * module PUR : le client en a besoin aussi (sur la reponse de l'API) et
 * il ne peut pas importer ce fichier ci, qui tire `supabaseAdmin`.
 */
export function quizLivreAuViewer(
  charge: Extract<ChargeQuizPublic, { ok: true }>,
): Record<string, unknown> {
  return chargeDuViewer({
    quiz: charge.quiz,
    questions: charge.questions,
    results: charge.results,
  });
}

export async function chargerQuizPublic({
  slugOrId,
  jetonEmbed,
  utilisateurConnecte,
}: {
  slugOrId: string;
  jetonEmbed: string | null;
  utilisateurConnecte: string | null;
}): Promise<ChargeQuizPublic> {
  const admin = supabaseAdmin;

  // Embed preview path: an anonymous embed visitor wants to see
  // their (still-draft, still-anonymous) quiz play live before
  // checkout. We skip the active-status filter when the URL carries
  // ?embed=<UUID> AND the resolved row's embed_session_id matches.
  // This never exposes another user's draft because:
  //   1) the token is a unique UUID stored in localStorage / URL
  //   2) we re-check the embed_session_id on the row itself below
  const embedToken = jetonEmbed && UUID_RE.test(jetonEmbed) ? jetonEmbed : null;

  // Owner preview path : si l'user est authentifié et propriétaire
  // du quiz, on l'autorise à voir ses brouillons via l'URL publique
  // (clic "Aperçu" depuis l'éditeur). Avant ce fix le filtre
  // status='active' renvoyait 404 même au créateur, donc il voyait
  // un état vide et croyait qu'il n'y avait pas d'aperçu (bug
  // Fabienne 2026-05-09 sur Tipote, port ici).
  const authUserId = utilisateurConnecte;

  // Si l'user est connecté on relâche le filtre `requireActive`
  // — la vérification d'ownership se fait juste après.
  const quizId = await resolveQuizId(admin, slugOrId, {
    requireActive: !embedToken && !authUserId,
  });
  if (!quizId) {
    return { ok: false, statut: 404, erreur: "Quiz not found or inactive" };
  }

  if (embedToken) {
    const { data: gate } = await admin
      .from("quizzes")
      .select("embed_session_id, user_id")
      .eq("id", quizId)
      .maybeSingle();
    if (!gate || gate.user_id !== null || gate.embed_session_id !== embedToken) {
      return { ok: false, statut: 404, erreur: "Preview token mismatch" };
    }
  }

  // LA COLONNE NEUVE NE PEUT PAS METTRE LES QUIZ HORS LIGNE.
  //
  // PostgREST refuse TOUTE la requete quand une colonne du `select`
  // n'existe pas encore : le 2 juin 2026, `survey_thanks_*` deployee
  // avant sa migration a rendu 404 sur TOUS les quiz publics pendant
  // deux heures. On liste donc la colonne du jour a part, et on
  // rejoue la requete sans elle si elle manque. Le quiz s'affiche,
  // avec le comportement d'avant, au lieu de disparaitre.
  const QUIZ_COLS = "id,user_id,project_id,status,title,introduction,cta_text,cta_url,start_button_text,privacy_url,consent_text,virality_enabled,bonus_description,bonus_heading,bonus_intro_text,bonus_image_url,bonus_image_position,bonus_image_width,bonus_unlocked_message,share_message,locale,address_form,views_count,capture_heading,capture_subtitle,capture_submit_text,survey_thanks_heading,survey_thanks_body,capture_first_name,capture_last_name,capture_phone,capture_country,phone_required,first_name_required,last_name_required,country_required,ask_first_name,ask_gender,slug,brand_font,brand_color_primary,brand_color_background,brand_color_text,brand_logo_url,hide_brand_logo,brand_logo_align,brand_logo_width,intro_text_width,capture_enabled,capture_before_questions,show_aggregate_responses,custom_footer_text,custom_footer_url,hide_branding,share_networks,og_description,og_image_url,result_insight_heading,result_projection_heading,result_bridge_heading,show_result_bridge,result_layout,mode,show_consent_checkbox,show_results_breakdown,show_other_results,meta_pixel_id,ga4_measurement_id,google_ads_conversion_id,google_ads_conversion_label,intro_image_url,intro_image_position,intro_image_width,background_style,background_gradient,background_image_url,intro_layout,button_shape,question_layout,split_image_url,split_side,panel_media,answer_layout,show_result_insight,show_result_projection,show_result_share,share_result_page,close_enabled,close_action,close_redirect_url,close_message,close_cta_text,close_cta_url,scoring_axes,show_score_gauge,score_display_mode,score_labels";
  // Les colonnes RECENTES vivent ici et pas dans QUIZ_COLS : la route les
  // tente d'abord, et ABANDONNE la liste entiere si PostgREST en refuse
  // une. Sans ce repli, un deploiement en avance sur la migration ferait
  // repondre 404 a TOUS les quiz publics (drame survey_thanks_*, 2 juin).
  const QUIZ_COLS_NEW = "tie_break,other_results_position,intro_start_mode";

  let quizRes = await admin
    .from("quizzes")
    .select(`${QUIZ_COLS},${QUIZ_COLS_NEW}`)
    .eq("id", quizId)
    .maybeSingle();
  if (quizRes.error) {
    console.error("[quiz/public] select complet refuse, repli :", quizRes.error.message);
    quizRes = await admin.from("quizzes").select(QUIZ_COLS).eq("id", quizId).maybeSingle();
  }

  const [questionsRes, resultsRes] = await Promise.all([
    admin.from("quiz_questions").select("id,question_text,options,sort_order,question_type,config").eq("quiz_id", quizId).order("sort_order"),
    admin.from("quiz_results").select("id,title,description,insight,projection,insight_heading,projection_heading,bridge,bridge_heading,beat_media,cta_text,cta_url,sort_order,image_url,image_position,image_width,min_score,max_score").eq("quiz_id", quizId).order("sort_order"),
  ]);

  if (!quizRes.data) {
    return { ok: false, statut: 404, erreur: "Quiz not found or inactive" };
  }

  const quizRow = quizRes.data as Record<string, unknown>;
  const quizUserId = quizRow.user_id as string | undefined;
  const quizStatus = String(quizRow.status ?? "");

  // Validate status for non-embed paths : actif = public, draft =
  // owner-preview only (l'embedToken a déjà été validé plus haut).
  const isActive = quizStatus === "active";
  let isOwnerPreview = false;
  if (!isActive && !embedToken) {
    if (authUserId && quizUserId && authUserId === quizUserId) {
      isOwnerPreview = true;
    } else {
      return { ok: false, statut: 404, erreur: "Quiz not found or inactive" };
    }
  }

  const quizAddressForm = quizRow.address_form as string | null;
  let addressForm = quizAddressForm === "tu" || quizAddressForm === "vous" ? quizAddressForm : "tu";
  let fallbackPrivacyUrl = "";
  let profileRow: Record<string, unknown> | null = null;

  if (quizUserId) {
    const { data: bp, error: bpErr } = await admin
      .from("profiles")
      .select("address_form, privacy_url, brand_logo_url, brand_font, brand_color_primary, plan, reseller_id, tipote_affiliate_id, default_meta_pixel_id, default_ga4_measurement_id, default_google_ads_conversion_id, default_google_ads_conversion_label, ui_locale, default_content_locale")
      .eq("user_id", quizUserId)
      .maybeSingle();
    profileRow = (bp as Record<string, unknown>) ?? null;
    if (bpErr) {
      // Drame footer 27 juillet 2026 : une colonne referencee ici sans
      // migration appliquee (default_content_locale) faisait echouer TOUT
      // le select en silence -> profil null -> plan lu "free" pour tout le
      // monde -> footer perso / masquage / affilie / branding de repli /
      // pixels par defaut morts, meme pour les lifetime. On logge FORT et
      // on retente avec le socle de colonnes historiques pour que le plan
      // et le branding survivent a une colonne recente manquante.
      console.error("[quiz/public] profiles select failed (migration manquante ?):", bpErr.message);
      const { data: bpRetry } = await admin
        .from("profiles")
        .select("address_form, privacy_url, brand_logo_url, brand_font, brand_color_primary, plan, reseller_id, tipote_affiliate_id")
        .eq("user_id", quizUserId)
        .maybeSingle();
      profileRow = (bpRetry as Record<string, unknown>) ?? null;
    }

    // Multiprofils Tiquiz phase 5 : si le quiz est attaché à un
    // projet précis (quiz.project_id), on merge le business_profile
    // de ce projet PAR DESSUS le row profiles. Garantit "nouveau
    // projet = nouveau branding" sur le viewer public.
    //
    // SAFE POUR LES QUIZ EN LIGNE : si business_profile absent OU
    // project_id null OU table inexistante → on retombe sur profileRow
    // INCHANGÉ (= comportement actuel exact). JAMAIS de coupure.
    if (profileRow) {
      profileRow = await mergeOwnerBranding(
        profileRow,
        quizUserId,
        (quizRow.project_id as string | null) ?? null,
      );
    }

    if (!quizAddressForm) {
      addressForm = profileRow?.address_form === "vous" ? "vous" : "tu";
    }
    fallbackPrivacyUrl = String(profileRow?.privacy_url ?? "").trim();
  }

  const branding = resolveQuizBranding(
    {
      brand_font: quizRow.brand_font as string | null,
      brand_color_primary: quizRow.brand_color_primary as string | null,
      brand_color_background: quizRow.brand_color_background as string | null,
      brand_color_text: quizRow.brand_color_text as string | null,
      brand_logo_url: quizRow.brand_logo_url as string | null,
      hide_brand_logo: quizRow.hide_brand_logo as boolean | null,
      background_style: quizRow.background_style as string | null,
      background_gradient: quizRow.background_gradient as string | null,
      background_image_url: quizRow.background_image_url as string | null,
      intro_layout: quizRow.intro_layout as string | null,
      button_shape: quizRow.button_shape as string | null,
      question_layout: quizRow.question_layout as string | null,
      split_image_url: quizRow.split_image_url as string | null,
      split_side: quizRow.split_side as string | null,
      panel_media: quizRow.panel_media,
      answer_layout: quizRow.answer_layout as string | null,
    },
    {
      brand_font: profileRow?.brand_font as string | null,
      brand_color_primary: profileRow?.brand_color_primary as string | null,
      brand_logo_url: profileRow?.brand_logo_url as string | null,
    },
  );

  // Custom footer is a paid-plan feature: hide it for free creators
  // (and only for free — beta / lifetime / monthly / yearly all keep it).
  // Permissive check via isPaidPlan: anything that isn't `free` counts as
  // paid, so future plan slugs don't accidentally lose the custom footer
  // until this file is updated.
  //
  // WHITE-LABEL REVENDEURS (Béné 14 juillet 2026) : un sous-compte
  // revendeur (profiles.reseller_id non nul) voit SON footer même en
  // gratuit — le revendeur gère sa propre marque, pas de "offert par
  // Tiquiz" imposé à ses clients.
  const ownerPlan = String(profileRow?.plan ?? "free").trim();
  const isResellerSub = Boolean(profileRow?.reseller_id);
  const footerAllowed = isPaidPlan(ownerPlan) || isResellerSub;

  // Résolution du footer : priorité au champ PAR QUIZ (onglet Partager),
  // sinon fallback sur l'URL du Branding profil (brand_website_url) +
  // son nom de site (share_site_name). Gwenn 12 juillet 2026 : "j'ai mis
  // l'url du site dans le branding" -> elle s'attend à la voir dans le
  // footer sans repasser par le champ par-quiz.
  const perQuizFooterText = String(quizRow.custom_footer_text ?? "").trim();
  const perQuizFooterUrl = String(quizRow.custom_footer_url ?? "").trim();
  const brandSiteUrl = String(profileRow?.brand_website_url ?? "").trim();
  const brandSiteName = String(profileRow?.share_site_name ?? "").trim();
  const resolvedFooterUrl = perQuizFooterUrl || brandSiteUrl || "";
  let resolvedFooterText = perQuizFooterText;
  if (resolvedFooterUrl && !resolvedFooterText) {
    // Pas de texte fourni : on prend le nom du site du branding, sinon le
    // hostname de l'URL (lisible), pour que TiquizFooter (qui exige texte
    // ET url) affiche bien le footer perso.
    resolvedFooterText = brandSiteName || hostnameLabel(resolvedFooterUrl);
  }
  const customFooterText = footerAllowed && resolvedFooterText ? resolvedFooterText : null;
  const customFooterUrl = footerAllowed && resolvedFooterUrl ? resolvedFooterUrl : null;
  // Masquer completement le footer Tiquiz : reserve aux plans payants (meme
  // gate que le footer perso). Un free ne peut jamais retirer la mention.
  const hideBranding = footerAllowed && Boolean(quizRow.hide_branding);

  // Refonte tracking (Adeline, 19 mai 2026) : le view tracking
  // n'est PLUS fait ici (server-side, à chaque GET) parce que :
  //   - bots qui n'exécutent pas JS comptaient quand même
  //   - refreshes / preloads gonflaient les chiffres
  //   - le créateur qui partageait son lien le voyait compté
  // Le visiteur fire maintenant un event "view" via POST /track
  // depuis useEffect au mount → bot filtering + cookie dédup +
  // owner exclusion + insert via log_quiz_event RPC qui passe par
  // le trigger pour bumper le compteur. Source de vérité unique.

  // Strip user_id ET project_id : ce sont des infos internes
  // (multiprofils) qui n'ont rien à faire dans la réponse publique
  // servie aux visiteurs anonymes des quiz en ligne.
  const { user_id: _uid, project_id: _pid, ...quizPublic } = quizRow;
  void _uid;
  void _pid;

  // Pixel effectif : si le quiz n'a aucun ID, on fallback sur les
  // défauts du profil. Sinon poser le pixel dans /settings n'aurait
  // aucun effet sur les events conversion (Lead/share) côté client.
  // Le pixel server-rendered (PageView) applique la même logique.
  const quizHasPixel =
    String(quizPublic.meta_pixel_id ?? "").trim() ||
    String(quizPublic.ga4_measurement_id ?? "").trim() ||
    String(quizPublic.google_ads_conversion_id ?? "").trim();
  if (!quizHasPixel && profileRow) {
    quizPublic.meta_pixel_id = (String(profileRow.default_meta_pixel_id ?? "").trim() || null);
    quizPublic.ga4_measurement_id = (String(profileRow.default_ga4_measurement_id ?? "").trim() || null);
    quizPublic.google_ads_conversion_id = (String(profileRow.default_google_ads_conversion_id ?? "").trim() || null);
    quizPublic.google_ads_conversion_label = (String(profileRow.default_google_ads_conversion_label ?? "").trim() || null);
  }
  const effectivePrivacyUrl = String(quizPublic.privacy_url ?? "").trim() || fallbackPrivacyUrl;

  // Edge-SWR resilience pour les visiteurs : si l'origine est down
  // (deploy / crash / DB hiccup) on continue à servir la dernière
  // bonne réponse. On garde 60s de fresh + 60s de stale-while-
  // revalidate (au lieu de 86400/24h précédent) — sinon, quand le
  // créateur édite ses couleurs / titre, un visiteur ayant déjà
  // ouvert l'URL voyait l'ancienne version pendant 24h alors qu'un
  // hard refresh aurait suffi. Bug remonté par Adeline (16 mai 2026,
  // "sur mon tel la couleur du quiz n'est pas la bonne"). 60s SWR
  // garantit que la prochaine requête après ~2 min serve le contenu
  // à jour, le tout sans rajouter de charge significative sur
  // l'origine.
  const prive = Boolean(embedToken) || isOwnerPreview;

  // G1 — display-time French typography for legacy data. Apply NBSP rules
  // when the quiz locale is French so quizzes saved before the on-save
  // typography pass landed still render correctly without a re-save.
  // Locale effective du joueur. La langue explicite du quiz gagne ; sinon on
  // retombe sur la langue de CONTENU par défaut du créateur, puis sur la
  // langue de son INTERFACE (compte). Un créateur anglophone a donc un joueur
  // en anglais même s'il n'a jamais réglé la langue du quiz (retour
  // utilisatrice anglophone, 21 juil 2026 : "si mon interface est en anglais,
  // tout doit être en anglais"). On écrit la valeur résolue dans quizPublic
  // pour qu'elle traverse jusqu'au client (getT(quiz.locale)).
  const rawQuizLocale = String((quizPublic as Record<string, unknown>).locale ?? "").trim();
  const ownerContentLocale = String(profileRow?.default_content_locale ?? "").trim();
  const ownerUiLocale = String(profileRow?.ui_locale ?? "").trim();
  const quizLocale = rawQuizLocale || ownerContentLocale || ownerUiLocale || null;
  (quizPublic as Record<string, unknown>).locale = quizLocale;
  const fr = (s: unknown) => (typeof s === "string" ? applyFrenchTypography(s, quizLocale) : s);
  const isFr = isFrenchLocale(quizLocale);
  const renderedQuiz = isFr
    ? Object.fromEntries(
        Object.entries(quizPublic).map(([k, v]) => {
          const FR_KEYS = new Set([
            "title", "introduction", "cta_text", "consent_text",
            "bonus_description", "bonus_heading", "bonus_intro_text", "share_message",
            "start_button_text", "capture_heading", "capture_subtitle", "capture_submit_text",
            "survey_thanks_heading", "survey_thanks_body",
            "result_insight_heading", "result_projection_heading",
            "og_description",
          ]);
          return [k, FR_KEYS.has(k) ? fr(v) : v];
        }),
      ) as typeof quizPublic
    : quizPublic;
  const renderedQuestions = (questionsRes.data ?? []).map((q: Record<string, unknown>) => {
    const opts = q.options as { text: string; result_index: number }[] | null | undefined;
    return {
      ...q,
      question_text: isFr ? fr(q.question_text) : q.question_text,
      options: opts ? opts.map((o) => ({ ...o, text: isFr ? (fr(o.text) as string) : o.text })) : opts,
      question_type: (q.question_type as string) ?? "multiple_choice",
      config: (q.config as Record<string, unknown>) ?? {},
    };
  });
  const renderedResults = (resultsRes.data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    title: isFr ? fr(r.title) : r.title,
    description: isFr ? fr(r.description) : r.description,
    insight: isFr ? fr(r.insight) : r.insight,
    projection: isFr ? fr(r.projection) : r.projection,
    insight_heading: isFr ? fr(r.insight_heading) : r.insight_heading,
    projection_heading: isFr ? fr(r.projection_heading) : r.projection_heading,
    cta_text: isFr ? fr(r.cta_text) : r.cta_text,
  }));

  // LES IMAGES PASSENT PAR NOTRE DOMAINE (alerte Supabase du 6 aout
  // 2026 : 6,68 Go de sortie sur les 5 Go inclus). Chaque visiteur les
  // telechargeait directement chez Supabase ; elles sont maintenant
  // servies par `/img/<chemin>`, donc mises en cache par Cloudflare et
  // par notre serveur. UNE seule passe sur TOUTE la reponse : une liste
  // blanche de champs oublierait la prochaine colonne d'image, et
  // l'oubli ne se verrait que sur la facture. Coupe-circuit :
  // `ASSET_PROXY=off`. Cf. lib/assetProxy.ts.
  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const proxied = assetProxyEnabled(process.env.ASSET_PROXY);
  const asset = <T,>(v: T): T => proxyAssetsDeep(v, supabaseBase, proxied);

  return {
    ok: true,
    prive,
    // Flag remonté quand le quiz est servi en mode aperçu (créateur
    // sur un quiz draft) — le client affiche un toast pour informer
    // qu'il faut publier pour partager. Bug Fabienne 2026-05-09.
    isDraftPreview: isOwnerPreview,
    quiz: {
      ...asset(renderedQuiz),
      address_form: addressForm,
      privacy_url: effectivePrivacyUrl || null,
      custom_footer_text: isFr && typeof customFooterText === "string" ? (fr(customFooterText) as string) : customFooterText,
      custom_footer_url: customFooterUrl,
      hide_branding: hideBranding,
      // Surfacé pour le footer "via Tiquiz" → tipote.fr/part-tiquiz?sa=<id>
      // (tracking commission affilié quand le créateur l'a posé en Settings).
      tipote_affiliate_id: (String(profileRow?.tipote_affiliate_id ?? "").trim() || null),
      // Fermeture du quiz (createur). Renvoye tel quel : le client
      // redirige ou affiche le message de fermeture.
      close_enabled: quizRow.close_enabled === true,
      close_action: (quizRow.close_action as string | null) ?? null,
      close_redirect_url: (quizRow.close_redirect_url as string | null) ?? null,
      close_message: (quizRow.close_message as string | null) ?? null,
      close_cta_text: (quizRow.close_cta_text as string | null) ?? null,
      close_cta_url: (quizRow.close_cta_url as string | null) ?? null,
    },
    questions: asset(renderedQuestions),
    results: asset(renderedResults),
    branding: asset(branding),
  };
}
