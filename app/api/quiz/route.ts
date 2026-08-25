// app/api/quiz/route.ts
// CRUD for quizzes (authenticated). GET list, POST create.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isPaidPlan, FREE_LIMITS } from "@/lib/planLimits";
import { applyFrenchTypographyDeep } from "@/lib/frenchTypography";
import {
  getActiveProjectScope,
  resolveProjectIdForInsert,
} from "@/lib/projects/scopeFilter";
import { normalizeScoringAxes } from "@/lib/quizScoring";
import { resolveBrandingForRequest } from "@/lib/projects/businessProfile";
import { designDefaultsToQuizColumns } from "@/lib/quizBranding";
import { startPendingAtelierTrial } from "@/lib/plusTrial/startPending";

export const dynamic = "force-dynamic";

// GET — list user's quizzes
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Phase 3b multiprofils : si l'user a multiprofils débloqué, on
    // filtre par project_id actif → "nouveau projet = stats à zéro".
    // Sinon (free / monthly / yearly) : scope=null, pas de filtre.
    const scope = await getActiveProjectScope(user.id, user.email ?? null);

    let query = supabase
      .from("quizzes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (scope) query = query.eq("project_id", scope);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // Récap leads (count + dernier lead) par quiz, agrégé en SQL en UN
    // appel — le dashboard n'a plus besoin de faire un fetch par quiz
    // (N+1) ni de compter des leads plafonnés à 1000.
    const quizzes = (data ?? []) as Array<Record<string, unknown>>;
    const ids = quizzes.map((q) => q.id as string);
    if (ids.length > 0) {
      const { data: summary } = await supabase.rpc("quiz_leads_summary", { p_quiz_ids: ids });
      const byQuiz = new Map<string, { n: number; last_at: string | null }>();
      for (const r of (summary ?? []) as { quiz_id: string; n: number; last_at: string | null }[]) {
        byQuiz.set(r.quiz_id, { n: Number(r.n) || 0, last_at: r.last_at });
      }
      for (const q of quizzes) {
        const s = byQuiz.get(q.id as string);
        q.leads_count = s?.n ?? 0;
        q.last_lead_at = s?.last_at ?? null;
      }
    }

    return NextResponse.json({ ok: true, quizzes });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}


