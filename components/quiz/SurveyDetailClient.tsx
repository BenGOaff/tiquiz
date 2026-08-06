"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LanguageCombobox } from "@/components/quiz/LanguageCombobox";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, ArrowUp, Copy, Eye, CheckCircle, Share2,
  Loader2, Plus, Trash2, Monitor, Smartphone, Pencil, X, Save, GripVertical,
  Sparkles, TrendingUp, Star, MessageCircle, Crop, Settings2, ImagePlus,
} from "lucide-react";
import { GifPickerButton } from "@/components/quiz/GifPicker";
import { ImageCropDialog } from "@/components/quiz/ImageCropDialog";
import { TiquizStudioButton } from "@/components/visual-studio/TiquizStudioButton";
import { SurveyTrends } from "@/components/quiz/SurveyTrends";
import { SurveyResponsesTable } from "@/components/quiz/SurveyResponsesTable";
import SurveyResultsPanel from "@/components/quiz/SurveyResultsPanel";
import QuizInsightsPanel from "@/components/quiz/QuizInsightsPanel";
import { ReadinessRing } from "@/components/ui/readiness-ring";
import { computeReadiness } from "@/lib/quiz-readiness";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SioTagPicker } from "@/components/ui/sio-tag-picker";
import QuizSioKeyPicker from "@/components/sio/QuizSioKeyPicker";
import { SioTagsProvider } from "@/components/ui/sio-tags-provider";
import { RichTextEdit } from "@/components/ui/rich-text-edit";
import { QuizVarInserter, insertAtCursor, type QuizVarFlags } from "@/components/quiz/QuizVarInserter";
import { interpolateText } from "@/lib/quizPersonalization";
import { UserPalettePicker, type PaletteList } from "@/components/editor/UserPalettePicker";
import { UserPalettesProvider } from "@/components/editor/PalettesContext";
import { RestoreDraftDialog } from "@/components/editor/RestoreDraftDialog";
import { useAutosave } from "@/hooks/use-autosave";
import {
  buildSurveyEditorSnapshot,
  diffEditorSnapshot,
} from "@/lib/quiz/editorSnapshot";
import { answerImageRender } from "@/lib/quiz/answerImage";
import { stripHtml } from "@/lib/richText";
import { alignBlockMarginClass, alignJustifyClass, alignTextClass, resolveBlockAlign } from "@/lib/quiz/textAlign";
import { isPixelFieldValid } from "@/lib/clientPixels";

/** Same demo name we use across the quiz editor — keeps the experience
 *  consistent between quiz mode and survey mode (Marie's feedback #6, #7). */
const PREVIEW_DEMO_NAME = "Alex";

