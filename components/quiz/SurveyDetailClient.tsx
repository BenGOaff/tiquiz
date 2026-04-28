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
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Copy, Eye, CheckCircle, Share2,
  Loader2, Plus, Trash2, Monitor, Smartphone, Pencil, X, Save, GripVertical,
  Sparkles, TrendingUp, Star, MessageCircle,
} from "lucide-react";
import { SurveyTrends } from "@/components/quiz/SurveyTrends";
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
import { SioTagsProvider } from "@/components/ui/sio-tags-provider";
import { RichTextEdit } from "@/components/ui/rich-text-edit";
import { QuizVarInserter, insertAtCursor, type QuizVarFlags } from "@/components/quiz/QuizVarInserter";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useTranslations } from "next-intl";
import {
  ALLOWED_SHARE_NETWORKS,
  BRAND_FONT_CHOICES,
  DEFAULT_BRAND_COLOR_BACKGROUND,
  DEFAULT_BRAND_COLOR_PRIMARY,
  DEFAULT_BRAND_FONT,
  googleFontHref,
  sanitizeSlug,
  type BrandFontChoice,
  type ShareNetwork,
} from "@/lib/quizBranding";

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
type QuizOption = { text: string; result_index: number; image_url?: string | null };
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
        option_index?: number;
        rating?: number;
        stars?: number;
        text?: string;
      }>
    | null;
  has_shared: boolean;
  bonus_unlocked: boolean;
  created_at: string;
};
type QuizData = {
  id: string; title: string; slug: string | null;
  introduction: string | null; cta_text: string | null; cta_url: string | null;
  start_button_text: string | null;
  privacy_url: string | null; consent_text: string | null;
  capture_heading: string | null; capture_subtitle: string | null;
  result_insight_heading: string | null; result_projection_heading: string | null;
  address_form: string | null;
  capture_first_name: boolean | null; capture_last_name: boolean | null;
  capture_phone: boolean | null; capture_country: boolean | null;
  virality_enabled: boolean; bonus_description: string | null; bonus_image_url: string | null;
  share_message: string | null; locale: string | null;
  sio_share_tag_name: string | null;
  brand_font: string | null; brand_color_primary: string | null; brand_color_background: string | null;
  share_networks: string[] | null; og_description: string | null; og_image_url: string | null;
  custom_footer_text: string | null; custom_footer_url: string | null;
  status: string; views_count: number; starts_count: number;
  completions_count: number; shares_count: number;
  questions: QuizQuestion[]; results: QuizResult[];
};
type ProfileBrand = { brand_font: string | null; brand_color_primary: string | null; brand_logo_url: string | null; plan: string | null };
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
          title="Générer les variantes de genre (Il / Elle / Iel)"
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
  const [resultInsightHeading, setResultInsightHeading] = useState("");
  const [resultProjectionHeading, setResultProjectionHeading] = useState("");
  const [captureFirstName, setCaptureFirstName] = useState(false);
  const [captureLastName, setCaptureLastName] = useState(false);
  const [capturePhone, setCapturePhone] = useState(false);
  const [captureCountry, setCaptureCountry] = useState(false);
  // Defaults to true so older quizzes (no column value yet) keep showing the
  // GDPR-style checkbox. Only flips when the creator explicitly opts out.
  const [showConsentCheckbox, setShowConsentCheckbox] = useState(true);
  const [askFirstName, setAskFirstName] = useState(false);
  const [askGender, setAskGender] = useState(false);
  // Surveys force virality_enabled=false on creation so the bonus / share-
  // gated flow never engages. We keep shareMessage for the thank-you screen
  // optional share button; bonus / virality state from the QuizDetailClient
  // base is dropped entirely.
  const [shareMessage, setShareMessage] = useState("");
  const [locale, setLocale] = useState("");
  const [sioShareTagName, setSioShareTagName] = useState("");
  const [status, setStatus] = useState("draft");
  const [editQuestions, setEditQuestions] = useState<QuizQuestion[]>([]);
  // editResults stays declared so the rest of the QuizDetailClient logic
  // still typechecks, but in survey mode it always stays empty (no result
  // profiles exist in the DB for survey rows).
  const [editResults, setEditResults] = useState<QuizResult[]>([]);
  void editResults; void setEditResults;

  // Editor state
  const [mainTab, setMainTab] = useState<"create" | "share" | "trends">("create");
  const [leftTab, setLeftTab] = useState<"edition" | "design" | "settings">("edition");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_BRAND_COLOR_PRIMARY);
  const [bgColor, setBgColor] = useState<string>(DEFAULT_BRAND_COLOR_BACKGROUND);
  const [fontFamily, setFontFamily] = useState<BrandFontChoice>(DEFAULT_BRAND_FONT);
  const [slug, setSlug] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [customFooterText, setCustomFooterText] = useState("");
  const [customFooterUrl, setCustomFooterUrl] = useState("");
  const [shareNetworks, setShareNetworks] = useState<ShareNetwork[]>([]);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileBrand | null>(null);
  const isPaidPlan = (profile?.plan ?? "free") !== "free";
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Section refs for scroll-to
  const introRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captureRef = useRef<HTMLDivElement>(null);
  // Survey thank-you screen replaces the bonus + result screens of quizzes.
  const thanksRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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
      setQuiz(q); setLeads(quizRes.leads ?? []);
      setTitle(q.title); setIntroduction(q.introduction ?? "");
      setCtaText(q.cta_text ?? ""); setCtaUrl(q.cta_url ?? "");
      setStartButtonText(q.start_button_text ?? "");
      setPrivacyUrl(q.privacy_url ?? ""); setConsentText(q.consent_text ?? "");
      setCaptureHeading(q.capture_heading ?? ""); setCaptureSubtitle(q.capture_subtitle ?? "");
      setResultInsightHeading(q.result_insight_heading ?? ""); setResultProjectionHeading(q.result_projection_heading ?? "");
      setCaptureFirstName(q.capture_first_name ?? false); setCaptureLastName(q.capture_last_name ?? false);
      setShowConsentCheckbox((q as { show_consent_checkbox?: boolean | null }).show_consent_checkbox !== false);
      setCapturePhone(q.capture_phone ?? false); setCaptureCountry(q.capture_country ?? false);
      setAskFirstName(Boolean((q as unknown as Record<string, unknown>).ask_first_name));
      setAskGender(Boolean((q as unknown as Record<string, unknown>).ask_gender));
      setShareMessage(q.share_message ?? ""); setLocale(q.locale ?? "");
      setSioShareTagName(q.sio_share_tag_name ?? ""); setStatus(q.status);
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
      setCustomFooterText(q.custom_footer_text ?? "");
      setCustomFooterUrl(q.custom_footer_url ?? "");
      setShareNetworks(Array.isArray(q.share_networks) ? (q.share_networks as ShareNetwork[]) : []);
      // Branding: quiz overrides profile, profile overrides default constants
      const resolvedFont = (BRAND_FONT_CHOICES as readonly string[]).includes(q.brand_font ?? "")
        ? (q.brand_font as BrandFontChoice)
        : (BRAND_FONT_CHOICES as readonly string[]).includes(prof?.brand_font ?? "")
          ? (prof!.brand_font as BrandFontChoice)
          : DEFAULT_BRAND_FONT;
      setFontFamily(resolvedFont);
      setPrimaryColor(q.brand_color_primary || prof?.brand_color_primary || DEFAULT_BRAND_COLOR_PRIMARY);
      setBgColor(q.brand_color_background || DEFAULT_BRAND_COLOR_BACKGROUND);
      setBrandLogoUrl(prof?.brand_logo_url ?? null);
    } catch { toast.error(t("errLoading")); } finally { setLoading(false); }
  }, [quizId, router]);
  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

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
        toast.error("Impossible de générer les variantes. Réessaie.");
        return null;
      }
      return typeof json.folded === "string" ? json.folded : null;
    } catch {
      toast.error("Impossible de générer les variantes. Réessaie.");
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
      const text = raw.replace(/<[^>]*>/g, "").trim();
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
      const text = raw.replace(/<[^>]*>/g, "").trim();
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

  // Logo upload (reuses public-assets bucket, same layout as SettingsClient)
  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error(t("errImageOnly")); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error(t("errImageTooLarge2")); return; }
    setUploadingLogo(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("errNotSignedIn")); return; }
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logos/${user.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      // Persist at the profile level (single source of truth) + optimistic UI
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_logo_url: publicUrl }),
      });
      setBrandLogoUrl(publicUrl);
      toast.success(t("logoUploaded"));
    } catch (err) {
      console.error("Logo upload failed:", err);
      const msg = err instanceof Error ? err.message : t("errUnknown");
      toast.error(t("errLogoUpload", { msg }));
    } finally {
      setUploadingLogo(false);
    }
  }

  function toggleShareNetwork(n: ShareNetwork) {
    setShareNetworks((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
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
          capture_heading: captureHeading || null, capture_subtitle: captureSubtitle || null,
          result_insight_heading: resultInsightHeading.trim() || null,
          result_projection_heading: resultProjectionHeading.trim() || null,
          capture_first_name: captureFirstName, capture_last_name: captureLastName,
          ask_first_name: askFirstName, ask_gender: askGender,
          capture_phone: capturePhone, capture_country: captureCountry,
          // Surveys never gate on virality / bonus → keep server-side defaults.
          share_message: shareMessage, locale: locale || null,
          sio_share_tag_name: sioShareTagName || null, status,
          // Branding
          brand_font: fontFamily, brand_color_primary: primaryColor, brand_color_background: bgColor,
          // Share + SEO
          slug: slug.trim() ? cleanedSlug : null,
          og_description: ogDescription.trim() || null,
          share_networks: shareNetworks,
          // Custom footer — ignored server-side for free plan but we still send it
          custom_footer_text: customFooterText.trim() || null,
          custom_footer_url: customFooterUrl.trim() || null,
          questions: editQuestions.map((q, i) => ({
            question_text: q.question_text,
            options: q.options.map((o) => ({
              text: o.text,
              result_index: o.result_index,
              ...(o.image_url ? { image_url: o.image_url } : {}),
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
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${publicSegment}` : `/q/${publicSegment}`;
  const handleCopyLink = () => { navigator.clipboard.writeText(publicUrl).then(() => { setCopied(true); toast.success(t("linkCopied")); setTimeout(() => setCopied(false), 2000); }); };

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
  const updateOptResult = (qi: number, oi: number, ri: number) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, result_index: ri } : o) }));
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
    const csv = [t("csvHeader"), ...leads.map(l => [l.email, l.first_name ?? "", l.last_name ?? "", l.result_title ?? "", l.created_at ? new Date(l.created_at).toLocaleDateString() : ""].map(c => `"${String(c).replace(/"/g,'""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `leads-${quizId}.csv`; a.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!quiz) return null;
  const pc = primaryColor;

  return (
   <SioTagsProvider>
    <div className="h-screen flex flex-col bg-background">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link></Button>
          <span className="font-semibold text-sm truncate max-w-[200px]">{title || t("titleFallback")}</span>
        </div>
        <nav className="hidden sm:flex items-center bg-muted rounded-lg p-0.5">
          {(["create","share","trends"] as const).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === tab ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tab === "create" ? <><Pencil className="w-3.5 h-3.5 inline mr-1.5" />{t("tabCreate")}</> : tab === "share" ? <><Share2 className="w-3.5 h-3.5 inline mr-1.5" />{t("tabShare")}</> : <><TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />{t("tabTrends")}</>}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* Readiness ring — passive nudge for surveys (mode='survey'
              tweaks the checks: thank-you CTA replaces result profiles). */}
          {(() => {
            const r = computeReadiness({
              mode: "survey",
              title,
              introduction,
              cta_text: ctaText,
              cta_url: ctaUrl,
              questions: editQuestions,
              privacy_url: privacyUrl,
              status,
            });
            return (
              <div className="hidden md:block" title={`${r.passedCount}/${r.totalCount} étapes — ${r.percent}% prêt`}>
                <ReadinessRing percent={r.percent} passed={r.passedCount} total={r.totalCount} size="sm" />
              </div>
            );
          })()}
          <div className="hidden sm:flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md ${device === "desktop" ? "bg-background shadow-sm" : ""}`}><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md ${device === "mobile" ? "bg-background shadow-sm" : ""}`}><Smartphone className="w-4 h-4" /></button>
          </div>
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}{saving ? "" : t("save")}
          </Button>
          <Button size="sm" onClick={handleToggleStatus}>{status === "active" ? t("deactivate") : t("publish")}</Button>
        </div>
      </header>

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
                        label={q.question_text ? q.question_text.slice(0, 35) + (q.question_text.length > 35 ? "…" : "") : t("sidebarEmptyQuestion")}
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
                  <button type="button" onClick={() => { if (profile?.brand_color_primary) setPrimaryColor(profile.brand_color_primary); else setPrimaryColor(DEFAULT_BRAND_COLOR_PRIMARY); setBgColor(DEFAULT_BRAND_COLOR_BACKGROUND); }} className="text-[11px] text-primary hover:underline">{t("designResetColors")}</button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("designLogo")}</Label>
                  {brandLogoUrl ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={brandLogoUrl} alt="Logo" className="max-h-16 w-auto object-contain rounded border bg-white p-1" />
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-primary hover:underline" disabled={uploadingLogo}>
                          {uploadingLogo ? t("designUploading") : t("designChange")}
                        </button>
                        <button type="button" onClick={async () => { await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand_logo_url: null }) }); setBrandLogoUrl(null); }} className="text-xs text-destructive hover:underline">{t("designRemove")}</button>
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
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }}
                  />
                  <p className="text-[10px] text-muted-foreground">{t("designLogoShared")}</p>
                </div>
              </div>)}
              {leftTab === "settings" && (<div className="space-y-6">
                {/* ── Formulaire de prise de contact ── */}
                <section className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-semibold">{t("captureFormTitle")}</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug">{t("captureFormHint")}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <CapturePill label={t("fieldEmailRequired")} active locked />
                    <CapturePill label={t("fieldFirstNameRequired")} active={captureFirstName} onToggle={() => setCaptureFirstName(!captureFirstName)} />
                    <CapturePill label={t("fieldLastNameRequired")} active={captureLastName} onToggle={() => setCaptureLastName(!captureLastName)} />
                    <CapturePill label={t("fieldPhone")} active={capturePhone} onToggle={() => setCapturePhone(!capturePhone)} />
                    <CapturePill label={t("fieldCountry")} active={captureCountry} onToggle={() => setCaptureCountry(!captureCountry)} />
                  </div>
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
          <main ref={previewRef} className="flex-1 overflow-y-auto" style={{ backgroundColor: bgColor, fontFamily }}>
            <div className={`mx-auto transition-all duration-300 ${device === "mobile" ? "max-w-sm" : "w-full"}`}>

              {/* ── INTRO SECTION ── */}
              <div ref={introRef} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16 text-center">
                <div className="max-w-2xl w-full space-y-6">
                  {brandLogoUrl && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={brandLogoUrl} alt="" className="max-h-16 w-auto object-contain" />
                    </div>
                  )}
                  <RichTextEdit value={title} onChange={setTitle} singleLine className="text-3xl sm:text-5xl font-bold leading-tight" placeholder={t("previewTitlePh")} />
                  <RichTextEdit value={introduction} onChange={setIntroduction} className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto" placeholder={t("previewIntroPh")} />
                  <div className="flex justify-center">
                    <div className="px-10 py-4 rounded-full text-white font-semibold text-lg shadow-lg transition-opacity hover:opacity-90" style={{ backgroundColor: pc }}>
                      <RichTextEdit
                        value={startButtonText}
                        onChange={setStartButtonText}
                        singleLine
                        className="text-white font-semibold text-center"
                        placeholder="Commencer le test"
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
                        </div>

                        <RichTextEdit value={q.question_text} onChange={(v) => updateQ(qi, v)} onGenderize={genderize} availableVars={personalizationVars} singleLine className="text-2xl sm:text-4xl font-bold leading-tight" placeholder={t("previewQuestionPh")} />

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
                              <textarea readOnly placeholder={t("previewFreeTextPh")} rows={5} className="w-full rounded-xl border-2 border-border px-4 py-3 text-base resize-none bg-muted/10" style={{ borderColor: `${pc}30` }} />
                              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                                <label className="inline-flex items-center gap-1">
                                  {t("textMaxLength")}
                                  <input type="number" min={50} max={5000} value={maxLength} onChange={(e) => updateQuestionConfig(qi, { maxLength: Math.min(5000, Math.max(50, Number(e.target.value) || 500)) })} className="w-20 border rounded px-1.5 py-0.5 text-center" />
                                </label>
                              </div>
                            </div>
                          );
                        })()}

                        {(qType === "multiple_choice" || qType === "image_choice") && (
                          <>
                            <div className={`grid gap-3 ${q.options.length >= 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                              {q.options.map((opt, oi) => (
                                <div key={oi} className="relative rounded-xl border-2 border-border hover:border-primary/30 transition-all group overflow-hidden">
                                  {qType === "image_choice" && (
                                    <div className="aspect-video bg-muted/30 flex items-center justify-center">
                                      {opt.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={opt.image_url} alt={opt.text} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-xs text-muted-foreground">{t("imageEmptyHint")}</span>
                                      )}
                                    </div>
                                  )}
                                  <div className="p-5 space-y-2">
                                    <RichTextEdit value={opt.text} onChange={(v) => updateOpt(qi, oi, v)} onGenderize={genderize} availableVars={personalizationVars} singleLine className="text-base font-medium" placeholder={t("previewOptionPh", { n: oi + 1 })} />
                                    {qType === "image_choice" && (
                                      <input
                                        type="url"
                                        value={opt.image_url ?? ""}
                                        onChange={(e) => {
                                          const url = e.target.value;
                                          setEditQuestions((p) => p.map((qq, i) => i !== qi ? qq : { ...qq, options: qq.options.map((o, j) => j === oi ? { ...o, image_url: url || undefined } : o) }));
                                        }}
                                        placeholder={t("imageUrlPlaceholder")}
                                        className="w-full text-xs border rounded px-2 py-1 bg-background"
                                      />
                                    )}
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

              {/* ── CAPTURE / LEAD FORM ── */}
              <div ref={captureRef} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16">
                <div className="max-w-lg w-full space-y-6">
                  <RichTextEdit value={captureHeading || t("previewCaptureHeadingDefault")} onChange={setCaptureHeading} singleLine className="text-2xl sm:text-4xl font-bold text-center" placeholder={t("previewCaptureHeadingPh")} />
                  <RichTextEdit value={captureSubtitle || t("previewCaptureSubtitleDefault")} onChange={setCaptureSubtitle} className="text-muted-foreground text-base text-center" placeholder={t("previewCaptureSubtitlePh")} />
                  <div className="space-y-3 max-w-md mx-auto">
                    {(captureFirstName || captureLastName) && <div className="grid grid-cols-2 gap-3">
                      {captureFirstName && <div><label className="text-sm text-muted-foreground">{t("previewCaptureFirstName")}</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                      {captureLastName && <div><label className="text-sm text-muted-foreground">{t("previewCaptureLastName")}</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                    </div>}
                    <div><label className="text-sm text-muted-foreground">Email</label><Input readOnly className="mt-1 bg-muted/20" /></div>
                    {capturePhone && <div><label className="text-sm text-muted-foreground">{t("previewCapturePhone")}</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                  </div>
                  <button className="w-full max-w-md mx-auto block px-8 py-4 rounded-full text-white font-semibold text-lg" style={{ backgroundColor: pc }}>{t("previewCaptureSubmit")}</button>
                </div>
              </div>

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
                    {t("surveyThanksHeading")}
                  </h2>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {t("surveyThanksBody")}
                  </p>

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
                  src={brandLogoUrl || "/tiquiz-logo.png"}
                  alt=""
                  className="max-h-10 w-auto object-contain mx-auto"
                />
                <p className="text-xs text-muted-foreground/50">
                  {t("previewPoweredByLink")}
                </p>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* SHARE TAB */}
      {mainTab === "share" && (
        <div className="flex-1 overflow-y-auto p-6"><div className="max-w-3xl mx-auto space-y-4">
          {/* Custom URL slug */}
          <Card><CardContent className="pt-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4 text-primary" /> {t("shareTabCustomLink")}</h3>
            <p className="text-xs text-muted-foreground">{t("shareTabCustomLinkHint")}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg bg-muted/30 pl-3 pr-1 py-1 flex-1">
                <span className="text-sm text-muted-foreground font-mono whitespace-nowrap">
                  {typeof window !== "undefined" ? `${window.location.origin}/q/` : "/q/"}
                </span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={quizId}
                  className="flex-1 bg-transparent outline-none text-sm font-mono px-1 py-1"
                />
              </div>
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}</Button>
            </div>
            <div className="flex items-center gap-2">
              <Input value={publicUrl} readOnly className="font-mono text-sm bg-muted flex-1" />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>{copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</Button>
            </div>
            <pre className="text-xs font-mono bg-muted rounded-lg p-3 overflow-x-auto border mt-3">{`<iframe src="${publicUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;max-width:640px;margin:0 auto;display:block;"></iframe>`}</pre>
          </CardContent></Card>

          {/* Share networks */}
          <Card><CardContent className="pt-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> {t("shareTabNetworks")}</h3>
            <p className="text-xs text-muted-foreground">{t("shareTabNetworksHint")}</p>
            <div className="flex flex-wrap gap-2">
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

          {/* SEO / Open Graph description */}
          <Card><CardContent className="pt-6 space-y-3">
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
                placeholder="https://monsite.com"
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
            <SurveyTrends
              questions={editQuestions}
              leads={leads.map((l) => ({
                id: l.id,
                email: l.email,
                first_name: l.first_name,
                answers: l.answers,
                created_at: l.created_at,
              }))}
            />
          </div>
        </div>
      )}
    </div>
   </SioTagsProvider>
  );
}