// POST — create quiz with questions and results
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    // TYPOGRAPHIE FRANCAISE, AU SEUL POINT D'ENTREE (retour Bene, 3 aout
    // 2026 : "un probleme qu'on avait corrige et qui revient").
    //
    // La creation n'en appliquait AUCUNE : tout ce qui venait de la
    // generation IA ou d'un import arrivait sans l'espace insecable et le
    // restait, tant que la creatrice n'avait pas re-sauvegarde le champ a
    // la main.
    //
    // On traite le corps ENTIER, ici, une fois, AVANT toute lecture : le
    // titre et les enfants sont lus plus bas, donc transformer plus tard
    // laisserait passer tout ce qui a deja ete extrait. La lib travaille
    // en liste noire, donc une colonne ajoutee demain est couverte
    // d'office, sans que personne ait a y penser.
    body = applyFrenchTypographyDeep(body, body.locale as string | null | undefined);

    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    }

    // Surveys reuse the quizzes table (mode='survey'). The free-plan cap is
    // ONE PER MODE — i.e. a free creator can run 1 quiz and 1 sondage in
    // parallel (previously: 1 total, which forced an unwanted choice).
    const mode =
      body.mode === "survey" ? "survey" : body.mode === "scoring" ? "scoring" : "quiz";
    const isSurvey = mode === "survey";

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isPaidPlan((profile as { plan?: string | null } | null)?.plan)) {
      const { count } = await supabase
        .from("quizzes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("mode", mode);

      if ((count ?? 0) >= FREE_LIMITS.maxQuizzesPerMode) {
        const errorCode = isSurvey ? "FREE_PLAN_SURVEY_LIMIT" : "FREE_PLAN_QUIZ_LIMIT";
        const message = isSurvey
          ? "Le plan gratuit est limité à 1 sondage. Passe en plan payant pour en créer plus."
          : "Le plan gratuit est limité à 1 quiz. Passe en plan payant pour en créer plus.";
        return NextResponse.json(
          { ok: false, error: errorCode, message },
          { status: 403 },
        );
      }
    }

    // Insert quiz / survey row. Surveys force virality_enabled=false because
    // the visible UI flow doesn't have a bonus-on-share gate — the user
    // explicitly asked for "no viral but share at end".
    const projectId = await resolveProjectIdForInsert(user.id);

    // Modele de design du projet -> estampille sur ce nouveau quiz/sondage.
    // On respecte le meme gating que le branding : business_profiles (par
    // projet) pour les multiprofils, sinon fallback profiles (par user).
    // Vide si rien defini -> colonnes NULL = rendu historique inchange.
    const bpRow = await resolveBrandingForRequest(user.id, user.email ?? null);
    let designSource: Record<string, unknown> | null =
      bpRow as unknown as Record<string, unknown> | null;
    if (!designSource) {
      const { data: prof } = await supabase
        .from("profiles")
        .select(
          "default_question_layout, default_intro_layout, default_button_shape, default_answer_layout, default_background_style, default_background_gradient",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      designSource = (prof as Record<string, unknown> | null) ?? null;
    }
    const designCols = designDefaultsToQuizColumns(designSource);

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        user_id: user.id,
        project_id: projectId,
        ...designCols,
        mode,
        // Jauge du score : activée par défaut sur les NOUVEAUX quiz
        // scorés créés depuis les onglets "Quiz par niveau" / "Quiz
        // scoré" (rendu propre sans réglage). Les quiz existants ne
        // sont pas concernés (colonne default false).
        ...(mode === "scoring" && body.show_score_gauge === true ? { show_score_gauge: true } : {}),
        // Axes du quiz scoré généré par l'IA (normalisés : labels non
        // vides, 6 max, ids dédupliqués).
        ...(mode === "scoring" && Array.isArray(body.scoring_axes) && normalizeScoringAxes(body.scoring_axes).length > 0
          ? { scoring_axes: normalizeScoringAxes(body.scoring_axes) }
          : {}),
        // LES 4 TEMPS SONT LA NORME POUR UN QUIZ NEUF (Bene, 25 aout 2026).
        //
        // "Pourquoi mon resultat sur un nouveau quiz est arrive en prise
        // de conscience et si, au lieu du profil en 4 temps ?? On devait
        // l'appliquer par defaut, comme nouvelle norme."
        //
        // La condition d'avant (`hasBridgeContent`) existait pour ne pas
        // batir une mise en page sur un bloc absent. Cette prudence etait
        // inutile : `buildResultBeats()` SAUTE deja tout bloc vide
        // (`if (!bodyHasWords && !m) continue`). Un quiz sans pont rend
        // donc simplement les temps qu'il a, sans trou.
        //
        // Et elle etait surtout INATTEIGNABLE : `QuizFormClient` ne
        // transmettait pas `bridge`, donc elle repondait toujours non.
        // Aucun quiz cree par le formulaire n'a jamais pu naitre en 4
        // temps depuis le 3 aout.
        //
        // AUCUN QUIZ EXISTANT NE BOUGE : cette route ne CREE que des
        // nouveaux quiz, et la colonne garde son defaut 'classic' pour
        // tout le reste. Un quiz deja en ligne bascule quand sa creatrice
        // le decide, par le bandeau de l'editeur.
        ...(isSurvey ? {} : { result_layout: "beats" }),
        title,
        introduction: body.introduction ?? null,
        cta_text: body.cta_text ?? null,
        cta_url: body.cta_url ?? null,
        privacy_url: body.privacy_url ?? null,
        consent_text: body.consent_text ?? null,
        virality_enabled: isSurvey ? false : Boolean(body.virality_enabled),
        bonus_description: isSurvey ? null : (body.bonus_description ?? null),
        bonus_heading: isSurvey ? null : (body.bonus_heading ?? null),
        bonus_intro_text: isSurvey ? null : (body.bonus_intro_text ?? null),
        share_message: body.share_message ?? null,
        // Les quiz NES aujourd'hui departagent les egalites sur les
        // reponses du visiteur. Les anciens gardent 'first' (defaut de la
        // colonne) tant que leur creatrice ne bascule pas elle-meme.
        tie_break: "answers",
        locale: body.locale ?? "fr",
        address_form: body.address_form === "tu" || body.address_form === "vous" ? body.address_form : null,
        sio_share_tag_name: body.sio_share_tag_name ?? null,
        capture_heading: body.capture_heading ?? null,
        capture_subtitle: body.capture_subtitle ?? null,
        capture_first_name: Boolean(body.capture_first_name),
        capture_last_name: Boolean(body.capture_last_name),
        capture_phone: Boolean(body.capture_phone),
        capture_country: Boolean(body.capture_country),
        show_consent_checkbox: body.show_consent_checkbox === false ? false : true,
        // Personalization flags (show the "Personalize" screen before Q1)
        ask_first_name: body.ask_first_name === true ? true : false,
        ask_gender: body.ask_gender === true ? true : false,
        status: body.status === "active" ? "active" : "draft",
      })
      .select("id")
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { ok: false, error: quizError?.message ?? "Failed to create quiz" },
        { status: 400 },
      );
    }

    // Démarrage différé de l'essai Plus Atelier : le compte à rebours démarre
    // ICI, à la création du premier quiz/sondage (pas à la connexion). Un élève
    // qui arrive sur l'Atelier sans commencer son quiz ne perd aucun jour.
    // Best-effort + idempotent : ne bloque jamais la création.
    await startPendingAtelierTrial(user.id);

    // Insert questions. Survey questions carry question_type + config so the
    // public renderer knows which widget to mount; legacy quiz inserts that
    // omit those fields fall through to the column defaults
    // (multiple_choice / {}).
    const ALLOWED_TYPES = new Set([
      "multiple_choice",
      "rating_scale",
      "star_rating",
      "free_text",
      "image_choice",
      "yes_no",
    ]);
    const questions = Array.isArray(body.questions) ? body.questions : [];
    if (questions.length > 0) {
      const { error: qErr } = await supabase.from("quiz_questions").insert(
        questions.map((q: Record<string, unknown>, i: number) => {
          const rawType = typeof q.question_type === "string" ? q.question_type : "multiple_choice";
          const question_type = ALLOWED_TYPES.has(rawType) ? rawType : "multiple_choice";
          return {
            quiz_id: quiz.id,
            question_text: String(q.question_text ?? ""),
            options: Array.isArray(q.options) ? q.options : [],
            sort_order: i,
            question_type,
            config: q.config && typeof q.config === "object" && !Array.isArray(q.config) ? q.config : {},
          };
        }),
      );
      if (qErr) {
        // Béné 2026-05-09 (bug Fabienne) : on ne swallow plus les
        // échecs d'insert. Rollback du quiz orphelin et erreur au front.
        console.error("[POST /api/quiz] Questions insert error:", qErr.message);
        await supabase.from("quizzes").delete().eq("id", quiz.id);
        return NextResponse.json(
          {
            ok: false,
            error: `Échec de l'enregistrement des questions : ${qErr.message}`,
          },
          { status: 400 },
        );
      }
    }

    // Insert results — surveys never have result profiles, so we skip the
    // whole block when mode='survey'. The renderer handles a survey row
    // with zero quiz_results without ever trying to compute one.
    const results = !isSurvey && Array.isArray(body.results) ? body.results : [];
    if (results.length > 0) {
      const { error: rErr } = await supabase.from("quiz_results").insert(
        results.map((r: Record<string, unknown>, i: number) => ({
          quiz_id: quiz.id,
          title: String(r.title ?? ""),
          description: r.description ?? null,
          insight: r.insight ?? null,
          // Les 4 temps de la page de resultat (demande Bene, 3 aout
          // 2026). Les titres de bloc sont ecrits PAR PROFIL par l'IA :
          // "Ce qui te bloque vraiment" vaut mieux qu'un "Prise de
          // conscience" commun a tous les profils. Absents (import,
          // creation manuelle) -> NULL -> repli sur le titre du quiz.
          insight_heading: r.insight_heading ?? null,
          projection: r.projection ?? null,
          projection_heading: r.projection_heading ?? null,
          bridge: r.bridge ?? null,
          bridge_heading: r.bridge_heading ?? null,
          cta_text: r.cta_text ?? null,
          cta_url: r.cta_url ?? null,
          // Multi-tags SIO par profil (Gwenn 12 juillet 2026) : on ecrit le
          // tableau + on garde sio_tag_name (1er) pour la compat descendante.
          sio_tag_names: Array.isArray(r.sio_tag_names)
            ? (r.sio_tag_names as unknown[]).map((v) => String(v ?? "").trim()).filter(Boolean)
            : (r.sio_tag_name ? [String(r.sio_tag_name)] : []),
          sio_tag_name: Array.isArray(r.sio_tag_names) && r.sio_tag_names.length > 0
            ? String(r.sio_tag_names[0])
            : (r.sio_tag_name ?? null),
          sio_course_id: r.sio_course_id ?? null,
          sio_community_id: r.sio_community_id ?? null,
          sort_order: i,
          // Mode scoring : tranche de score (NULL en mode profil).
          min_score: Number.isFinite(r.min_score as number) ? Math.trunc(r.min_score as number) : null,
          max_score: Number.isFinite(r.max_score as number) ? Math.trunc(r.max_score as number) : null,
        })),
      );
      if (rErr) {
        console.error("[POST /api/quiz] Results insert error:", rErr.message);
        await supabase.from("quiz_questions").delete().eq("quiz_id", quiz.id);
        await supabase.from("quizzes").delete().eq("id", quiz.id);
        return NextResponse.json(
          {
            ok: false,
            error: `Échec de l'enregistrement des résultats : ${rErr.message}`,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ ok: true, quizId: quiz.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