function cleanPlaceholdersForLabel(text: string | null | undefined): string {
  return interpolateText(text, { name: "", gender: "x" });
}
// Titre pour un VISUEL généré (image statique) : pas de placeholder gravé en
// dur ({name}…), ni ponctuation orpheline ; on capitalise. Cf. QuizDetailClient.
function titleForVisual(text: string | null | undefined): string {
  let t = stripHtml(cleanPlaceholdersForLabel(text)).replace(/\s+/g, " ").trim();
  t = t.replace(/^[\s,;:.!?–—-]+/, "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useTranslations } from "next-intl";
import { useShareDomain } from "@/hooks/useShareDomain";
import { ShareDomainPicker } from "@/components/share/ShareDomainPicker";
import { QrCodeCard } from "@/components/share/QrCodeCard";
import {
  ALLOWED_SHARE_NETWORKS,
  BRAND_FONT_CHOICES,
  DEFAULT_BRAND_COLOR_BACKGROUND,
  DEFAULT_BRAND_COLOR_PRIMARY,
  DEFAULT_BRAND_COLOR_TEXT,
  DEFAULT_BRAND_FONT,
  googleFontHref,
  hexToHslTriplet,
  sanitizeSlug,
  type BrandFontChoice,
  type ShareNetwork,
} from "@/lib/quizBranding";
import { projectBackHref } from "@/lib/nav/projectBack";
import { SessionLostBanner } from "@/components/editor/SessionLostBanner";

// Types
// Surveys reuse the QuizDetailClient shell but specialise: questions carry a
// question_type that the WYSIWYG previews differently (rating scale, stars,
// yes/no, free text, image choice, multiple choice). result profiles don't
// exist in survey mode — the engine ends on a thank-you screen — so the
// QuizResult / QuizLead.result_id fields are kept on the DB row but unused
// here.
type QuestionType =
  | "multiple_choice"
  | "rating_scale"
  | "star_rating"
  | "free_text"
  | "image_choice"
  | "yes_no";
type QuizOption = { text: string; result_index: number; image_url?: string | null; image_width?: number | null; sio_tag_name?: string | null };
type QuizQuestion = {
  id?: string;
  question_text: string;
  options: QuizOption[];
  sort_order: number;
  question_type: QuestionType;
  config: Record<string, unknown>;
};
type QuizResult = { id?: string; title: string; description: string | null; insight: string | null; projection: string | null; cta_text: string | null; cta_url: string | null; sio_tag_name: string | null; sio_course_id: string | null; sio_community_id: string | null; sort_order: number };
type QuizLead = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  result_id: string | null;
  result_title: string | null;
  // Survey answers carry shape per question_type — option_index for choice/
  // image_choice/yes_no, rating for rating_scale, stars for star_rating, text
  // for free_text. Tendances analytics aggregate from this raw payload.
  answers:
    | Array<{
        question_index: number;
        /** Identité stable de la question (cf. lib/quiz/questionIdentity.ts).
         *  Absent sur les réponses antérieures au 1er août 2026. */
        question_id?: string | null;
        option_index?: number;
        rating?: number;
        stars?: number;
        text?: string;
      }>
    | null;
  has_shared: boolean;
  bonus_unlocked: boolean;
  flagged?: boolean | null;
  created_at: string;
};
type QuizData = {
  id: string; title: string; slug: string | null;
  introduction: string | null; cta_text: string | null; cta_url: string | null;
  start_button_text: string | null;
  privacy_url: string | null; consent_text: string | null;
  capture_heading: string | null; capture_subtitle: string | null; capture_submit_text: string | null;
  result_insight_heading: string | null; result_projection_heading: string | null;
  address_form: string | null;
  capture_first_name: boolean | null; capture_last_name: boolean | null;
  capture_phone: boolean | null; capture_country: boolean | null;
  phone_required?: boolean | null; first_name_required?: boolean | null; last_name_required?: boolean | null; country_required?: boolean | null;
  virality_enabled: boolean; bonus_description: string | null; bonus_image_url: string | null;
  share_message: string | null; locale: string | null;
  sio_share_tag_name: string | null;
  sio_capture_tag: string | null;
  brand_font: string | null; brand_color_primary: string | null; brand_color_background: string | null;
  brand_color_text: string | null;
  brand_logo_url: string | null;
  hide_brand_logo: boolean | null;
  capture_enabled: boolean | null;
  show_aggregate_responses: boolean | null;
  hide_response_counts: boolean | null;
  notify_responses?: boolean | null;
  survey_thanks_heading: string | null;
  survey_thanks_body: string | null;
  share_networks: string[] | null; og_description: string | null; og_image_url: string | null;
  custom_footer_text: string | null; custom_footer_url: string | null;
  status: string; views_count: number; starts_count: number;
  completions_count: number; shares_count: number;
  questions: QuizQuestion[]; results: QuizResult[];
};
type ProfileBrand = {
  brand_font: string | null; brand_color_primary: string | null; brand_logo_url: string | null;
  plan: string | null; privacy_url: string | null; saved_palettes?: unknown;
  default_meta_pixel_id?: string | null; default_ga4_measurement_id?: string | null;
  default_google_ads_conversion_id?: string | null; default_google_ads_conversion_label?: string | null;
};
interface SurveyDetailClientProps { quizId: string; }

// Inline edit: click to edit text directly on the preview.
// Pass `onGenderize` to display a ✨ button that rewrites the value into the
// `{masc|fem|incl}` interpolation format used by the public renderer.
function InlineEdit({ value, onChange, multiline, className, placeholder, style, onGenderize, availableVars }: {
  value: string; onChange: (v: string) => void; multiline?: boolean; className?: string; placeholder?: string; style?: React.CSSProperties;
  onGenderize?: (current: string) => Promise<string | null>;
  /** Personalization placeholders the user can insert. Driven by quiz.ask_* flags. */
  availableVars?: QuizVarFlags;
}) {
  const t = useTranslations("quizEditor");
  const [editing, setEditing] = useState(false);
  const [genderizing, setGenderizing] = useState(false);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const handleGenderize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (genderizing) return;
    const current = value?.trim();
    if (!current) return;
    setGenderizing(true);
    try {
      const folded = await onGenderize!(current);
      if (folded) onChange(folded);
    } finally {
      setGenderizing(false);
    }
  };

  // Insert a personalization placeholder at the caret (or append) and
  // keep the field in edit mode with the cursor placed just after the
  // inserted text.
  const handleInsertVar = (placeholder: string) => {
    const wasEditing = editing;
    if (!wasEditing) setEditing(true);
    const { value: nextValue, cursor } = insertAtCursor(ref.current, value, placeholder);
    onChange(nextValue);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      try { el.setSelectionRange(cursor, cursor); } catch { /* ignore */ }
    });
  };

  const hasVars = availableVars && (availableVars.name || availableVars.gender);

  if (editing) {
    // Strip any white/light text color the caller passed in so the edit field
    // (white background) keeps a readable dark-on-white contrast — fixes the
    // "invisible text" on inverted buttons like the start CTA.
    const safeClass = (className || "").replace(/\btext-white\b/g, "").replace(/\btext-(?:primary|background)-foreground\b/g, "");
    const cls = `${safeClass} text-foreground w-full bg-white border-2 border-primary/40 outline-none rounded-lg px-2 py-1`;
    return (
      <div className="space-y-1.5">
        {multiline ? (
          <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)} className={`${cls} resize-none min-h-[60px]`} placeholder={placeholder} style={{ ...style, color: undefined }} />
        ) : (
          <input ref={ref as React.RefObject<HTMLInputElement>} value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} className={cls} placeholder={placeholder} style={{ ...style, color: undefined }} />
        )}
        {hasVars && (
          <QuizVarInserter vars={availableVars!} onInsert={handleInsertVar} compact />
        )}
      </div>
    );
  }
  return (
    <div onClick={() => setEditing(true)} style={style} className={`${className || ""} cursor-text rounded-lg hover:ring-2 hover:ring-primary/20 hover:bg-primary/5 px-2 py-1 transition-all group relative min-h-[1.2em]`}>
      {value || <span className="opacity-40 italic">{placeholder}</span>}
      <Pencil className="absolute top-1 right-1 w-3 h-3 text-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      {onGenderize && (
        <button
          type="button"
          onClick={handleGenderize}
          disabled={genderizing || !value?.trim()}
          title={t("genderizeBtnTitle")}
          className="absolute top-1 right-6 p-0.5 text-primary/40 opacity-0 group-hover:opacity-100 hover:text-primary disabled:opacity-100 transition-opacity"
        >
          {genderizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

// Rounded pill used in the capture-form settings panel
function CapturePill({ label, active, locked, onToggle }: {
  label: string; active: boolean; locked?: boolean; onToggle?: () => void;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border";
  if (locked) {
    return <span className={`${base} bg-muted text-muted-foreground border-border`}>{label}</span>;
  }
  if (active) {
    return (
      <button type="button" onClick={onToggle} className={`${base} bg-primary/10 text-primary border-primary/30 hover:bg-primary/15`}>
        {label}
        <X className="w-3 h-3 opacity-60" />
      </button>
    );
  }
  return (
    <button type="button" onClick={onToggle} className={`${base} bg-background text-muted-foreground border-dashed border-border hover:text-foreground hover:border-primary/30`}>
      <Plus className="w-3 h-3" /> {label}
    </button>
  );
}

// Row with label + hint + toggle switch for settings panel
function SettingsToggle({ label, hint, checked, onChange, disabled }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 py-1.5 ${disabled ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">{label}</div>
        {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative shrink-0 w-9 h-5 rounded-full border-0 p-0 transition-colors ${checked ? "bg-primary" : "bg-muted"} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

// Compact draggable row for the sidebar question list
function SortableSidebarQuestion({ id, index, label, onClick, onRemove, canDelete }: {
  id: string; index: number; label: string; onClick: () => void; onRemove: () => void; canDelete: boolean;
}) {
  const t = useTranslations("quizEditor");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 group">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted touch-none" aria-label={t("reorder")}>
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <button onClick={onClick} className="flex-1 text-left px-2 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors truncate">
        <span className="text-xs text-muted-foreground mr-2">{index + 1}</span>
        {label}
      </button>
      {canDelete && (
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-destructive p-1 rounded hover:bg-destructive/10">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Main component
export default function SurveyDetailClient({ quizId }: SurveyDetailClientProps) {
  const t = useTranslations("quizEditor");
  const st = useTranslations("survey");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [leads, setLeads] = useState<QuizLead[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [startButtonText, setStartButtonText] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [consentText, setConsentText] = useState("");
  const [captureHeading, setCaptureHeading] = useState("");
  const [captureSubtitle, setCaptureSubtitle] = useState("");
  // Texte du bouton de validation de la capture (sondage). Vide = string
  // i18n par defaut cote visiteur. Demande Gwenn 12 juillet 2026 : un
  // sondage n'a pas de "resultats", elle veut pouvoir mettre "Valider ma
  // reponse" a la place de "Acceder aux resultats".
  const [captureSubmitText, setCaptureSubmitText] = useState("");
  // Adeline (1er juin 2026) : page de remerciement éditable WYSIWYG.
  // "" = on affiche la string i18n par défaut côté visiteur.
  const [surveyThanksHeading, setSurveyThanksHeading] = useState("");
  const [surveyThanksBody, setSurveyThanksBody] = useState("");
  const [resultInsightHeading, setResultInsightHeading] = useState("");
  const [resultProjectionHeading, setResultProjectionHeading] = useState("");
  const [captureFirstName, setCaptureFirstName] = useState(false);
  const [captureLastName, setCaptureLastName] = useState(false);
  const [capturePhone, setCapturePhone] = useState(false);
  const [captureCountry, setCaptureCountry] = useState(false);
  // Sub-toggles "obligatoire" (Adeline + Hugo, 18 mai 2026). Voir
  // QuizDetailClient pour le détail — même contrat ici.
  const [firstNameRequired, setFirstNameRequired] = useState(false);
  const [lastNameRequired, setLastNameRequired] = useState(false);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [countryRequired, setCountryRequired] = useState(false);
  // Defaults to true so older quizzes (no column value yet) keep showing the
  // GDPR-style checkbox. Only flips when the creator explicitly opts out.
  const [showConsentCheckbox, setShowConsentCheckbox] = useState(true);
  // Phase B (Adeline, 19 mai 2026) : Meta Pixel + Google tags per-survey.
  const [metaPixelId, setMetaPixelId] = useState("");
  const [ga4MeasurementId, setGa4MeasurementId] = useState("");
  const [googleAdsConversionId, setGoogleAdsConversionId] = useState("");
  const [googleAdsConversionLabel, setGoogleAdsConversionLabel] = useState("");
  const [pixelDefaults, setPixelDefaults] = useState<{
    meta_pixel_id: string | null;
    ga4_measurement_id: string | null;
    google_ads_conversion_id: string | null;
    google_ads_conversion_label: string | null;
  } | null>(null);
  const [askFirstName, setAskFirstName] = useState(false);
  const [askGender, setAskGender] = useState(false);
  // Surveys force virality_enabled=false on creation so the bonus / share-
  // gated flow never engages. We keep shareMessage for the thank-you screen
  // optional share button; bonus / virality state from the QuizDetailClient
  // base is dropped entirely.
  const [shareMessage, setShareMessage] = useState("");
  const [locale, setLocale] = useState("");
  const [sioShareTagName, setSioShareTagName] = useState("");
  const [sioCaptureTag, setSioCaptureTag] = useState("");
  const [status, setStatus] = useState("draft");
  const [editQuestions, setEditQuestions] = useState<QuizQuestion[]>([]);
  // Recadrage : image d'option en cours + callback de pose.
  const [cropTarget, setCropTarget] = useState<{ url: string; apply: (u: string) => void } | null>(null);
  // editResults stays declared so the rest of the QuizDetailClient logic
  // still typechecks, but in survey mode it always stays empty (no result
  // profiles exist in the DB for survey rows).
  const [editResults, setEditResults] = useState<QuizResult[]>([]);
  void editResults; void setEditResults;

  // Editor state
  const [mainTab, setMainTab] = useState<"create" | "share" | "trends">("create");
  // Sous-vue de l'onglet Tendances : agrégat (Synthèse) ou tableau par
  // répondant (Réponses, style Typeform / Tally).
  // Defaut "responses" : l'onglet s'appelle "Réponses" pour un sondage, on
  // montre donc directement le tableau des reponses (retour Christelle
  // 12 juillet 2026 : "ou sont enregistrees les reponses ?"). La synthese
  // reste accessible via le sous-toggle.
  const [trendsView, setTrendsView] = useState<"summary" | "responses">("responses");

  // Marquage d'un répondant (étoile). Optimiste, revert si l'API échoue.
  // Met à jour le state `leads` → le tableau ET le PDF reflètent le marquage.
  const handleToggleFlag = async (leadId: string, flagged: boolean) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, flagged } : l)));
    try {
      const res = await fetch(`/api/quiz/${quizId}/survey-flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, flagged }),
      });
      if (!res.ok) throw new Error("flag failed");
    } catch {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, flagged: !flagged } : l)));
      toast.error(t("errFlagSave"));
    }
  };

  /**
   * Suppression de réponses (Béné, 5 août 2026).
   *
   * Contrairement au marquage, on NE retire RIEN de l'écran avant la
   * réponse du serveur : une suppression optimiste qui échoue ferait
   * croire que des réponses sont parties, et elles reviendraient au
   * prochain rechargement, ce qui est pire que l'attente d'une seconde.
   *
   * On ne retire que les ids VRAIMENT supprimés, ceux que la route
   * renvoie : une ligne déjà partie ailleurs ne doit pas faire mentir
   * l'écran sur ce qu'il vient de faire.
   */
  const handleDeleteResponses = async (leadIds: string[]): Promise<string[]> => {
    try {
      const res = await fetch(`/api/quiz/${quizId}/survey-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        // UN `ok: false` PRODUIT TOUJOURS QUELQUE CHOSE A L'ECRAN
        // (regle du 3 aout) : un refus silencieux envoie chercher au
        // mauvais endroit.
        toast.error(t("errResponsesDelete"));
        return [];
      }
      const removed: string[] = Array.isArray(data.deleted) ? data.deleted : [];
      if (removed.length > 0) {
        const gone = new Set(removed);
        setLeads((prev) => prev.filter((l) => !gone.has(l.id)));
        toast.success(t("responsesDeleted", { count: removed.length }));
      }
      return removed;
    } catch {
      toast.error(t("errResponsesDelete"));
      return [];
    }
  };
  const [leftTab, setLeftTab] = useState<"edition" | "design" | "settings">("edition");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_BRAND_COLOR_PRIMARY);
  const [bgColor, setBgColor] = useState<string>(DEFAULT_BRAND_COLOR_BACKGROUND);
  // Couleur des autres textes. NULL = non défini -> aucun override (rendu
  // identique aux sondages existants).
  const [textColor, setTextColor] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<BrandFontChoice>(DEFAULT_BRAND_FONT);
  const [slug, setSlug] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  // Vignette OG (preview de partage social). Cf. demande Adeline.
  const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
  // Image de COUVERTURE du sondage (réutilise intro_image_url de la table
  // quizzes ; rendue publiquement par PublicQuizClient en position "top").
  const [introImageUrl, setIntroImageUrl] = useState<string | null>(null);

  // ── Bord commun de l'ecran d'accueil (drame Bene, 3 aout 2026) ──
  // Meme regle que l'editeur de quiz : titre, sous-titre et bouton se
  // calent sur le MEME bord (lib/quiz/textAlign.ts). Le sous-titre
  // portait `mx-auto` en dur, donc il restait centre sous un titre cale
  // a gauche, et commencait plus a droite que lui.
  //
  // "centered" en dur comme disposition de repli : c'est exactement ce
  // qu'encodait le `text-center` qui etait ecrit ici, et les sondages
  // n'ont pas de reglage de disposition. Rien ne bouge donc tant que la
  // creatrice n'a pas aligne son titre elle-meme.
  // Largeur d'affichage de l'image de couverture en % (null = pleine largeur).
  const [introImageWidth, setIntroImageWidth] = useState<number | null>(null);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [customFooterText, setCustomFooterText] = useState("");
  const [customFooterUrl, setCustomFooterUrl] = useState("");
  const [shareNetworks, setShareNetworks] = useState<ShareNetwork[]>([]);
  // brandLogoUrl = logo du PROFIL (source de vérité globale, partagée
  // entre tous les contenus). Reste piloté par /api/profile. Pour un
  // override par sondage (cas "je crée un sondage pour un client" ou
  // "je veux pas de logo sur celui-ci"), voir quizBrandLogoUrl +
  // hideBrandLogo plus bas.
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  // Override par sondage. NULL = on hérite du logo profil. URL = on a
  // posé un logo SPÉCIFIQUE à ce sondage. Sauvegardé dans
  // quizzes.brand_logo_url.
  const [quizBrandLogoUrl, setQuizBrandLogoUrl] = useState<string | null>(null);
  // Si TRUE, masque tout logo sur ce sondage (ni override, ni profil).
  // Sauvegardé dans quizzes.hide_brand_logo. Default FALSE (compat).
  const [hideBrandLogo, setHideBrandLogo] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Capture lead activée — si FALSE, le visiteur saute l'étape email
  // après la dernière question et accède directement au remerciement.
  // Default TRUE pour préserver le comportement des sondages existants.
  const [captureEnabled, setCaptureEnabled] = useState<boolean>(true);
  // Demander l'email AVANT les questions (Christelle 12 juillet 2026). Off
  // par defaut = capture apres les questions (comportement historique).
  const [captureBeforeQuestions, setCaptureBeforeQuestions] = useState<boolean>(false);
  // Si TRUE, on affiche les pourcentages de réponses des autres
  // participants sur la page de remerciement. Default FALSE.
  const [showAggregateResponses, setShowAggregateResponses] = useState<boolean>(false);
  // PARTAGE DU SONDAGE (Adeline, 5 août 2026) : "elle veut empêcher les
  // gens de partager son sondage". L'écran de remerciement affichait les
  // boutons de réseaux ET un bouton "Partager", sans aucun réglage pour
  // les retirer. On réutilise la colonne `show_result_share` du quiz au
  // lieu d'en créer une deuxième : c'est la même décision (montre-t-on
  // un bouton de partage à la fin), donc elle n'a qu'un domicile, et il
  // n'y a pas de migration à appliquer. Défaut ON : aucun sondage en
  // ligne ne change d'allure.
  const [showResultShare, setShowResultShare] = useState<boolean>(true);
  // Masquer le nombre brut de reponses dans la synthese (onglet Tendances)
  // et n'afficher que les %. Default false = compteurs visibles (compat).
  const [hideResponseCounts, setHideResponseCounts] = useState<boolean>(false);
  // Notifications email par sondage (Gwenn 19 juil 2026). Default true.
  const [notifyResponses, setNotifyResponses] = useState<boolean>(true);
  const [profile, setProfile] = useState<ProfileBrand | null>(null);
  // Palettes utilisateur (charte centralisée — partagée avec quiz et popquiz).
  const [savedPalettes, setSavedPalettes] = useState<PaletteList>([]);
  const handleChangePalettes = useCallback(async (next: PaletteList) => {
    setSavedPalettes(next);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_palettes: next }),
      });
    } catch { /* non-fatal */ }
  }, []);
  // Autosave : draft serveur plus récent que la dernière save explicite
  // → on propose la restauration. Pause de l'autosave tant que le
  // dialog est ouvert pour ne pas écraser l'état serveur.
  const [pendingDraft, setPendingDraft] = useState<{ state: Record<string, unknown>; draftUpdatedAt: string; updatedAt: string | null } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const isPaidPlan = (profile?.plan ?? "free") !== "free";
  const [saving, setSaving] = useState(false);

  // Verrou scroll fenetre : editeur plein ecran, seuls les panneaux internes
  // scrollent (cf. meme verrou dans QuizDetailClient).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const [copied, setCopied] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const { shareDomain, shareDomainOptions, shareOrigin, setShareDomain, isCustomDomain, buildPublicUrl } = useShareDomain();

  // Section refs for scroll-to
  const introRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captureRef = useRef<HTMLDivElement>(null);
  // Survey thank-you screen replaces the bonus + result screens of quizzes.
  const thanksRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Back-to-top FAB (#1, mirrored from QuizDetailClient).
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const onScroll = () => setShowBackToTop(el.scrollTop > 400);
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  const scrollPreviewToTop = useCallback(() => {
    previewRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ─── Autosave snapshot ────────────────────────────────────────
  const autosaveSnapshot = useMemo(() => buildSurveyEditorSnapshot({
    title,
    introduction,
    cta_text: ctaText,
    cta_url: ctaUrl,
    start_button_text: startButtonText,
    privacy_url: privacyUrl,
    consent_text: consentText,
    capture_heading: captureHeading,
    capture_subtitle: captureSubtitle,
    capture_submit_text: captureSubmitText,
    result_insight_heading: resultInsightHeading,
    result_projection_heading: resultProjectionHeading,
    capture_first_name: captureFirstName,
    capture_last_name: captureLastName,
    capture_phone: capturePhone,
    capture_country: captureCountry,
    first_name_required: firstNameRequired,
    last_name_required: lastNameRequired,
    phone_required: phoneRequired,
    country_required: countryRequired,
    show_consent_checkbox: showConsentCheckbox,
    meta_pixel_id: metaPixelId,
    ga4_measurement_id: ga4MeasurementId,
    google_ads_conversion_id: googleAdsConversionId,
    google_ads_conversion_label: googleAdsConversionLabel,
    ask_first_name: askFirstName,
    ask_gender: askGender,
    share_message: shareMessage,
    locale,
    sio_share_tag_name: sioShareTagName,
    sio_capture_tag: sioCaptureTag,
    status,
    brand_font: fontFamily,
    brand_color_primary: primaryColor,
    brand_color_background: bgColor,
    brand_color_text: textColor,
    brand_logo_url: quizBrandLogoUrl,
    hide_brand_logo: hideBrandLogo,
    capture_enabled: captureEnabled,
    capture_before_questions: captureBeforeQuestions,
    show_aggregate_responses: showAggregateResponses,
    show_result_share: showResultShare,
    hide_response_counts: hideResponseCounts,
    notify_responses: notifyResponses,
    survey_thanks_heading: surveyThanksHeading,
    survey_thanks_body: surveyThanksBody,
    slug,
    og_description: ogDescription,
    og_image_url: ogImageUrl,
    intro_image_url: introImageUrl,
    intro_image_width: introImageWidth,
    custom_footer_text: customFooterText,
    custom_footer_url: customFooterUrl,
    share_networks: shareNetworks,
    questions: editQuestions,
  }), [
    title, introduction, ctaText, ctaUrl, startButtonText, privacyUrl, consentText,
    captureHeading, captureSubtitle, captureSubmitText, resultInsightHeading, resultProjectionHeading,
    captureFirstName, captureLastName, capturePhone, captureCountry,
    firstNameRequired, lastNameRequired, phoneRequired, countryRequired,
    showConsentCheckbox, metaPixelId, ga4MeasurementId, googleAdsConversionId,
    googleAdsConversionLabel, askFirstName, askGender,
    shareMessage, locale, sioShareTagName, sioCaptureTag, status,
    fontFamily, primaryColor, bgColor, textColor, quizBrandLogoUrl, hideBrandLogo,
    captureEnabled, captureBeforeQuestions, showAggregateResponses, showResultShare, hideResponseCounts, notifyResponses,
    surveyThanksHeading, surveyThanksBody,
    slug, ogDescription, customFooterText, customFooterUrl, shareNetworks,
    editQuestions, introImageUrl, introImageWidth,
  ]);

  const { savingDraft, clearDraft, sessionLost } = useAutosave({
    endpoint: `/api/quiz/${quizId}/autosave`,
    state: autosaveSnapshot,
    enabled: !loading && !pendingDraft,
    // Filet local : si la session tombe, le brouillon est mis a
    // l'abri dans le navigateur au lieu de n'exister que sur le
    // serveur, qui refuse tout a ce moment la.
    backupId: quizId,
  });

  const applySnapshot = useCallback((s: Record<string, unknown>) => {
    if (typeof s.title === "string") setTitle(s.title);
    if (typeof s.introduction === "string") setIntroduction(s.introduction);
    if (typeof s.cta_text === "string") setCtaText(s.cta_text);
    if (typeof s.cta_url === "string") setCtaUrl(s.cta_url);
    if (typeof s.start_button_text === "string") setStartButtonText(s.start_button_text);
    if (typeof s.privacy_url === "string") setPrivacyUrl(s.privacy_url);
    if (typeof s.consent_text === "string") setConsentText(s.consent_text);
    if (typeof s.capture_heading === "string") setCaptureHeading(s.capture_heading);
    if (typeof s.capture_subtitle === "string") setCaptureSubtitle(s.capture_subtitle);
    if (typeof s.capture_submit_text === "string") setCaptureSubmitText(s.capture_submit_text);
    if (typeof s.result_insight_heading === "string") setResultInsightHeading(s.result_insight_heading);
    if (typeof s.result_projection_heading === "string") setResultProjectionHeading(s.result_projection_heading);
    if (typeof s.capture_first_name === "boolean") setCaptureFirstName(s.capture_first_name);
    if (typeof s.capture_last_name === "boolean") setCaptureLastName(s.capture_last_name);
    if (typeof s.capture_phone === "boolean") setCapturePhone(s.capture_phone);
    if (typeof s.first_name_required === "boolean") setFirstNameRequired(s.first_name_required);
    if (typeof s.last_name_required === "boolean") setLastNameRequired(s.last_name_required);
    if (typeof s.phone_required === "boolean") setPhoneRequired(s.phone_required);
    if (typeof s.country_required === "boolean") setCountryRequired(s.country_required);
    if (typeof s.capture_country === "boolean") setCaptureCountry(s.capture_country);
    if (typeof s.show_consent_checkbox === "boolean") setShowConsentCheckbox(s.show_consent_checkbox);
    if (typeof s.meta_pixel_id === "string") setMetaPixelId(s.meta_pixel_id);
    if (typeof s.ga4_measurement_id === "string") setGa4MeasurementId(s.ga4_measurement_id);
    if (typeof s.google_ads_conversion_id === "string") setGoogleAdsConversionId(s.google_ads_conversion_id);
    if (typeof s.google_ads_conversion_label === "string") setGoogleAdsConversionLabel(s.google_ads_conversion_label);
    if (typeof s.ask_first_name === "boolean") setAskFirstName(s.ask_first_name);
    if (typeof s.ask_gender === "boolean") setAskGender(s.ask_gender);
    if (typeof s.share_message === "string") setShareMessage(s.share_message);
    if (typeof s.locale === "string") setLocale(s.locale);
    if (typeof s.sio_share_tag_name === "string") setSioShareTagName(s.sio_share_tag_name);
    if (typeof s.sio_capture_tag === "string") setSioCaptureTag(s.sio_capture_tag);
    if (typeof s.status === "string") setStatus(s.status);
    if (typeof s.brand_font === "string" && (BRAND_FONT_CHOICES as readonly string[]).includes(s.brand_font)) {
      setFontFamily(s.brand_font as BrandFontChoice);
    }
    if (typeof s.brand_color_primary === "string") setPrimaryColor(s.brand_color_primary);
    if (typeof s.brand_color_background === "string") setBgColor(s.brand_color_background);
    if (s.brand_color_text === null || typeof s.brand_color_text === "string") setTextColor(s.brand_color_text);
    if (s.brand_logo_url === null || typeof s.brand_logo_url === "string") setQuizBrandLogoUrl(s.brand_logo_url);
    if (typeof s.hide_brand_logo === "boolean") setHideBrandLogo(s.hide_brand_logo);
    if (typeof s.capture_enabled === "boolean") setCaptureEnabled(s.capture_enabled);
    if (typeof s.capture_before_questions === "boolean") setCaptureBeforeQuestions(s.capture_before_questions);
    if (typeof s.show_aggregate_responses === "boolean") setShowAggregateResponses(s.show_aggregate_responses);
    if (typeof s.hide_response_counts === "boolean") setHideResponseCounts(s.hide_response_counts);
    if (typeof s.notify_responses === "boolean") setNotifyResponses(s.notify_responses);
    if (typeof s.survey_thanks_heading === "string") setSurveyThanksHeading(s.survey_thanks_heading);
    if (typeof s.survey_thanks_body === "string") setSurveyThanksBody(s.survey_thanks_body);
    if (typeof s.slug === "string") setSlug(s.slug);
    if (typeof s.og_description === "string") setOgDescription(s.og_description);
    if (s.og_image_url === null || typeof s.og_image_url === "string") setOgImageUrl(s.og_image_url);
    if (s.intro_image_url === null || typeof s.intro_image_url === "string") setIntroImageUrl(s.intro_image_url as string | null);
    if (s.intro_image_width === null || typeof s.intro_image_width === "number") setIntroImageWidth(s.intro_image_width as number | null);
    if (typeof s.custom_footer_text === "string") setCustomFooterText(s.custom_footer_text);
    if (typeof s.custom_footer_url === "string") setCustomFooterUrl(s.custom_footer_url);
    if (typeof s.show_result_share === "boolean") setShowResultShare(s.show_result_share);
    if (Array.isArray(s.share_networks)) setShareNetworks(s.share_networks as ShareNetwork[]);
    if (Array.isArray(s.questions)) setEditQuestions(s.questions as QuizQuestion[]);
  }, []);

  const onRestoreDraft = useCallback(async () => {
    if (!pendingDraft) return;
    setRestoring(true);
    try {
      applySnapshot(pendingDraft.state);
    } finally {
      setPendingDraft(null);
      setRestoring(false);
    }
  }, [pendingDraft, applySnapshot]);

  const onDiscardDraft = useCallback(async () => {
    setPendingDraft(null);
    try { await clearDraft(); } catch { /* non-fatal */ }
  }, [clearDraft]);

  const scrollToSection = (id: string) => {
    let el: HTMLDivElement | null = null;
    if (id === "intro") el = introRef.current;
    else if (id === "capture") el = captureRef.current;
    else if (id === "thanks") el = thanksRef.current;
    else if (id.startsWith("q-")) el = questionRefs.current[parseInt(id.split("-")[1])];
    if (el && previewRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Fetch quiz + profile in parallel (profile branding is the default fallback)
  const fetchQuiz = useCallback(async () => {
    try {
      const [quizRes, profileRes] = await Promise.all([
        fetch(`/api/quiz/${quizId}`).then((r) => r.json()),
        fetch(`/api/profile`).then((r) => r.json()).catch(() => null),
      ]);
      if (!quizRes?.ok || !quizRes.quiz) { toast.error(t("errQuizNotFound")); router.push("/dashboard"); return; }
      const q: QuizData = { ...quizRes.quiz, questions: quizRes.quiz.questions ?? [], results: quizRes.quiz.results ?? [] };
      const prof = profileRes?.ok ? (profileRes.profile as ProfileBrand) : null;
      setProfile(prof);
      if (prof) {
        setPixelDefaults({
          meta_pixel_id: prof.default_meta_pixel_id ?? null,
          ga4_measurement_id: prof.default_ga4_measurement_id ?? null,
          google_ads_conversion_id: prof.default_google_ads_conversion_id ?? null,
          google_ads_conversion_label: prof.default_google_ads_conversion_label ?? null,
        });
      }
      setQuiz(q); setLeads(quizRes.leads ?? []);
      setTitle(q.title); setIntroduction(q.introduction ?? "");
      setCtaText(q.cta_text ?? ""); setCtaUrl(q.cta_url ?? "");
      setStartButtonText(q.start_button_text ?? "");
      setPrivacyUrl(q.privacy_url ?? ""); setConsentText(q.consent_text ?? "");
      setCaptureHeading(q.capture_heading ?? ""); setCaptureSubtitle(q.capture_subtitle ?? ""); setCaptureSubmitText(q.capture_submit_text ?? "");
      setResultInsightHeading(q.result_insight_heading ?? ""); setResultProjectionHeading(q.result_projection_heading ?? "");
      setCaptureFirstName(q.capture_first_name ?? false); setCaptureLastName(q.capture_last_name ?? false);
      setShowConsentCheckbox((q as { show_consent_checkbox?: boolean | null }).show_consent_checkbox !== false);
      // Phase B pixels (Adeline, 19 mai 2026)
      setMetaPixelId((q as { meta_pixel_id?: string | null }).meta_pixel_id ?? "");
      setGa4MeasurementId((q as { ga4_measurement_id?: string | null }).ga4_measurement_id ?? "");
      setGoogleAdsConversionId((q as { google_ads_conversion_id?: string | null }).google_ads_conversion_id ?? "");
      setGoogleAdsConversionLabel((q as { google_ads_conversion_label?: string | null }).google_ads_conversion_label ?? "");
      setCapturePhone(q.capture_phone ?? false); setCaptureCountry(q.capture_country ?? false);
      setFirstNameRequired(q.first_name_required ?? false); setLastNameRequired(q.last_name_required ?? false);
      setPhoneRequired(q.phone_required ?? false); setCountryRequired(q.country_required ?? false);
      setAskFirstName(Boolean((q as unknown as Record<string, unknown>).ask_first_name));
      setAskGender(Boolean((q as unknown as Record<string, unknown>).ask_gender));
      setShareMessage(q.share_message ?? ""); setLocale(q.locale ?? "");
      setSioShareTagName(q.sio_share_tag_name ?? ""); setSioCaptureTag(q.sio_capture_tag ?? ""); setStatus(q.status);
      // Hydrate question_type + config defaults so older multiple_choice rows
      // (created before the survey migration) stay valid.
      setEditQuestions(q.questions.map((qq) => ({
        ...qq,
        question_type: (qq.question_type as QuestionType) ?? "multiple_choice",
        config: (qq.config as Record<string, unknown>) ?? {},
      })));
      setEditResults(q.results);
      setSlug(q.slug ?? "");
      setOgDescription(q.og_description ?? "");
      setOgImageUrl(q.og_image_url ?? null);
      setIntroImageUrl((q as { intro_image_url?: string | null }).intro_image_url ?? null);
      setIntroImageWidth((q as { intro_image_width?: number | null }).intro_image_width ?? null);
      setCustomFooterText(q.custom_footer_text ?? "");
      setCustomFooterUrl(q.custom_footer_url ?? "");
      setShareNetworks(Array.isArray(q.share_networks) ? (q.share_networks as ShareNetwork[]) : []);
      // `!== false` et pas `=== true` : NULL en base veut dire "jamais
      // touché", donc partage visible, comme avant ce réglage.
      setShowResultShare((q as { show_result_share?: boolean | null }).show_result_share !== false);
      // Branding: quiz overrides profile, profile overrides default constants
      const resolvedFont = (BRAND_FONT_CHOICES as readonly string[]).includes(q.brand_font ?? "")
        ? (q.brand_font as BrandFontChoice)
        : (BRAND_FONT_CHOICES as readonly string[]).includes(prof?.brand_font ?? "")
          ? (prof!.brand_font as BrandFontChoice)
          : DEFAULT_BRAND_FONT;
      setFontFamily(resolvedFont);
      setPrimaryColor(q.brand_color_primary || prof?.brand_color_primary || DEFAULT_BRAND_COLOR_PRIMARY);
      setBgColor(q.brand_color_background || DEFAULT_BRAND_COLOR_BACKGROUND);
      setTextColor(q.brand_color_text ?? null);
      setQuizBrandLogoUrl((q as { brand_logo_url?: string | null }).brand_logo_url ?? null);
      setHideBrandLogo((q as { hide_brand_logo?: boolean | null }).hide_brand_logo === true);
      setBrandLogoUrl(prof?.brand_logo_url ?? null);
      // Default TRUE (compat) : sondages existants conservent l'étape
      // email. NULL en base = TRUE côté éditeur (la migration default
      // est TRUE, mais ceinture+bretelle).
      setCaptureEnabled((q as { capture_enabled?: boolean | null }).capture_enabled !== false);
      setCaptureBeforeQuestions(Boolean((q as { capture_before_questions?: boolean | null }).capture_before_questions));
      setShowAggregateResponses((q as { show_aggregate_responses?: boolean | null }).show_aggregate_responses === true);
      setHideResponseCounts((q as { hide_response_counts?: boolean | null }).hide_response_counts === true);
      setNotifyResponses((q as { notify_responses?: boolean | null }).notify_responses !== false);
      setSurveyThanksHeading((q as { survey_thanks_heading?: string | null }).survey_thanks_heading ?? "");
      setSurveyThanksBody((q as { survey_thanks_body?: string | null }).survey_thanks_body ?? "");
      const rawPalettes = (prof?.saved_palettes ?? []) as unknown;
      setSavedPalettes(Array.isArray(rawPalettes) ? (rawPalettes as PaletteList) : []);
      // Restauration de draft (autosave) — même logique que
      // QuizDetailClient : compare draft_updated_at vs updated_at.
      const draftState = (q as { draft_state?: unknown }).draft_state ?? null;
      const draftAt = (q as { draft_updated_at?: string | null }).draft_updated_at ?? null;
      const savedAt = (q as { updated_at?: string | null }).updated_at ?? null;
      const isNewerDraft =
        draftState && draftAt && (!savedAt || new Date(draftAt).getTime() > new Date(savedAt).getTime());
      if (isNewerDraft) {
        // Reconstruction canonique par le MÊME constructeur que
        // `autosaveSnapshot` : sans elle, cet éditeur proposait la
        // restauration dès que le brouillon était plus récent, identique
        // ou pas (drame Jocelyne, 4 août 2026, côté quiz). Le typecheck
        // interdit d'oublier un champ ici. Cf. lib/quiz/editorSnapshot.ts.
        const canonical = buildSurveyEditorSnapshot({
          title: q.title,
          introduction: q.introduction ?? "",
          cta_text: q.cta_text ?? "",
          cta_url: q.cta_url ?? "",
          start_button_text: q.start_button_text ?? "",
          privacy_url: q.privacy_url ?? "",
          consent_text: q.consent_text ?? "",
          capture_heading: q.capture_heading ?? "",
          capture_subtitle: q.capture_subtitle ?? "",
          capture_submit_text: q.capture_submit_text ?? "",
          result_insight_heading: q.result_insight_heading ?? "",
          result_projection_heading: q.result_projection_heading ?? "",
          capture_first_name: q.capture_first_name ?? false,
          capture_last_name: q.capture_last_name ?? false,
          capture_phone: q.capture_phone ?? false,
          capture_country: q.capture_country ?? false,
          first_name_required: q.first_name_required ?? false,
          last_name_required: q.last_name_required ?? false,
          phone_required: q.phone_required ?? false,
          country_required: q.country_required ?? false,
          show_consent_checkbox: (q as { show_consent_checkbox?: boolean | null }).show_consent_checkbox !== false,
          meta_pixel_id: (q as { meta_pixel_id?: string | null }).meta_pixel_id ?? "",
          ga4_measurement_id: (q as { ga4_measurement_id?: string | null }).ga4_measurement_id ?? "",
          google_ads_conversion_id: (q as { google_ads_conversion_id?: string | null }).google_ads_conversion_id ?? "",
          google_ads_conversion_label: (q as { google_ads_conversion_label?: string | null }).google_ads_conversion_label ?? "",
          ask_first_name: Boolean((q as unknown as Record<string, unknown>).ask_first_name),
          ask_gender: Boolean((q as unknown as Record<string, unknown>).ask_gender),
          share_message: q.share_message ?? "",
          locale: q.locale ?? "",
          sio_share_tag_name: q.sio_share_tag_name ?? "",
          sio_capture_tag: q.sio_capture_tag ?? "",
          status: q.status,
          brand_font: resolvedFont,
          brand_color_primary: q.brand_color_primary || prof?.brand_color_primary || DEFAULT_BRAND_COLOR_PRIMARY,
          brand_color_background: q.brand_color_background || DEFAULT_BRAND_COLOR_BACKGROUND,
          brand_color_text: q.brand_color_text ?? null,
          brand_logo_url: (q as { brand_logo_url?: string | null }).brand_logo_url ?? null,
          hide_brand_logo: (q as { hide_brand_logo?: boolean | null }).hide_brand_logo === true,
          capture_enabled: (q as { capture_enabled?: boolean | null }).capture_enabled !== false,
          capture_before_questions: Boolean((q as { capture_before_questions?: boolean | null }).capture_before_questions),
          show_aggregate_responses: (q as { show_aggregate_responses?: boolean | null }).show_aggregate_responses === true,
          // `!== false`, EXACTEMENT comme l'hydratation plus haut. Un
          // `?? true` ou un `=== true` ici et la comparaison serait
          // fausse a tous les coups pour les sondages a NULL : c'est le
          // drame Jocelyne du 4 aout, qui reproposait la restauration a
          // chaque ouverture.
          show_result_share: (q as { show_result_share?: boolean | null }).show_result_share !== false,
          hide_response_counts: (q as { hide_response_counts?: boolean | null }).hide_response_counts === true,
          notify_responses: (q as { notify_responses?: boolean | null }).notify_responses !== false,
          survey_thanks_heading: (q as { survey_thanks_heading?: string | null }).survey_thanks_heading ?? "",
          survey_thanks_body: (q as { survey_thanks_body?: string | null }).survey_thanks_body ?? "",
          slug: q.slug ?? "",
          og_description: q.og_description ?? "",
          og_image_url: q.og_image_url ?? null,
          intro_image_url: (q as { intro_image_url?: string | null }).intro_image_url ?? null,
          intro_image_width: (q as { intro_image_width?: number | null }).intro_image_width ?? null,
          custom_footer_text: q.custom_footer_text ?? "",
          custom_footer_url: q.custom_footer_url ?? "",
          share_networks: Array.isArray(q.share_networks) ? q.share_networks : [],
          questions: q.questions.map((qq) => ({
            ...qq,
            question_type: (qq.question_type as QuestionType) ?? "multiple_choice",
            config: (qq.config as Record<string, unknown>) ?? {},
          })),
        });
        const draftDiff = diffEditorSnapshot(draftState, canonical);
        if (draftDiff.length > 0) {
          console.warn("[brouillon] restauration proposée, champs différents :", draftDiff.join(", "));
        }
        if (draftDiff.length > 0) {
          setPendingDraft({
            state: draftState as Record<string, unknown>,
            draftUpdatedAt: draftAt,
            updatedAt: savedAt,
          });
        } else {
          // Identique au quiz sauvegardé : on le nettoie en silence,
          // sinon il reviendrait à chaque ouverture.
          fetch(`/api/quiz/${quizId}/autosave`, { method: "DELETE" }).catch(() => { /* non-fatal */ });
        }
      }
    } catch { toast.error(t("errLoading")); } finally { setLoading(false); }
  }, [quizId, router, t]);
  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  // Logo effectif rendu dans le preview : override sondage > logo profil,
  // null si masqué. Mirroir de QuizDetailClient.effectiveLogoUrl.
  const effectiveLogoUrl: string | null = hideBrandLogo ? null : (quizBrandLogoUrl || brandLogoUrl || null);

  // Dynamic Google Font link in preview (same mechanism as public page → true WYSIWYG)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const href = googleFontHref(fontFamily);
    let link = document.head.querySelector<HTMLLinkElement>('link[data-tiquiz-editor-font="1"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-tiquiz-editor-font", "1");
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [fontFamily]);

  // Rewrite one line of quiz copy into the `{m|f|x}` interpolation format.
  // Shared across InlineEdit call sites (question text, options, results, CTA).
  const genderize = useCallback(async (text: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/quiz/gender-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale: locale || "fr" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const errCode = typeof json?.error === "string" ? ` (${json.error})` : "";
        toast.error(t("genderizeFailed", { code: errCode }));
        return null;
      }
      return typeof json.folded === "string" ? json.folded : null;
    } catch (err) {
      console.error("[genderize] network error:", err);
      toast.error(t("genderizeFailedNetwork"));
      return null;
    }
  }, [locale]);

  // Forwarded to every InlineEdit so users can re-insert {name} or {m|f|x}
  // if they accidentally delete one. The chips only show up for the
  // placeholders the quiz actually uses (driven by the ask_* flags below).
  const personalizationVars = useMemo<QuizVarFlags>(
    () => ({ name: askFirstName, gender: askGender }),
    [askFirstName, askGender],
  );

  // Mirrored from QuizDetailClient (Marie's feedback #5, #6 — same {name}
  // placeholder hygiene applies to surveys).
  const previewInterpolate = useCallback(
    (text: string) => interpolateText(text, { name: PREVIEW_DEMO_NAME, gender: "x" }),
    [],
  );

  // AI rewrite (#4): same /api/quiz/[id]/rewrite endpoint, this just provides
  // the field-kind binding for survey-flavoured prompts.
  const aiRewrite = useCallback(async (plain: string, fieldKind: string): Promise<string[] | null> => {
    try {
      const res = await fetch(`/api/quiz/${quizId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plain, fieldKind }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error ?? t("errGeneric"));
        return null;
      }
      return Array.isArray(data.proposals) ? data.proposals : null;
    } catch {
      toast.error(t("errGeneric"));
      return null;
    }
  }, [quizId, t]);
  const aiRewriteTitle = useCallback((p: string) => aiRewrite(p, "title"), [aiRewrite]);
  const aiRewriteIntro = useCallback((p: string) => aiRewrite(p, "intro"), [aiRewrite]);
  const aiRewriteQuestion = useCallback((p: string) => aiRewrite(p, "question"), [aiRewrite]);
  const aiRewriteOption = useCallback((p: string) => aiRewrite(p, "option"), [aiRewrite]);

  // Bulk-genderize every text field of the quiz in one go. Used when the
  // author toggles "Ask gender" after the quiz was already generated without
  // variants. Walks questions / options / results sequentially and stops
  // cleanly if the API errors out repeatedly.
  const [bulkGenderizing, setBulkGenderizing] = useState<{ done: number; total: number } | null>(null);
  const runBulkGenderize = useCallback(async () => {
    if (bulkGenderizing) return;
    type Field = { get: () => string | null | undefined; set: (v: string) => void };
    const fields: Field[] = [];
    editQuestions.forEach((q, qi) => {
      fields.push({ get: () => q.question_text, set: (v) => setEditQuestions((p) => p.map((x, i) => i === qi ? { ...x, question_text: v } : x)) });
      q.options.forEach((_, oi) => {
        fields.push({ get: () => editQuestions[qi]?.options[oi]?.text, set: (v) => setEditQuestions((p) => p.map((x, i) => i !== qi ? x : { ...x, options: x.options.map((o, j) => j === oi ? { ...o, text: v } : o) })) });
      });
    });
    // Surveys don't have result profiles, so genderize only walks question
    // text + option text (already pushed above).

    const queue = fields.filter((f) => {
      const raw = (f.get() ?? "").toString();
      const text = stripHtml(raw);
      if (!text) return false;
      return !/\{[^{}]*\|[^{}]*\|[^{}]*\}/.test(raw);
    });

    if (queue.length === 0) {
      toast.info(t("genderizeAllDone"));
      return;
    }

    setBulkGenderizing({ done: 0, total: queue.length });
    let done = 0;
    for (const f of queue) {
      const raw = (f.get() ?? "").toString();
      const text = stripHtml(raw);
      try {
        const res = await fetch("/api/quiz/gender-variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, locale: locale || "fr" }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.ok && typeof json.folded === "string") {
          f.set(json.folded);
          done++;
          setBulkGenderizing({ done, total: queue.length });
        }
      } catch { /* skip */ }
    }
    setBulkGenderizing(null);
    if (done === queue.length) toast.success(t("genderizeAllDone"));
    else toast.warning(t("genderizeAllPartial", { done, total: queue.length }));
  }, [bulkGenderizing, editQuestions, editResults, locale, t]);

  // Logo upload. `scope` détermine si on touche au logo GLOBAL (profil)
  // ou seulement au logo POUR CE SONDAGE (override). Par défaut "quiz" :
  // l'éditeur sondage est l'endroit où on overrider sans toucher au
  // profil (cas "sondage pour un client"). Le bouton SettingsClient
  // reste sur scope="profile" pour le logo global.
  async function handleLogoUpload(file: File, scope: "quiz" | "profile" = "quiz") {
    if (!file.type.startsWith("image/")) { toast.error(t("errImageOnly")); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error(t("errImageTooLarge2")); return; }
    setUploadingLogo(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("errNotSignedIn")); return; }
      const ext = file.name.split(".").pop() ?? "png";
      // Path différent par scope pour ne pas écraser le logo de profil
      // quand on upload un logo override pour un sondage spécifique.
      // Horodaté comme tous les autres uploads : cf. QuizDetailClient.
      const path = scope === "profile"
        ? `logos/${user.id}/logo-${Date.now()}.${ext}`
        : `logos/${user.id}/quiz-${quizId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      if (scope === "profile") {
        // Persist at the profile level (single source of truth) + optimistic UI
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brand_logo_url: publicUrl }),
        });
        setBrandLogoUrl(publicUrl);
      } else {
        // Override sondage-only — autosave PATCH gère la persistance sur
        // quizzes.brand_logo_url + on désactive le toggle hide pour
        // éviter qu'un user clique "hide" puis "upload" et ne voie rien.
        setQuizBrandLogoUrl(publicUrl);
        setHideBrandLogo(false);
      }
      toast.success(t("logoUploaded"));
    } catch (err) {
      console.error("Logo upload failed:", err);
      const msg = err instanceof Error ? err.message : t("errUnknown");
      toast.error(t("errLogoUpload", { msg }));
    } finally {
      setUploadingLogo(false);
    }
  }

  // Vignette OG — même pattern que handleLogoUpload mais storage namespace
  // distinct + persisté côté quiz (pas profil) car chaque sondage a sa
  // propre image de partage.
  async function handleOgImageUpload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error(t("errImageOnly")); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t("errImageTooLarge10")); return; }
    setUploadingOgImage(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("errNotSignedIn")); return; }
      const ext = file.name.split(".").pop() ?? "png";
      const path = `og/${user.id}/${quizId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      setOgImageUrl(urlData.publicUrl);
      toast.success(t("ogImageUploaded"));
    } catch (err) {
      console.error("OG image upload failed:", err);
      const msg = err instanceof Error ? err.message : t("errUnknown");
      toast.error(t("errImageUpload", { msg }));
    } finally {
      setUploadingOgImage(false);
    }
  }

  function toggleShareNetwork(n: ShareNetwork) {
    setShareNetworks((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  // Per-option image upload (Hugo, mai 2026 — gamification). Same
  // pattern as bonus / OG uploads.
  const [uploadingOptionKey, setUploadingOptionKey] = useState<string | null>(null);
  async function handleOptionImageUpload(file: File, qi: number, oi: number) {
    if (!file.type.startsWith("image/")) { toast.error(t("errImageOnly")); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t("errImageTooLarge10")); return; }
    const key = `${qi}-${oi}`;
    setUploadingOptionKey(key);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("errNotSignedIn")); return; }
      const ext = file.name.split(".").pop() ?? "png";
      const path = `quiz-options/${user.id}/${quizId}-q${qi}-o${oi}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      setEditQuestions((p) => p.map((q, i) => i !== qi ? q : {
        ...q,
        options: q.options.map((o, j) => j === oi ? { ...o, image_url: urlData.publicUrl } : o),
      }));
    } catch (err) {
      console.error("Option image upload failed:", err);
      const msg = err instanceof Error ? err.message : t("errUnknown");
      toast.error(t("errImageUpload", { msg }));
    } finally {
      setUploadingOptionKey(null);
    }
  }
  function clearOptionImage(qi: number, oi: number) {
    setEditQuestions((p) => p.map((q, i) => i !== qi ? q : {
      ...q,
      options: q.options.map((o, j) => j === oi ? { ...o, image_url: null } : o),
    }));
  }
  // Image de la question (au-dessus de l'enonce), stockee dans config JSONB.
  const setQuestionImage = (qi: number, url: string | null) =>
    setEditQuestions((p) => p.map((q, i) => i !== qi ? q : { ...q, config: { ...(q.config ?? {}), image_url: url } }));
  const setQuestionImageWidth = (qi: number, w: number | null) =>
    setEditQuestions((p) => p.map((q, i) => i !== qi ? q : { ...q, config: { ...(q.config ?? {}), image_width: w } }));
  const [uploadingQuestionKey, setUploadingQuestionKey] = useState<number | null>(null);
  async function handleQuestionImageUpload(file: File, qi: number) {
    if (!file.type.startsWith("image/")) { toast.error(t("errImageOnly")); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t("errImageTooLarge10")); return; }
    setUploadingQuestionKey(qi);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("errNotSignedIn")); return; }
      const ext = file.name.split(".").pop() ?? "png";
      const path = `quiz-questions/${user.id}/${quizId}-q${qi}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      setQuestionImage(qi, urlData.publicUrl);
    } catch (err) {
      console.error("Question image upload failed:", err);
      const msg = err instanceof Error ? err.message : t("errUnknown");
      toast.error(t("errImageUpload", { msg }));
    } finally {
      setUploadingQuestionKey(null);
    }
  }

  // Drag-and-drop upload pour les RichTextEdit (Adeline, mai 2026).
  // Cf. QuizDetailClient pour le détail — même contrat ici. Permet
  // d'incruster une image n'importe où dans le titre/intro/capture
  // d'un sondage en draggant le fichier à l'emplacement voulu.
  async function handleRichTextImageUpload(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) { toast.error(t("errImageOnly")); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t("errImageTooLarge10")); return null; }
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("errNotSignedIn")); return null; }
      const ext = file.name.split(".").pop() ?? "png";
      const path = `rich-content/${user.id}/${quizId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err) {
      console.error("Rich text image upload failed:", err);
      const msg = err instanceof Error ? err.message : t("errUnknown");
      toast.error(t("errImageUpload", { msg }));
      return null;
    }
  }

  // Save
  const handleSave = async () => {
    if (!title.trim()) { toast.error(t("errTitleRequired")); return; }
    const cleanedSlug = slug.trim() ? sanitizeSlug(slug) : null;
    if (slug.trim() && !cleanedSlug) { toast.error(t("errSlugInvalid")); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, introduction, cta_text: ctaText, cta_url: ctaUrl,
          start_button_text: startButtonText || null,
          privacy_url: privacyUrl || null, consent_text: consentText,
          show_consent_checkbox: showConsentCheckbox,
          meta_pixel_id: metaPixelId.trim() || null,
          ga4_measurement_id: ga4MeasurementId.trim() || null,
          google_ads_conversion_id: googleAdsConversionId.trim() || null,
          google_ads_conversion_label: googleAdsConversionLabel.trim() || null,
          capture_heading: captureHeading || null, capture_subtitle: captureSubtitle || null,
          capture_submit_text: captureSubmitText || null,
          result_insight_heading: resultInsightHeading.trim() || null,
          result_projection_heading: resultProjectionHeading.trim() || null,
          capture_first_name: captureFirstName, capture_last_name: captureLastName,
          ask_first_name: askFirstName, ask_gender: askGender,
          capture_phone: capturePhone, capture_country: captureCountry,
          first_name_required: firstNameRequired, last_name_required: lastNameRequired,
          phone_required: phoneRequired, country_required: countryRequired,
          // Surveys never gate on virality / bonus → keep server-side defaults.
          share_message: shareMessage, locale: locale || null,
          sio_share_tag_name: sioShareTagName || null, sio_capture_tag: sioCaptureTag || null, status,
          // Branding
          brand_font: fontFamily, brand_color_primary: primaryColor, brand_color_background: bgColor, brand_color_text: textColor,
          brand_logo_url: quizBrandLogoUrl, hide_brand_logo: hideBrandLogo,
          // Sondage : options de capture et d'affichage agrégé
          capture_enabled: captureEnabled,
          capture_before_questions: captureBeforeQuestions,
          show_aggregate_responses: showAggregateResponses,
          show_result_share: showResultShare,
          hide_response_counts: hideResponseCounts,
          notify_responses: notifyResponses,
          survey_thanks_heading: surveyThanksHeading.trim() || null,
          survey_thanks_body: surveyThanksBody.trim() || null,
          // Share + SEO
          slug: slug.trim() ? cleanedSlug : null,
          og_description: ogDescription.trim() || null,
          og_image_url: ogImageUrl,
          // Couverture du sondage (position "top" → rendue par PublicQuizClient).
          intro_image_url: introImageUrl,
          intro_image_position: introImageUrl ? "top" : null,
          intro_image_width: introImageUrl ? introImageWidth : null,
          share_networks: shareNetworks,
          // Custom footer — ignored server-side for free plan but we still send it
          custom_footer_text: customFooterText.trim() || null,
          custom_footer_url: customFooterUrl.trim() || null,
          questions: editQuestions.map((q, i) => ({
            // Identité stable (drame Adeline, 1er août 2026) : renvoyer l'id
            // permet au PATCH de METTRE À JOUR la ligne existante au lieu de
            // la recréer. Sans ça, chaque sauvegarde casserait le lien entre
            // une question et son historique de réponses.
            ...(q.id ? { id: q.id } : {}),
            question_text: q.question_text,
            options: q.options.map((o) => ({
              text: o.text,
              result_index: o.result_index,
              ...(o.image_url ? { image_url: o.image_url } : {}),
              ...(o.image_width != null ? { image_width: o.image_width } : {}),
              ...(o.sio_tag_name && o.sio_tag_name.trim() ? { sio_tag_name: o.sio_tag_name.trim() } : {}),
            })),
            sort_order: i,
            question_type: q.question_type,
            config: q.config ?? {},
          })),
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        if (res.status === 409 && json?.error === "SLUG_TAKEN") { toast.error(t("errSlugTaken")); return; }
        throw new Error(json?.error || "Error");
      }
      toast.success(t("saved"));
      try { await clearDraft(); } catch { /* non-fatal */ }
      // Puis on RELIT ce que le serveur a réellement enregistré : la
      // typographie française, les `id` des questions nouvelles et les
      // sanitizers réécrivent le contenu côté serveur, et l'éditeur ne le
      // relisait jamais. Son état divergeait donc de la base dès la
      // sauvegarde, et le brouillon suivant portait cette divergence
      // (drame Jocelyne, 4 août 2026, deuxième round).
      try { await fetchQuiz(); } catch { /* non-fatal */ }
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : t("errGeneric")); } finally { setSaving(false); }
  };

  // Publishing celebration: confetti on activation, silent on deactivation.
  const handleToggleStatus = async () => {
    const ns = status === "active" ? "draft" : "active";
    setStatus(ns);
    try {
      await fetch(`/api/quiz/${quizId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) });
      toast.success(ns === "active" ? t("quizPublished") : t("quizDeactivated"));
      if (ns === "active") {
        const { celebrate } = await import("@/lib/celebrate");
        celebrate({ intensity: "huge" });
      }
    } catch { setStatus(status); }
  };

  // Public URL — prefer custom slug when set, fall back to UUID
  const publicSegment = slug.trim() ? sanitizeSlug(slug) ?? quizId : quizId;
  const publicUrl = buildPublicUrl("q", publicSegment);

  // Auto-save du slug (Gwenn, 19 mai 2026). Debounce 1s, toast sur
  // 409 SLUG_TAKEN, met à jour `quiz.slug` local sur succès pour que
  // publicUrl reflète immédiatement la nouvelle valeur.
  useEffect(() => {
    if (!quiz) return;
    const trimmed = slug.trim();
    const canonical = quiz.slug ?? "";
    if (trimmed === canonical) return;
    const timer = setTimeout(async () => {
      const cleanedSlug = trimmed ? sanitizeSlug(trimmed) : null;
      if (trimmed && !cleanedSlug) {
        toast.error(t("errSlugInvalid"));
        return;
      }
      try {
        const res = await fetch(`/api/quiz/${quizId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: cleanedSlug }),
        });
        const json = await res.json().catch(() => null);
        if (res.status === 409 && json?.error === "SLUG_TAKEN") {
          toast.error(t("errSlugTaken"));
          return;
        }
        if (!json?.ok) {
          console.error("[slug autosave] save failed", json?.error);
          return;
        }
        setQuiz((prev) => prev ? { ...prev, slug: cleanedSlug } : prev);
      } catch (err) {
        console.error("[slug autosave] network error", err);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [slug, quiz, quizId, t]);
  // Owner-side preview URL (#7, mirrored from quiz). Kept separate from
  // publicUrl so "Copy link" never copies the preview variant.
  const previewUrl = `${publicUrl}?preview_name=${encodeURIComponent(PREVIEW_DEMO_NAME)}`;
  const handleCopyLink = () => { navigator.clipboard.writeText(publicUrl).then(() => { setCopied(true); toast.success(t("linkCopied")); setTimeout(() => setCopied(false), 2000); }); };
  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;max-width:640px;margin:0 auto;display:block;"></iframe>`;
  const handleCopyIframe = () => { navigator.clipboard.writeText(iframeCode).then(() => { setCopiedIframe(true); toast.success(t("iframeCopied")); setTimeout(() => setCopiedIframe(false), 2000); }); };

  // Drag-and-drop sensors for the sidebar question list
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = editQuestions.map((_, i) => `q-${i}`);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setEditQuestions((prev) => arrayMove(prev, oldIndex, newIndex).map((q, i) => ({ ...q, sort_order: i })));
  };

  // Helpers
  const updateQ = (i: number, v: string) => setEditQuestions(p => p.map((q, qi) => qi === i ? { ...q, question_text: v } : q));
  const updateOpt = (qi: number, oi: number, v: string) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: v } : o) }));
  // Pose une image (GIF / IA / recadrée) sur une option de sondage.
  const setOptImage = (qi: number, oi: number, url: string) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, image_url: url } : o) }));
  const setOptionImageWidth = (qi: number, oi: number, w: number | null) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, image_width: w } : o) }));
  const updateOptResult = (qi: number, oi: number, ri: number) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, result_index: ri } : o) }));
  // Tag Systeme.io par réponse de sondage (Gwenn 19 juil 2026) : appliqué au
  // contact quand le visiteur choisit cette option (choix simple ou multiple).
  const updateOptTag = (qi: number, oi: number, v: string) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, sio_tag_name: v } : o) }));
  const addOpt = (qi: number) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: [...q.options, { text: "", result_index: 0 }] }));
  const removeOpt = (qi: number, oi: number) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.filter((_, j) => j !== oi) }));
  // New survey questions default to a rating_scale (NPS) — covers the most
  // common survey use case out of the box. Creator can switch the type from
  // the question card.
  const addQuestion = () =>
    setEditQuestions((p) => [
      ...p,
      {
        question_text: "",
        options: [],
        sort_order: p.length,
        question_type: "rating_scale",
        config: { min: 0, max: 10, minLabel: t("ratingMinDefault"), maxLabel: t("ratingMaxDefault") },
      },
    ]);
  const removeQuestion = (i: number) => setEditQuestions(p => p.filter((_, qi) => qi !== i));
  // Surveys have no result profiles, so the QuizDetailClient updateR /
  // addResult / removeResult helpers are intentionally absent here. Per-
  // question type/config helpers replace them below.
  const updateQuestionType = (i: number, type: QuestionType) =>
    setEditQuestions((p) =>
      p.map((q, qi) => {
        if (qi !== i) return q;
        const needsOptions = type === "multiple_choice" || type === "image_choice";
        const baseOptions =
          needsOptions && q.options.length >= 2
            ? q.options
            : needsOptions
              ? [
                  { text: "", result_index: 0 },
                  { text: "", result_index: 0 },
                  { text: "", result_index: 0 },
                ]
              : [];
        const baseConfig: Record<string, unknown> =
          type === "rating_scale"
            ? { min: 0, max: 10, minLabel: t("ratingMinDefault"), maxLabel: t("ratingMaxDefault") }
            : type === "star_rating"
              ? { max: 5 }
              : type === "free_text"
                ? { maxLength: 500 }
                : {};
        return { ...q, question_type: type, options: baseOptions, config: baseConfig };
      }),
    );
  const updateQuestionConfig = (i: number, patch: Record<string, unknown>) =>
    setEditQuestions((p) =>
      p.map((q, qi) => (qi === i ? { ...q, config: { ...(q.config ?? {}), ...patch } } : q)),
    );
  const handleExportCSV = () => {
    if (!leads.length) return;
    // Strip rich-text formatting before CSV — raw `<span style=…>` markup
    // would otherwise leak (cf. rapport Adeline, 17 mai 2026).
    const csv = [t("csvHeader"), ...leads.map(l => [l.email, l.first_name ?? "", l.last_name ?? "", stripHtml(l.result_title ?? ""), l.created_at ? new Date(l.created_at).toLocaleDateString() : ""].map(c => `"${String(c).replace(/"/g,'""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `leads-${quizId}.csv`; a.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!quiz) return null;
  const pc = primaryColor;

  return (
   <SioTagsProvider quizId={quizId}>
    {/* Session tombee : l'ecran le dit, au lieu de laisser des 401
        en silence dans la console (drame Bene, 4 aout 2026). */}
    <SessionLostBanner visible={sessionLost} />
    <UserPalettesProvider palettes={savedPalettes}>
    <RestoreDraftDialog
      open={!!pendingDraft}
      draftUpdatedAt={pendingDraft?.draftUpdatedAt ?? null}
      savedUpdatedAt={pendingDraft?.updatedAt ?? null}
      loading={restoring}
      onRestore={onRestoreDraft}
      onDiscard={onDiscardDraft}
      locale={locale || "fr"}
    />
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-background z-10">
        <div className="flex items-center gap-3">
          {/* Retour = Mes projets, TOUJOURS (cf. lib/nav/projectBack.ts,
              boucle stats <-> éditeur, retour Gwenn 1er août 2026). */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("backToProjects")}
            onClick={() => router.push(projectBackHref("surveyEditor"))}
          ><ArrowLeft className="w-5 h-5" /></Button>
          <span className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[200px]">{title || t("titleFallback")}</span>
        </div>
        <nav className="hidden sm:flex items-center bg-muted rounded-lg p-0.5">
          {(["create","share","trends"] as const).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === tab ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tab === "create" ? <><Pencil className="w-3.5 h-3.5 inline mr-1.5" />{t("tabCreate")}</> : tab === "share" ? <><Share2 className="w-3.5 h-3.5 inline mr-1.5" />{t("tabShare")}</> : <><TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />{t("tabTrendsSurvey")}</>}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Readiness ring — passive nudge for surveys (mode='survey'
              tweaks the checks: thank-you CTA replaces result profiles). */}
          {/* Pre-publish readiness gauge only — once the survey is
              live the ring becomes confusing noise (looks like "your
              published work is incomplete"). Hide on active. */}
          {status !== "active" && (() => {
            const r = computeReadiness({
              mode: "survey",
              title,
              introduction,
              cta_text: ctaText,
              cta_url: ctaUrl,
              questions: editQuestions,
              // Match runtime: profile-level privacy URL counts.
              privacy_url: privacyUrl || profile?.privacy_url || "",
              status,
            });
            return (
              <div className="hidden md:block" title={t("readinessTitle", { passed: r.passedCount, total: r.totalCount, percent: r.percent })}>
                <ReadinessRing percent={r.percent} passed={r.passedCount} total={r.totalCount} size="sm" />
              </div>
            );
          })()}
          <div className="hidden sm:flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md ${device === "desktop" ? "bg-background shadow-sm" : ""}`}><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md ${device === "mobile" ? "bg-background shadow-sm" : ""}`}><Smartphone className="w-4 h-4" /></button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(previewUrl, "_blank", "noopener")}
            title={t("previewModeTitleSurvey")}
            className="shrink-0 px-2 sm:px-3"
          >
            <Eye className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("previewModeBtn")}</span>
          </Button>
          {savingDraft && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("autosaveSaving")}
            </span>
          )}
          {/* Mobile : Save en icône seule (autosave couvre déjà la sauvegarde)
              pour garder Publier visible. Desktop inchangé. */}
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="shrink-0 px-2 sm:px-3">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 sm:mr-1" />}<span className="hidden sm:inline">{saving ? "" : t("save")}</span>
          </Button>
          <Button size="sm" onClick={handleToggleStatus} className="shrink-0">{status === "active" ? t("deactivate") : t("publish")}</Button>
        </div>
      </header>
      {/* Onglets en 2e ligne sur MOBILE : la nav d'en-tête est `hidden sm:flex`
          (absente sur téléphone) → on la réaffiche pleine largeur sous l'en-tête
          pour atteindre Partager (le lien) + Tendances. < sm seulement. */}
      <nav className="sm:hidden flex items-stretch border-b shrink-0 bg-background z-10">
        {(["create","share","trends"] as const).map(tab => (
          <button key={tab} onClick={() => setMainTab(tab)} className={`flex-1 px-2 py-2.5 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${mainTab === tab ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"}`}>
            {tab === "create" ? <><Pencil className="w-3.5 h-3.5" />{t("tabCreate")}</> : tab === "share" ? <><Share2 className="w-3.5 h-3.5" />{t("tabShare")}</> : <><TrendingUp className="w-3.5 h-3.5" />{t("tabTrendsSurvey")}</>}
          </button>
        ))}
      </nav>

      {/* MAIN: CRÉER TAB */}
      {mainTab === "create" && (
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside className="w-72 border-r bg-background flex flex-col shrink-0">
            <div className="flex border-b">
              {(["edition","design","settings"] as const).map(tab => (
                <button key={tab} onClick={() => setLeftTab(tab)} className={`flex-1 px-2 py-2.5 text-xs font-medium ${leftTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
                  {tab === "edition" ? t("sidebarEdition") : tab === "design" ? t("sidebarDesign") : t("sidebarSettings")}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
              {leftTab === "edition" && (<>
                {/* Introduction */}
                <button onClick={() => scrollToSection("intro")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors">
                  <span className="text-xs text-muted-foreground mr-2">1</span>{t("sidebarIntroduction")}
                </button>
                {/* Questions (drag-and-drop to reorder) */}
                <div className="flex items-center justify-between"><span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t("sidebarQuestions")}</span><button onClick={addQuestion} className="text-primary hover:bg-primary/10 rounded p-0.5"><Plus className="w-4 h-4" /></button></div>
                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                  <SortableContext items={editQuestions.map((_, i) => `q-${i}`)} strategy={verticalListSortingStrategy}>
                    {editQuestions.map((q, i) => (
                      <SortableSidebarQuestion
                        key={`q-${i}`}
                        id={`q-${i}`}
                        index={i}
                        label={(() => {
                          // Strip placeholders + HTML before truncating so the
                          // sidebar shows readable preview text rather than raw
                          // template syntax (Marie's #5).
                          const plain = stripHtml(cleanPlaceholdersForLabel(q.question_text));
                          return plain ? plain.slice(0, 35) + (plain.length > 35 ? "…" : "") : t("sidebarEmptyQuestion");
                        })()}
                        onClick={() => scrollToSection(`q-${i}`)}
                        onRemove={() => removeQuestion(i)}
                        canDelete={editQuestions.length > 1}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {/* End of survey: capture screen + thank-you screen.
                    Surveys have no result profiles, no bonus / share gate. */}
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pt-2">{t("sidebarSurveyEnd")}</div>
                <button onClick={() => scrollToSection("capture")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors">
                  <span className="text-xs text-muted-foreground mr-2">1</span>{t("sidebarLeadCapture")}
                </button>
                <button onClick={() => scrollToSection("thanks")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors">
                  <span className="text-xs text-muted-foreground mr-2">2</span>{t("sidebarThanks")}
                </button>
              </>)}
              {leftTab === "design" && (<div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs">{t("designFont")}</Label>
                  <select
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value as BrandFontChoice)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-background"
                    style={{ fontFamily }}
                  >
                    {BRAND_FONT_CHOICES.map((f) => (
                      <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">{t("designFontPreviewHint")}</p>
                </div>
                <div className="space-y-3"><Label className="text-xs">{t("designColors")}</Label>
                  <div className="flex items-center gap-2"><input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" /><span className="text-xs text-muted-foreground">{t("designPrimaryColor")}</span></div>
                  <div className="flex items-center gap-2"><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" /><span className="text-xs text-muted-foreground">{t("designBackgroundColor")}</span></div>
                  {/* Couleur des autres textes (réponses, corps). Optionnelle :
                      NULL tant que non choisie -> aucun override en base. */}
                  <div className="flex items-center gap-2">
                    <input type="color" value={textColor ?? DEFAULT_BRAND_COLOR_TEXT} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                    <span className="text-xs text-muted-foreground">{t("designTextColor")}</span>
                    {textColor && (
                      <button type="button" onClick={() => setTextColor(null)} className="text-[10px] text-muted-foreground hover:text-primary hover:underline ml-auto">{t("designTextColorDefault")}</button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{t("designTextColorHint")}</p>
                  <UserPalettePicker
                    currentColor={primaryColor}
                    onPick={setPrimaryColor}
                    palettes={savedPalettes}
                    onChangePalettes={handleChangePalettes}
                  />
                  <button type="button" onClick={() => { if (profile?.brand_color_primary) setPrimaryColor(profile.brand_color_primary); else setPrimaryColor(DEFAULT_BRAND_COLOR_PRIMARY); setBgColor(DEFAULT_BRAND_COLOR_BACKGROUND); }} className="text-[11px] text-primary hover:underline">{t("designResetColors")}</button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("designLogo")}</Label>
                  {/* Trois états (mirroir QuizDetailClient) :
                      • hideBrandLogo TRUE → aucun logo, zone "Logo masqué"
                        + bouton réactiver.
                      • Un override sondage (quizBrandLogoUrl) → override
                        visible + bouton revenir au logo profil.
                      • Sinon → logo profil (fallback) ; bouton "Utiliser un
                        autre logo pour ce sondage" + "Masquer". Pas de
                        bouton "Supprimer" qui effaçait le logo profil. */}
                  {hideBrandLogo ? (
                    <div className="space-y-2">
                      <div className="rounded border border-dashed bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
                        {t("designLogoHidden")}
                      </div>
                      <button
                        type="button"
                        onClick={() => setHideBrandLogo(false)}
                        className="text-xs text-primary hover:underline"
                      >
                        {t("designLogoShow")}
                      </button>
                    </div>
                  ) : quizBrandLogoUrl ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={quizBrandLogoUrl} alt="Logo" className="max-h-16 w-auto object-contain rounded border bg-white p-1" />
                      <p className="text-[10px] text-primary">{t("designLogoOverride")}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-primary hover:underline" disabled={uploadingLogo}>
                          {uploadingLogo ? t("designUploading") : t("designChange")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuizBrandLogoUrl(null)}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {t("designLogoResetProfile")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setHideBrandLogo(true)}
                          className="text-xs text-destructive hover:underline"
                        >
                          {t("designLogoHide")}
                        </button>
                      </div>
                    </div>
                  ) : brandLogoUrl ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={brandLogoUrl} alt="Logo" className="max-h-16 w-auto object-contain rounded border bg-white p-1" />
                      <p className="text-[10px] text-muted-foreground">{t("designLogoFromProfile")}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-primary hover:underline" disabled={uploadingLogo}>
                          {uploadingLogo ? t("designUploading") : t("designLogoUseDifferent")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setHideBrandLogo(true)}
                          className="text-xs text-destructive hover:underline"
                        >
                          {t("designLogoHide")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="w-full border-2 border-dashed rounded-lg p-4 text-xs text-muted-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      {uploadingLogo ? t("designUploading") : t("designAddLogo")}
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f, "quiz"); e.target.value = ""; }}
                  />
                  <p className="text-[10px] text-muted-foreground">{t("designLogoShared")}</p>
                </div>
              </div>)}
              {leftTab === "settings" && (<div className="space-y-6">
                {/* ── Langue du sondage ──
                    Pilote quiz.locale : la langue des textes d'interface du
                    sondage public (boutons, placeholders...). Le rendu public
                    lit deja quiz.locale ; il manquait juste le selecteur cote
                    editeur (le quiz l'a, pas le sondage). */}
                <section className="space-y-2.5">
                  <LanguageCombobox
                    value={locale || "fr"}
                    onValueChange={setLocale}
                    label={t("localeLabel")}
                    strings={{
                      placeholder: t("localePlaceholder"),
                      searchPlaceholder: t("localeSearchPlaceholder"),
                      popularHeading: t("localePopularHeading"),
                      allHeading: t("localeAllHeading"),
                      noResults: t("localeNoResults"),
                    }}
                  />
                </section>
                {/* ── Formulaire de prise de contact ── */}
                <section className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-semibold">{t("captureFormTitle")}</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug">{t("captureFormHint")}</p>
                  </div>
                  {/* Capture entièrement optionnelle (Adeline, 30 mai 2026) :
                      certains sondages sont publics/anonymes, l'auteur veut
                      sauter l'email + champs et envoyer direct au
                      remerciement après la dernière question. */}
                  <SettingsToggle
                    label={t("surveyCaptureEnabledLabel")}
                    hint={t("surveyCaptureEnabledHint")}
                    checked={captureEnabled}
                    onChange={setCaptureEnabled}
                  />
                  {captureEnabled && (<>
                  {/* Position de la capture : avant ou apres les questions.
                      Christelle 12 juillet 2026 : "je voudrais demander
                      emails + prenom AVANT les questions". */}
                  <SettingsToggle
                    label={t("surveyCaptureBeforeLabel")}
                    hint={t("surveyCaptureBeforeHint")}
                    checked={captureBeforeQuestions}
                    onChange={setCaptureBeforeQuestions}
                  />
                  {/* Tag Systeme.io applique a chaque lead du sondage
                      (les sondages n'ont pas de resultat, donc pas de tag
                      par profil comme les quiz). */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{t("surveyLeadTagLabel")}</Label>
                    <SioTagPicker value={sioCaptureTag} onChange={setSioCaptureTag} />
                    <p className="text-[10px] text-muted-foreground">{t("surveyLeadTagHint")}</p>
                  </div>
                  {/* Cle API Systeme.io du sondage : permet d'envoyer les
                      leads du sondage vers un sous-compte SIO (retour
                      Christelle 14 juillet 2026). Le picker PATCH
                      sio_api_key_id de facon autonome. */}
                  <QuizSioKeyPicker quizId={quizId} />
                  <div className="flex flex-wrap gap-1.5">
                    <CapturePill label={t("fieldEmailRequired")} active locked />
                    <CapturePill label={t("fieldFirstNameRequired")} active={captureFirstName} onToggle={() => setCaptureFirstName(!captureFirstName)} />
                    <CapturePill label={t("fieldLastNameRequired")} active={captureLastName} onToggle={() => setCaptureLastName(!captureLastName)} />
                    <CapturePill label={t("fieldPhone")} active={capturePhone} onToggle={() => setCapturePhone(!capturePhone)} />
                    <CapturePill label={t("fieldCountry")} active={captureCountry} onToggle={() => setCaptureCountry(!captureCountry)} />
                  </div>
                  {(captureFirstName || captureLastName || capturePhone || captureCountry) && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {captureFirstName && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                          <input type="checkbox" checked={firstNameRequired} onChange={(e) => setFirstNameRequired(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                          <span>{t("fieldFirstNameRequiredToggle")}</span>
                        </label>
                      )}
                      {captureLastName && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                          <input type="checkbox" checked={lastNameRequired} onChange={(e) => setLastNameRequired(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                          <span>{t("fieldLastNameRequiredToggle")}</span>
                        </label>
                      )}
                      {capturePhone && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                          <input type="checkbox" checked={phoneRequired} onChange={(e) => setPhoneRequired(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                          <span>{t("fieldPhoneRequired")}</span>
                        </label>
                      )}
                      {captureCountry && (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                          <input type="checkbox" checked={countryRequired} onChange={(e) => setCountryRequired(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                          <span>{t("fieldCountryRequiredToggle")}</span>
                        </label>
                      )}
                    </div>
                  )}
                  {(!captureFirstName || !captureLastName || !capturePhone || !captureCountry) && (
                    <button
                      onClick={() => {
                        if (!captureFirstName) setCaptureFirstName(true);
                        else if (!captureLastName) setCaptureLastName(true);
                        else if (!capturePhone) setCapturePhone(true);
                        else if (!captureCountry) setCaptureCountry(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t("addField")}
                    </button>
                  )}
                  {/* Consent checkbox is opt-out — most creators want it for
                      RGPD safety, but some manage consent upstream (their CRM,
                      a separate landing page) and don't want a redundant
                      checkbox under the email field. */}
                  <SettingsToggle
                    label={t("showConsentCheckboxLabel")}
                    hint={t("showConsentCheckboxHint")}
                    checked={showConsentCheckbox}
                    onChange={setShowConsentCheckbox}
                  />
                  </>)}
                </section>

                <Separator />

                {/* Affichage des réponses agrégées (Adeline, 30 mai 2026) :
                    sur le remerciement du sondage, montrer le % de chaque
                    option choisi par les autres participants. */}
                <section className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-semibold">{t("surveyAggregateTitle")}</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug">{t("surveyAggregateHint")}</p>
                  </div>
                  <SettingsToggle
                    label={t("surveyShowAggregateLabel")}
                    hint={t("surveyShowAggregateHint")}
                    checked={showAggregateResponses}
                    onChange={setShowAggregateResponses}
                  />
                  {/* Masque le nombre brut de reponses dans la synthese
                      (onglet Tendances) et n'affiche que les %. */}
                  <SettingsToggle
                    label={t("optionHideResponseCounts")}
                    hint={t("optionHideResponseCountsHint")}
                    checked={hideResponseCounts}
                    onChange={setHideResponseCounts}
                  />
                  {/* Notifications email par sondage (Gwenn 19 juil 2026). */}
                  <SettingsToggle
                    label={t("optionNotifyResponses")}
                    hint={t("optionNotifyResponsesHint")}
                    checked={notifyResponses}
                    onChange={setNotifyResponses}
                  />
                </section>

                <Separator />

                {/* Tracking & Pubs — Phase B (Adeline, 19 mai 2026) */}
                <section className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-semibold">{t("trackingPixelsTitle")}</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug">{t("trackingPixelsHint")}</p>
                  </div>
                  {pixelDefaults &&
                    !metaPixelId && !ga4MeasurementId && !googleAdsConversionId && !googleAdsConversionLabel &&
                    (pixelDefaults.meta_pixel_id || pixelDefaults.ga4_measurement_id ||
                     pixelDefaults.google_ads_conversion_id || pixelDefaults.google_ads_conversion_label) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMetaPixelId(pixelDefaults.meta_pixel_id ?? "");
                        setGa4MeasurementId(pixelDefaults.ga4_measurement_id ?? "");
                        setGoogleAdsConversionId(pixelDefaults.google_ads_conversion_id ?? "");
                        setGoogleAdsConversionLabel(pixelDefaults.google_ads_conversion_label ?? "");
                      }}
                      className="text-[11px] text-primary hover:underline self-start"
                    >
                      {t("trackingApplyDefaults")}
                    </button>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium block">{t("trackingMetaLabel")}</label>
                    <Input value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} placeholder="1234567890123456" className="text-xs h-8" />
                    {metaPixelId && !isPixelFieldValid("meta_pixel_id", metaPixelId) && (
                      <p className="text-[10px] text-destructive">{t("trackingInvalidFormat")}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="hover:underline">{t("trackingMetaHelp")}</a>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium block">{t("trackingGa4Label")}</label>
                    <Input value={ga4MeasurementId} onChange={(e) => setGa4MeasurementId(e.target.value)} placeholder="G-XXXXXXXXXX" className="text-xs h-8" />
                    {ga4MeasurementId && !isPixelFieldValid("ga4_measurement_id", ga4MeasurementId) && (
                      <p className="text-[10px] text-destructive">{t("trackingInvalidFormat")}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">{t("trackingGa4Help")}</a>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium block">{t("trackingAdsIdLabel")}</label>
                    <Input value={googleAdsConversionId} onChange={(e) => setGoogleAdsConversionId(e.target.value)} placeholder="AW-1234567890" className="text-xs h-8" />
                    {googleAdsConversionId && !isPixelFieldValid("google_ads_conversion_id", googleAdsConversionId) && (
                      <p className="text-[10px] text-destructive">{t("trackingInvalidFormat")}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium block">{t("trackingAdsLabelLabel")}</label>
                    <Input value={googleAdsConversionLabel} onChange={(e) => setGoogleAdsConversionLabel(e.target.value)} placeholder="abcDEF123" className="text-xs h-8" />
                    {googleAdsConversionLabel && !isPixelFieldValid("google_ads_conversion_label", googleAdsConversionLabel) && (
                      <p className="text-[10px] text-destructive">{t("trackingInvalidFormat")}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      <a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">{t("trackingAdsHelp")}</a>
                    </p>
                  </div>
                </section>

                <Separator />

                {/* ── Personnalisation (prénom + genre) ── */}
                <section className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-semibold">{t("personalizeTitle")}</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {t("personalizeHint")}
                    </p>
                  </div>
                  <SettingsToggle
                    label={t("personalizeAskFirstName")}
                    hint={t("personalizeAskFirstNameHint")}
                    checked={askFirstName}
                    onChange={setAskFirstName}
                  />
                  <SettingsToggle
                    label={t("personalizeAskGender")}
                    hint={t("personalizeAskGenderHint")}
                    checked={askGender}
                    onChange={setAskGender}
                  />
                  {askGender && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={runBulkGenderize}
                      disabled={!!bulkGenderizing}
                    >
                      {bulkGenderizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          {t("genderizingAll", { done: bulkGenderizing.done, total: bulkGenderizing.total })}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-2" />
                          {t("genderizeAll")}
                        </>
                      )}
                    </Button>
                  )}
                </section>

                <Separator />

                {/* Surveys don't have a virality / bonus / share-tag flow,
                    so the corresponding QuizDetailClient block is dropped
                    here. The thank-you screen handles the optional share. */}

                <Separator />

                {/* ── CTA par défaut ── */}
                <section className="space-y-1.5">
                  <div>
                    <h3 className="text-sm font-semibold">{t("defaultCtaTitle")}</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {t("defaultCtaHint")}
                    </p>
                  </div>
                  <Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder={t("ctaTextPlaceholder")} className="text-xs" />
                  <Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder={t("ctaUrlPlaceholder")} className="text-xs" />
                </section>
              </div>)}
            </div>
          </aside>

          {/* RIGHT: LIVE PREVIEW — all sections stacked, exactly as visitor sees it */}
          <main ref={previewRef} className="flex-1 overflow-y-auto" style={{ backgroundColor: bgColor, fontFamily, ...(textColor ? { color: textColor, ["--foreground" as string]: hexToHslTriplet(textColor) ?? undefined } : {}) }}>
            <div className={`mx-auto transition-all duration-300 ${device === "mobile" ? "max-w-sm" : "w-full"}`}>

              {/* ── INTRO SECTION ── */}
              <div ref={introRef} className={`min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16 ${alignTextClass(resolveBlockAlign(title, title, "centered"))}`}>
                <div className="max-w-2xl w-full space-y-6">
                  {effectiveLogoUrl && (
                    <div className={`flex ${alignJustifyClass(resolveBlockAlign(title, title, "centered"))}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={effectiveLogoUrl} alt="" className="max-h-16 w-auto object-contain" />
                    </div>
                  )}

                  {/* Image de COUVERTURE du sondage (IA designée + GIF + recadrage).
                      Rendue côté visiteur par PublicQuizClient (position "top"). */}
                  {introImageUrl ? (
                    <>
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={introImageUrl} alt="" className={`h-auto rounded-xl ${introImageWidth ? "mx-auto block" : "w-full"}`} style={introImageWidth ? { width: `${introImageWidth}%` } : undefined} />
                      <div className="absolute top-1.5 right-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => introImageUrl && setCropTarget({ url: introImageUrl, apply: (u) => setIntroImageUrl(u) })}
                          className="bg-background/90 hover:bg-primary hover:text-white rounded p-1 shadow"
                          aria-label={t("ariaCropImage")}
                        >
                          <Crop className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIntroImageUrl(null)}
                          className="bg-background/90 hover:bg-destructive hover:text-white rounded p-1 shadow"
                          aria-label={t("previewRemoveImage")}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                      <span>Taille de l&apos;image</span>
                      <input
                        type="range"
                        min={25}
                        max={100}
                        step={5}
                        value={introImageWidth ?? 100}
                        onChange={(e) => { const v = Number(e.target.value); setIntroImageWidth(v >= 100 ? null : v); }}
                        className="w-40 cursor-pointer accent-primary"
                      />
                      <span className="w-9 text-right tabular-nums">{introImageWidth ?? 100}%</span>
                    </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <TiquizStudioButton
                        intent={[titleForVisual(title), stripHtml(cleanPlaceholdersForLabel(introduction))].filter(Boolean).join(" — ")}
                        titleText={titleForVisual(title)}
                        contentId={quizId}
                        label={t("generateAiShort")}
                        onApplyImage={(img) => setIntroImageUrl(img.url)}
                      />
                      <GifPickerButton label="GIF" onPick={(url) => setIntroImageUrl(url)} />
                    </div>
                  )}

                  <RichTextEdit value={title} onChange={setTitle} onAIRewrite={aiRewriteTitle} onImageUpload={handleRichTextImageUpload} singleLine className="text-3xl sm:text-5xl font-bold leading-tight" placeholder={t("previewTitlePh")} />
                  {/* `max-w-xl` borne la longueur de ligne et reste ; c'est
                      le `mx-auto` d'a cote qui centrait le bloc quoi qu'il
                      arrive, d'ou le sous-titre decale sous un titre a
                      gauche. */}
                  <RichTextEdit value={introduction} onChange={setIntroduction} onAIRewrite={aiRewriteIntro} onImageUpload={handleRichTextImageUpload} className={`text-lg text-muted-foreground leading-relaxed max-w-xl ${alignBlockMarginClass(resolveBlockAlign(introduction, title, "centered"))} ${alignTextClass(resolveBlockAlign(introduction, title, "centered"))}`} placeholder={t("previewIntroPh")} />
                  <div className={`flex ${alignJustifyClass(resolveBlockAlign(title, title, "centered"))}`}>
                    <div className="px-10 py-4 rounded-full text-white font-semibold text-lg shadow-lg transition-opacity hover:opacity-90" style={{ backgroundColor: pc }}>
                      <RichTextEdit
                        value={startButtonText}
                        onChange={setStartButtonText}
                        singleLine
                        className="text-white font-semibold text-center"
                        placeholder={t("previewStartBtnPh")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── QUESTIONS — one full page per question, branched on type ──
                  Each question type renders a live mockup of its public
                  widget (NPS scale, stars, yes/no, free text, image grid,
                  multiple choice). The question text is inline-editable;
                  type-specific config (scale bounds, max stars, max text
                  length, image URLs) sits in a "Config" strip below. */}
              {editQuestions.map((q, qi) => {
                const progress = ((qi + 1) / editQuestions.length) * 100;
                const qType = q.question_type ?? "multiple_choice";
                const cfg = (q.config ?? {}) as Record<string, unknown>;
                return (
                  <div key={qi} ref={el => { questionRefs.current[qi] = el; }} className="min-h-screen flex flex-col px-6 sm:px-12 py-8">
                    {/* Progress bar */}
                    <div className="w-full max-w-2xl mx-auto mb-8">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: pc }} /></div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="max-w-2xl w-full space-y-8">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: pc }}>
                            {t("previewQuestionsCounter", { n: qi + 1, total: editQuestions.length })}
                          </p>
                          {/* Type picker — small, top-right of the screen.
                              Switching type resets options + config to safe
                              defaults so the preview never lands in a half-
                              configured state. */}
                          <select
                            value={qType}
                            onChange={(e) => updateQuestionType(qi, e.target.value as QuestionType)}
                            className="text-xs border rounded-lg px-2 py-1 bg-background font-medium"
                          >
                            <option value="rating_scale">{t("typeRatingScale")}</option>
                            <option value="star_rating">{t("typeStarRating")}</option>
                            <option value="yes_no">{t("typeYesNo")}</option>
                            <option value="free_text">{t("typeFreeText")}</option>
                            <option value="multiple_choice">{t("typeMultipleChoice")}</option>
                            <option value="image_choice">{t("typeImageChoice")}</option>
                          </select>
                          {/* Question facultative (Gwenn 20 juil 2026) : le
                              visiteur peut la passer ; une question sautée ne
                              compte pas dans le résultat. */}
                          <label
                            className="inline-flex items-center gap-1.5 text-xs bg-muted/60 rounded-full px-2.5 py-1 cursor-pointer"
                            title={t("optionalQuestionHint")}
                          >
                            <input
                              type="checkbox"
                              checked={(cfg.optional as boolean | undefined) === true}
                              onChange={(e) => updateQuestionConfig(qi, { optional: e.target.checked })}
                              className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                            />
                            <span>{t("optionalQuestionLabel")}</span>
                          </label>
                        </div>

                        <RichTextEdit value={q.question_text} onChange={(v) => updateQ(qi, v)} onGenderize={genderize} onAIRewrite={aiRewriteQuestion} availableVars={personalizationVars} previewTransform={previewInterpolate} singleLine className="text-2xl sm:text-4xl font-bold leading-tight" style={{ color: pc }} placeholder={t("previewQuestionPh")} />
                        {/* Image de la question (au-dessus de l'enonce) + resize. */}
                        {(() => {
                          const cfg = (q.config ?? {}) as Record<string, unknown>;
                          const imgUrl = typeof cfg.image_url === "string" ? cfg.image_url : null;
                          const w = typeof cfg.image_width === "number" ? cfg.image_width : null;
                          return imgUrl ? (
                            <div className="mt-2 space-y-1.5">
                              <div className="relative inline-block w-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgUrl} alt="" className={`h-auto rounded-lg ${w ? "mx-auto block" : "w-full"}`} style={w ? { width: `${w}%` } : undefined} />
                                <button type="button" onClick={() => setQuestionImage(qi, null)} className="absolute top-1.5 right-1.5 bg-background/90 hover:bg-destructive hover:text-white rounded-full p-1 shadow" aria-label={t("previewRemoveImage")}><X className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Taille</span>
                                <input type="range" min={25} max={100} step={5} value={w ?? 100} onChange={(e) => { const v = Number(e.target.value); setQuestionImageWidth(qi, v >= 100 ? null : v); }} className="w-32 cursor-pointer accent-primary" />
                                <span className="w-9 text-right tabular-nums">{w ?? 100}%</span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <label className="text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded border border-dashed cursor-pointer hover:bg-muted text-muted-foreground">
                                <input type="file" accept="image/*" className="hidden" disabled={uploadingQuestionKey === qi} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void handleQuestionImageUpload(f, qi); }} />
                                {uploadingQuestionKey === qi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                                Image de la question
                              </label>
                              <GifPickerButton label="GIF" onPick={(url) => setQuestionImage(qi, url)} />
                            </div>
                          );
                        })()}

                        {/* Type-specific live preview + config */}
                        {qType === "rating_scale" && (() => {
                          const min = typeof cfg.min === "number" ? cfg.min : 0;
                          const max = typeof cfg.max === "number" ? cfg.max : 10;
                          const minLabel = (cfg.minLabel as string) || t("ratingMinDefault");
                          const maxLabel = (cfg.maxLabel as string) || t("ratingMaxDefault");
                          const values: number[] = [];
                          for (let v = min; v <= max; v++) values.push(v);
                          return (
                            <div className="space-y-3">
                              <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                                {values.map((v) => (
                                  <div key={v} className="h-12 rounded-lg border-2 border-border flex items-center justify-center font-semibold text-sm" style={{ borderColor: `${pc}30` }}>{v}</div>
                                ))}
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground px-1">
                                <input value={minLabel} onChange={(e) => updateQuestionConfig(qi, { minLabel: e.target.value })} className="bg-transparent outline-none text-left max-w-[40%]" />
                                <input value={maxLabel} onChange={(e) => updateQuestionConfig(qi, { maxLabel: e.target.value })} className="bg-transparent outline-none text-right max-w-[40%]" />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                                <span className="font-semibold uppercase tracking-widest">{t("scaleConfig")}:</span>
                                <label className="inline-flex items-center gap-1">
                                  {t("scaleMin")}
                                  <input type="number" value={min} onChange={(e) => updateQuestionConfig(qi, { min: Number(e.target.value) })} className="w-14 border rounded px-1.5 py-0.5 text-center" />
                                </label>
                                <label className="inline-flex items-center gap-1">
                                  {t("scaleMax")}
                                  <input type="number" value={max} onChange={(e) => updateQuestionConfig(qi, { max: Number(e.target.value) })} className="w-14 border rounded px-1.5 py-0.5 text-center" />
                                </label>
                              </div>
                            </div>
                          );
                        })()}

                        {qType === "star_rating" && (() => {
                          const max = typeof cfg.max === "number" ? cfg.max : 5;
                          const stars: number[] = [];
                          for (let v = 1; v <= max; v++) stars.push(v);
                          return (
                            <div className="space-y-3">
                              <div className="flex justify-center gap-2 sm:gap-3">
                                {stars.map((v) => (
                                  <Star key={v} className="w-12 h-12 sm:w-14 sm:h-14" style={{ color: `${pc}55` }} />
                                ))}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t justify-center">
                                <label className="inline-flex items-center gap-1">
                                  {t("starMax")}
                                  <input type="number" min={3} max={10} value={max} onChange={(e) => updateQuestionConfig(qi, { max: Math.min(10, Math.max(3, Number(e.target.value) || 5)) })} className="w-14 border rounded px-1.5 py-0.5 text-center" />
                                </label>
                              </div>
                            </div>
                          );
                        })()}

                        {qType === "yes_no" && (
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="h-20 sm:h-24 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-bold" style={{ borderColor: `${pc}30` }}>{t("yesLabel")}</div>
                            <div className="h-20 sm:h-24 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-bold" style={{ borderColor: `${pc}30` }}>{t("noLabel")}</div>
                          </div>
                        )}

                        {qType === "free_text" && (() => {
                          const maxLength = typeof cfg.maxLength === "number" ? cfg.maxLength : 500;
                          return (
                            <div className="space-y-3">
                              <div className="relative">
                                <textarea readOnly rows={5} maxLength={maxLength} className="w-full rounded-xl border-2 border-border px-4 py-3 text-base resize-none bg-muted/10" style={{ borderColor: `${pc}30` }} />
                                {/* Placeholder ÉDITABLE (demande Béné 30 juil
                                    2026, passé en éditeur RICHE le 31 : même
                                    éditeur que les autres textes, taille /
                                    police / alignement compris). Stocké en
                                    HTML dans config.placeholder, rendu en
                                    overlay côté visiteur ("Ta réponse…" par
                                    défaut). Aligné à gauche par défaut comme
                                    le champ visiteur. */}
                                <div className="absolute top-3 left-4 right-4 text-left">
                                  <RichTextEdit value={typeof cfg.placeholder === "string" ? cfg.placeholder : ""} onChange={(v) => updateQuestionConfig(qi, { placeholder: stripHtml(v).trim() ? v : null })} onGenderize={genderize} availableVars={personalizationVars} previewTransform={previewInterpolate} className="text-base text-muted-foreground/70" placeholder={t("previewFreeTextPh")} />
                                </div>
                              </div>
                              {/* Réglage créateur — discret, clairement
                                  hors du visuel participant. Adeline (31
                                  mai 2026) : "ne pas faire flotter ce
                                  champ comme s'il faisait partie du
                                  preview". On le pose dans une pill
                                  grise avec une icône de réglage. */}
                              <div className="flex justify-end">
                                <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1 cursor-pointer" title={t("textMaxLengthHint")}>
                                  <Settings2 className="w-3 h-3 opacity-60" />
                                  <span>{t("textMaxLengthShort")}</span>
                                  <input type="number" min={50} max={5000} value={maxLength} onChange={(e) => updateQuestionConfig(qi, { maxLength: Math.min(5000, Math.max(50, Number(e.target.value) || 500)) })} className="w-14 bg-background border border-border/60 rounded px-1.5 py-0.5 text-center text-[11px] font-medium" />
                                  <span>{t("textMaxLengthChars")}</span>
                                </label>
                              </div>
                            </div>
                          );
                        })()}

                        {(qType === "multiple_choice" || qType === "image_choice") && (
                          <>
                            {/* Multi-select toggle (Typeform/Tally pattern):
                                lets the creator allow visitors to pick more
                                than one option on this question. Stored in
                                q.config.multi_select; the public renderer
                                switches to a toggle-then-Next interaction
                                when it's on. */}
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
                              <input
                                type="checkbox"
                                id={`multi-select-${qi}`}
                                checked={(cfg.multi_select as boolean | undefined) === true}
                                onChange={(e) => setEditQuestions((p) => p.map((qq, i) => i !== qi ? qq : { ...qq, config: { ...(qq.config ?? {}), multi_select: e.target.checked } }))}
                                className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                              />
                              <label htmlFor={`multi-select-${qi}`} className="flex-1 cursor-pointer">
                                <p className="text-sm font-medium">{t("multiSelectLabel")}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{t("multiSelectHint")}</p>
                              </label>
                            </div>
                            <div className={`grid gap-3 ${q.options.length >= 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                              {q.options.map((opt, oi) => (
                                <div key={oi} className="relative rounded-xl border-2 border-border hover:border-primary/30 transition-all group overflow-hidden">
                                  {/* Per-option image (Hugo, mai 2026). Disponible
                                      pour TOUS les types de questions (avant ungate :
                                      ne fonctionnait que sur image_choice). Upload via
                                      Supabase Storage bucket public-assets, max 10 Mo,
                                      formats image/* incluant GIF. */}
                                  {opt.image_url ? (
                                    <div className="relative bg-muted/30">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={opt.image_url} alt={stripHtml(opt.text)} {...answerImageRender(opt.image_width)} />
                                      <div className="absolute top-1.5 right-1.5 flex gap-1">
                                        <button
                                          type="button"
                                          onClick={() => opt.image_url && setCropTarget({ url: opt.image_url, apply: (u) => setOptImage(qi, oi, u) })}
                                          className="bg-background/90 hover:bg-primary hover:text-white rounded p-1 shadow"
                                          aria-label={t("ariaCropImage")}
                                        >
                                          <Crop className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => clearOptionImage(qi, oi)}
                                          className="bg-background/90 hover:bg-destructive hover:text-white rounded p-1 shadow"
                                          aria-label={t("previewRemoveImage")}
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <div className="absolute bottom-1 inset-x-1 flex items-center gap-1.5 bg-background/85 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                        <input type="range" min={25} max={100} step={5} value={typeof opt.image_width === "number" ? opt.image_width : 100} onChange={(e) => { const v = Number(e.target.value); setOptionImageWidth(qi, oi, v >= 100 ? null : v); }} className="flex-1 cursor-pointer accent-primary" />
                                        <span className="tabular-nums">{typeof opt.image_width === "number" ? opt.image_width : 100}%</span>
                                      </div>
                                    </div>
                                  ) : null}
                                  <div className="p-5 space-y-2">
                                    {!opt.image_url && (
                                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                                        <input
                                          type="file"
                                          accept="image/*,image/gif"
                                          className="sr-only"
                                          disabled={uploadingOptionKey === `${qi}-${oi}`}
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) void handleOptionImageUpload(f, qi, oi);
                                            e.target.value = "";
                                          }}
                                        />
                                        {uploadingOptionKey === `${qi}-${oi}` ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Plus className="w-3.5 h-3.5" />
                                        )}
                                        {t("previewAddOptionImage")}
                                      </label>
                                    )}
                                    {!opt.image_url && (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <TiquizStudioButton
                                          intent={[titleForVisual(q.question_text), titleForVisual(opt.text)].filter(Boolean).join(" — ")}
                                          titleText={titleForVisual(opt.text)}
                                          contentId={quizId}
                                          label={t("generateAiShort")}
                                          onApplyImage={(img) => setOptImage(qi, oi, img.url)}
                                        />
                                        <GifPickerButton label="GIF" onPick={(url) => setOptImage(qi, oi, url)} />
                                      </div>
                                    )}
                                    <RichTextEdit value={opt.text} onChange={(v) => updateOpt(qi, oi, v)} onGenderize={genderize} onAIRewrite={aiRewriteOption} availableVars={personalizationVars} previewTransform={previewInterpolate} singleLine className="text-base font-medium" placeholder={t("previewOptionPh", { n: oi + 1 })} />
                                    {/* Tag Systeme.io appliqué au lead qui choisit
                                        cette réponse (Gwenn 19 juil 2026). */}
                                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                      <Label className="text-[10px] font-medium text-muted-foreground">{t("optionSioTagLabel")}</Label>
                                      <SioTagPicker value={opt.sio_tag_name ?? ""} onChange={(v) => updateOptTag(qi, oi, v)} />
                                    </div>
                                  </div>
                                  {q.options.length > 2 && <button onClick={() => removeOpt(qi, oi)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5 z-10"><X className="w-3.5 h-3.5" /></button>}
                                </div>
                              ))}
                            </div>
                            <button onClick={() => addOpt(qi)} className="text-xs hover:underline" style={{ color: pc }}>{t("previewAddOption")}</button>
                          </>
                        )}

                        <p className="text-center text-xs text-muted-foreground pt-4 italic">{t("previewClickHint")}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── CAPTURE / LEAD FORM ──
                  Adeline (31 mai 2026) : si la créatrice a désactivé
                  "Demander les coordonnées" dans les réglages, on cache
                  TOUT le bloc capture du preview (sinon c'est trompeur :
                  on voit le form alors qu'il ne sera jamais affiché au
                  visiteur). Côté visiteur, PublicQuizClient skippe déjà
                  l'étape email quand capture_enabled=false. */}
              {captureEnabled && (
              <div ref={captureRef} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16">
                <div className="max-w-lg w-full space-y-6">
                  {/* Defaults survey-spécifiques : sur un sondage il n'y a
                      pas de "profil" à révéler, le visiteur valide juste
                      ses réponses. */}
                  <RichTextEdit value={captureHeading || t("previewCaptureHeadingDefaultSurvey")} onChange={setCaptureHeading} onImageUpload={handleRichTextImageUpload} singleLine className="text-2xl sm:text-4xl font-bold text-center" placeholder={t("previewCaptureHeadingPh")} />
                  <RichTextEdit value={captureSubtitle || t("previewCaptureSubtitleDefaultSurvey")} onChange={setCaptureSubtitle} onImageUpload={handleRichTextImageUpload} className="text-muted-foreground text-base text-center" placeholder={t("previewCaptureSubtitlePh")} />
                  <div className="space-y-3 max-w-md mx-auto">
                    {(captureFirstName || captureLastName) && <div className="grid grid-cols-2 gap-3">
                      {captureFirstName && <div><label className="text-sm text-muted-foreground">{t("previewCaptureFirstName")}</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                      {captureLastName && <div><label className="text-sm text-muted-foreground">{t("previewCaptureLastName")}</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                    </div>}
                    <div><label className="text-sm text-muted-foreground">Email</label><Input readOnly className="mt-1 bg-muted/20" /></div>
                    {capturePhone && <div><label className="text-sm text-muted-foreground">{t("previewCapturePhone")}</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                  </div>
                  {showConsentCheckbox && (
                    <div className="max-w-md mx-auto flex items-start gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" readOnly className="mt-1 h-4 w-4 accent-primary cursor-default" />
                      <div className="flex-1">
                        <RichTextEdit
                          value={consentText}
                          onChange={setConsentText}
                          className="text-sm"
                          placeholder={t("consentTextPlaceholder")}
                        />
                      </div>
                    </div>
                  )}
                  {/* Bouton de validation editable (demande Gwenn 12 juillet
                      2026). Un sondage n'a pas de "resultats" : defaut
                      survey-approprie ("Valider mes reponses"), surchargeable
                      WYSIWYG. Vide = string i18n par defaut cote visiteur. */}
                  <button className="w-full max-w-md mx-auto block min-h-[48px] h-auto px-8 py-3 rounded-full text-white font-semibold text-lg whitespace-normal leading-snug" style={{ backgroundColor: pc }}>
                    <RichTextEdit
                      value={captureSubmitText || t("previewCaptureSubmitSurvey")}
                      onChange={setCaptureSubmitText}
                      singleLine
                      className="text-white font-semibold text-center w-full"
                      placeholder={t("previewCaptureSubmitSurvey")}
                    />
                  </button>
                </div>
              </div>
              )}

              {/* ── THANK-YOU (survey end screen) ──
                  Replaces the quiz "results" / "bonus" screens. Surveys
                  always end on a thank-you with optional CTA + share button
                  — no profile reveal, no bonus-on-share gate. */}
              <div ref={thanksRef} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16">
                <div className="max-w-lg w-full space-y-6 text-center">
                  <div className="flex justify-center">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${pc}15`, color: pc }}
                    >
                      <CheckCircle className="w-7 h-7" />
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-bold leading-tight">
                    <RichTextEdit
                      value={surveyThanksHeading}
                      onChange={setSurveyThanksHeading}
                      singleLine
                      className="text-2xl sm:text-4xl font-bold text-center"
                      placeholder={t("surveyThanksHeading")}
                    />
                  </h2>
                  <div className="text-muted-foreground text-base leading-relaxed">
                    <RichTextEdit
                      value={surveyThanksBody}
                      onChange={setSurveyThanksBody}
                      className="text-muted-foreground text-base text-center"
                      placeholder={t("surveyThanksBody")}
                    />
                  </div>

                  {/* Inline-editable CTA — same pattern as quiz CTA, but
                      survey-wide (not per result). */}
                  <div className="space-y-2">
                    <button
                      className="w-full px-8 py-4 rounded-full text-white font-semibold text-lg"
                      style={{ backgroundColor: pc }}
                    >
                      <RichTextEdit
                        value={ctaText}
                        onChange={setCtaText}
                        singleLine
                        className="text-white font-semibold text-center"
                        placeholder={t("previewSurveyCtaPh")}
                      />
                    </button>
                    <InlineEdit
                      value={ctaUrl}
                      onChange={setCtaUrl}
                      className="text-xs text-muted-foreground text-center"
                      placeholder={t("previewSurveyCtaUrlPh")}
                    />
                  </div>

                  {/* Share row — surveys can be shared but not gated. */}
                  <div className="pt-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-medium"
                      style={{ borderColor: `${pc}40`, color: pc }}
                    >
                      <Copy className="w-3 h-3" /> {t("previewSurveyShare")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Tiquiz — creator logo when set, Tiquiz logo otherwise */}
              <div className="text-center py-8 border-t space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={effectiveLogoUrl || "/tiquiz-logo.png"}
                  alt=""
                  className="max-h-10 w-auto object-contain mx-auto"
                />
                <p className="text-xs text-muted-foreground/50">
                  {t("previewPoweredByLink")}
                </p>
              </div>
            </div>
          </main>

          {/* Back-to-top FAB (Marie's #1, mirrored from QuizDetailClient).
              Only renders once the preview is scrolled past one viewport,
              keeps the editor uncluttered for short surveys. */}
          {showBackToTop && (
            <button
              type="button"
              onClick={scrollPreviewToTop}
              aria-label={t("backToTop")}
              title={t("backToTop")}
              className="fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Recadrage d'image d'option (GIF animé, upload ou IA). */}
      <ImageCropDialog
        open={cropTarget !== null}
        onOpenChange={(o) => { if (!o) setCropTarget(null); }}
        srcUrl={cropTarget?.url ?? null}
        contentId={quizId}
        onCropped={(u) => { cropTarget?.apply(u); setCropTarget(null); }}
      />

      {/* SHARE TAB */}
      {mainTab === "share" && (
        <div className="flex-1 overflow-y-auto p-6"><div className="max-w-3xl mx-auto space-y-4">
          {/* Custom URL slug — same one-row pattern as the quiz editor.
              Domain picker only renders if the user has at least one
              verified custom domain. */}
          <Card><CardContent className="pt-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4 text-primary" /> {t("shareTabCustomLink")}</h3>
            <p className="text-xs text-muted-foreground">{t("shareTabCustomLinkHint")}</p>
            <ShareDomainPicker
              label={t("shareTabDomainLabel")}
              value={shareDomain}
              options={shareDomainOptions}
              onChange={setShareDomain}
            />
            {/* Gwenn (19 mai 2026) : autosave du slug 1s après le
                dernier input, plus de bouton "Enregistrer" séparé. */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg bg-muted/30 pl-3 pr-1 py-1 flex-1 min-w-0">
                <span className="text-sm text-muted-foreground font-mono whitespace-nowrap shrink-0">
                  {shareDomain
                    ? (isCustomDomain ? `https://${shareDomain}/` : `https://${shareDomain}/q/`)
                    : (typeof window !== "undefined" ? `${window.location.origin}/q/` : "/q/")}
                </span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={quizId}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm font-mono px-1 py-1"
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleCopyLink} title={t("copy")} aria-label={t("copy")}>
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="relative">
              <pre className="text-xs font-mono bg-muted rounded-lg p-3 pr-24 overflow-x-auto border mt-3">{iframeCode}</pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-5 right-2 h-7 px-2"
                onClick={handleCopyIframe}
              >
                {copiedIframe ? <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedIframe ? t("copied") : t("copy")}
              </Button>
            </div>
          </CardContent></Card>

          {/* QR code — affiche meme en draft (cf. note QuizDetailClient).
              Permet de generer le QR a l'avance pour preparer un print. */}
          <QrCodeCard
            url={buildPublicUrl("q", publicSegment)}
            filename={publicSegment}
          />

          {/* Share networks */}
          <Card><CardContent className="pt-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> {t("shareTabNetworks")}</h3>
            {/* PARTAGE DU SONDAGE (Adeline, 5 août 2026). L'interrupteur
                vit AVANT les réseaux : quand il est fermé, la liste en
                dessous ne décide plus de rien, et le dire vaut mieux que
                de la laisser croire qu'elle règle quelque chose. */}
            <SettingsToggle
              label={t("optionSurveyShare")}
              hint={t("optionSurveyShareHint")}
              checked={showResultShare}
              onChange={setShowResultShare}
            />
            <p className="text-xs text-muted-foreground">
              {showResultShare ? t("shareTabNetworksHint") : t("optionSurveyShareOffHint")}
            </p>
            <div className={`flex flex-wrap gap-2 ${showResultShare ? "" : "opacity-40 pointer-events-none"}`}>
              {ALLOWED_SHARE_NETWORKS.map((n) => {
                const active = shareNetworks.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleShareNetwork(n)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </CardContent></Card>

          {/* SEO / Open Graph description + vignette de partage */}
          <Card><CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold">{t("shareTabSeoTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("shareTabSeoHint")}</p>
              <Textarea
                value={ogDescription}
                onChange={(e) => setOgDescription(e.target.value)}
                placeholder={t("shareTabSeoPlaceholder")}
                rows={2}
                maxLength={200}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground text-right">{ogDescription.length}/200</p>
            </div>

            {/* Vignette OG du sondage. Sans upload, c'est le logo Tiquiz
                qui s'affiche dans les previews de partage social. */}
            <div className="space-y-2 pt-2 border-t">
              <h3 className="font-semibold text-sm">{t("shareTabOgImageTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("shareTabOgImageHint")}</p>
              {ogImageUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ogImageUrl} alt="" className="w-full max-w-sm aspect-[1200/630] rounded-lg border bg-muted/30 object-cover" />
                  <div className="flex gap-2">
                    <label className="text-xs px-3 py-1.5 rounded border hover:bg-muted cursor-pointer inline-flex items-center gap-1">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOgImageUpload(f); }}
                        disabled={uploadingOgImage}
                      />
                      {uploadingOgImage ? t("uploading") : t("replace")}
                    </label>
                    <button
                      type="button"
                      onClick={() => setOgImageUrl(null)}
                      className="text-xs px-3 py-1.5 rounded border hover:bg-destructive/10 text-destructive"
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>
              ) : (
                <label className="text-xs px-3 py-1.5 rounded border border-dashed hover:bg-muted cursor-pointer inline-flex items-center gap-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOgImageUpload(f); }}
                    disabled={uploadingOgImage}
                  />
                  {uploadingOgImage ? t("uploading") : t("shareTabOgImageUpload")}
                </label>
              )}
              <p className="text-[10px] text-muted-foreground">{t("shareTabOgImageDimsHint")}</p>
            </div>
          </CardContent></Card>

          {/* Custom footer — paid plans only */}
          <Card className={isPaidPlan ? "" : "opacity-70"}>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                {t("shareTabCustomFooter")}
                {!isPaidPlan && <Badge variant="outline" className="text-[10px]">{t("shareTabPaidBadge")}</Badge>}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isPaidPlan
                  ? t("shareTabCustomFooterPaidHint")
                  : t("shareTabCustomFooterFreeHint")}
              </p>
              <Input
                value={customFooterText}
                onChange={(e) => setCustomFooterText(e.target.value)}
                placeholder={t("shareTabCustomFooterTextPh")}
                className="text-sm"
                disabled={!isPaidPlan}
              />
              <Input
                value={customFooterUrl}
                onChange={(e) => setCustomFooterUrl(e.target.value)}
                placeholder="https://example.com"
                className="text-sm"
                disabled={!isPaidPlan}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-1" />}
              Enregistrer
            </Button>
          </div>
        </div></div>
      )}

      {/* TRENDS TAB — replaces the quiz "results analytics" tab. Aggregates
          lead.answers per question with a type-aware visualisation. */}
      {mainTab === "trends" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {/* Sous-toggle Synthèse | Réponses (pattern Typeform : Summary /
                Responses sous l'onglet Résultats). */}
            <div className="inline-flex items-center bg-muted rounded-lg p-0.5 mb-4">
              {(["summary", "responses"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setTrendsView(v)}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${trendsView === v ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {v === "summary" ? st("viewSummary") : st("viewResponses")}
                </button>
              ))}
            </div>

            {trendsView === "summary" ? (
              <SurveyTrends
                questions={editQuestions}
                hideCounts={hideResponseCounts}
                leads={leads.map((l) => ({
                  id: l.id,
                  email: l.email,
                  first_name: l.first_name,
                  answers: l.answers,
                  created_at: l.created_at,
                }))}
              />
            ) : (
              <SurveyResponsesTable
                quizId={quizId}
                questions={editQuestions}
                leads={leads}
                locale={locale}
                onToggleFlag={handleToggleFlag}
                onDelete={handleDeleteResponses}
              />
            )}

            {/* Analyse IA stratégique (funnel, capture, profils, axes
                d'amélioration, actions) : complète l'analyse des réponses. */}
            <div className="mt-6">
              <QuizInsightsPanel quizId={quizId} />
            </div>

            {/* Export (CSV/Excel/PDF) + analyse IA des réponses du sondage. */}
            <div className="mt-6">
              <SurveyResultsPanel
                quizId={quizId}
                surveyTitle={title}
                leads={leads}
                questions={editQuestions}
                locale={locale}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </UserPalettesProvider>
   </SioTagsProvider>
  );
}
