// app/api/quiz/[quizId]/result-og/route.tsx
// Visuel d'apercu social (1200x630) pour le partage d'un PROFIL de
// resultat : "J'ai obtenu : <profil>" aux couleurs du quiz. Reference
// par og:image des pages publiques quand l'URL porte ?rp=<resultId>
// (retour Jocelyne 28 juillet 2026 : le partage FB montrait le quiz,
// jamais le profil obtenu). Public, lecture seule, aucune donnee perso :
// le profil est un contenu public du quiz.
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripHtml } from "@/lib/richText";
import { interpolateText } from "@/lib/quizPersonalization";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Mon resultat" dans la langue du quiz (memes valeurs que le viewer).
const LABELS: Record<string, string> = {
  fr: "Mon résultat",
  en: "My result",
  es: "Mi resultado",
  de: "Mein Ergebnis",
  pt: "Meu resultado",
  it: "Il mio risultato",
  ar: "نتيجتي",
};

/** Titre de profil nettoye pour un visuel statique : placeholders {name}
 *  interpoles a vide, variantes de genre resolues, ponctuation orpheline
 *  retiree, premiere lettre capitalisee. */
function titleForVisual(raw: string | null | undefined): string {
  let t = stripHtml(interpolateText(raw, { name: "", gender: "x" })).replace(/\s+/g, " ").trim();
  t = t.replace(/^[\s,;:.!?-]+/, "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/**
 * Première phrase utilisable d'un texte, bornée à ~140 signes.
 *
 * On coupe à la ponctuation forte plutôt qu'au nombre de caractères :
 * une phrase tronquée en plein milieu ("Tu tournes en rond sur ton…")
 * donne l'impression d'un bug, pas d'une accroche.
 */
function firstSentence(raw: string): string {
  const clean = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const m = /^(.{20,180}?[.!?])(\s|$)/.exec(clean);
  const one = (m ? m[1] : clean).trim();
  if (one.length <= 140) return one;
  // Pas de ponctuation exploitable : on coupe au dernier mot entier.
  const cut = one.slice(0, 140);
  return cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : 140).trim() + "…";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await params;
  // Sans ?rp= : carte du QUIZ (og:image par defaut des quiz sans vignette
  // uploadee, le debogueur FB alerte "propriete deduite" quand og:image
  // manque, retour Bene 28 juillet 2026). Avec ?rp=<resultId> : carte du
  // profil obtenu (partage de resultat).
  const rp = req.nextUrl.searchParams.get("rp") ?? "";
  if (!UUID_RE.test(quizId) || (rp && !UUID_RE.test(rp))) {
    return new Response("Not found", { status: 404 });
  }

  const [{ data: quiz }, { data: result }] = await Promise.all([
    supabaseAdmin
      .from("quizzes")
      .select("id, title, locale, brand_color_primary, brand_logo_url, hide_brand_logo, status")
      .eq("id", quizId)
      .maybeSingle(),
    rp
      ? supabaseAdmin
          .from("quiz_results")
          .select("quiz_id, title, description")
          .eq("id", rp)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!quiz || quiz.status !== "active" || (rp && (!result || result.quiz_id !== quizId))) {
    return new Response("Not found", { status: 404 });
  }

  const primary = String(quiz.brand_color_primary ?? "").trim() || "#4F46E5";
  const locale = String(quiz.locale ?? "fr").split("-")[0];
  const label = rp ? (LABELS[locale] ?? LABELS.fr) : "Quiz";
  const quizTitleClean = titleForVisual(quiz.title as string);
  // Carte profil : titre du profil en grand, titre du quiz en dessous.
  // Carte quiz : titre du quiz en grand, pas de sous-ligne.
  const resultTitle = rp
    ? titleForVisual(result?.title as string) || label
    : quizTitleClean || label;
  const quizTitle = rp ? quizTitleClean : "";

  // LA PHRASE DU MIROIR (demande Béné, 3 août 2026 : "upgrader le visuel
  // qui est partagé si le visiteur veut partager ses résultats").
  //
  // Un nom de profil seul ne dit rien à celui qui voit le partage passer
  // dans son fil : "Le Créateur épuisé" n'appelle pas le clic. La
  // PREMIÈRE phrase de la description, elle, est justement écrite pour
  // qu'on s'y reconnaisse : c'est le miroir. On n'en prend qu'une, et on
  // la borne : au delà, next/og rend un pavé illisible en vignette.
  const mirrorLine = rp ? firstSentence(stripHtml(String(result?.description ?? ""))) : "";

  // Logo : seulement s'il est vraiment affiché sur le quiz, sinon le
  // visuel partagé montrerait une marque que la créatrice a masquée.
  const logoUrl = quiz.hide_brand_logo ? "" : String(quiz.brand_logo_url ?? "").trim();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primary,
          position: "relative",
        }}
      >
        {/* Cercles decoratifs, memes proportions que la carte PNG du viewer */}
        <div style={{ position: "absolute", top: -140, left: -100, width: 420, height: 420, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.12)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -160, right: -120, width: 480, height: 480, borderRadius: 9999, backgroundColor: "rgba(0,0,0,0.10)", display: "flex" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "#ffffff",
            borderRadius: 36,
            padding: "56px 80px",
            maxWidth: 1040,
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: primary, fontWeight: 700 }}>
            {label}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: resultTitle.length > 40 ? 52 : 66,
              fontWeight: 800,
              color: "#0f172a",
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            {resultTitle}
          </div>
          {/* La phrase du miroir : c'est elle qui fait cliquer, parce
              qu'elle décrit une situation dans laquelle on se reconnaît.
              Le titre du quiz passe derrière, en plus petit. */}
          {mirrorLine ? (
            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: mirrorLine.length > 90 ? 27 : 31,
                color: "#334155",
                textAlign: "center",
                lineHeight: 1.35,
              }}
            >
              {mirrorLine}
            </div>
          ) : null}
          {quizTitle ? (
            <div
              style={{
                display: "flex",
                marginTop: mirrorLine ? 22 : 28,
                fontSize: mirrorLine ? 24 : 30,
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              {quizTitle}
            </div>
          ) : null}
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt="" width={132} height={44} style={{ marginTop: 30, objectFit: "contain" }} />
          ) : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Le visuel ne depend que du contenu du quiz : cacheable cote CDN,
        // court pour suivre les renames de profil sans attendre 24h.
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=3600",
      },
    },
  );
}
