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
  ArrowLeft, ArrowUp, Copy, Eye, CheckCircle, Share2,
  Loader2, Plus, Trash2, Monitor, Smartphone, Pencil, X, Save, GripVertical,
  Gift, Sparkles,
} from "lucide-react";
import QuizResultsAnalytics from "@/components/quiz/QuizResultsAnalytics";
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
import { interpolateText } from "@/lib/quizPersonalization";

/** Demo first name used when rendering placeholders in the editor preview, so
 *  the creator sees what a real visitor would see ("Bonjour Alex" rather than
 *  the literal "Bonjour {name}"). The raw template is preserved in the edit
 *  buffer — only the display layer is substituted.
 *  Choice: short, gender-neutral, works in fr/en/es/it/pt/ar without sounding off. */
const PREVIEW_DEMO_NAME = "Alex";

/** Strip `{name}` (and other personalization placeholders) cleanly from a
 *  label so the sidebar shows a usable preview of long titles like
 *  "Bonjour {name}, voici ton résultat" → "Bonjour, voici ton résultat".
 *  Empty-string interpolation collapses the trailing comma+space too. */
function cleanPlaceholdersForLabel(text: string | null | undefined): string {
  return interpolateText(text, { name: "", gender: "x" });
}
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useTranslations, useLocale } from "next-intl";
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
type QuizOption = { text: string; result_index: number };
type QuizQuestion = { id?: string; question_text: string; options: QuizOption[]; sort_order: number };
type QuizResult = { id?: string; title: string; description: string | null; insight: string | null; projection: string | null; cta_text: string | null; cta_url: string | null; sio_tag_name: string | null; sio_course_id: string | null; sio_community_id: string | null; sort_order: number };
type QuizLead = { id: string; email: string; first_name: string | null; last_name: string | null; phone: string | null; country: string | null; result_id: string | null; result_title: string | null; answers: { question_index: number; option_index: number }[] | null; has_shared: boolean; bonus_unlocked: boolean; created_at: string };
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
type ProfileBrand = { brand_font: string | null; brand_color_primary: string | null; brand_logo_url: string | null; plan: string | null; privacy_url: string | null };
interface QuizDetailClientProps {
  quizId: string;
  /**
   * Embed-mode session token. When supplied, all /api/quiz/* calls
   * append ?embed=<token> so the server uses its anonymous-quiz
   * auth path. Triggers a few UX changes too:
   *  - SIO sections are hidden (no tags, no API key picker, no
   *    course/community fields)
   *  - the user's profile is not fetched (no auth)
   *  - status changes are forbidden server-side; the publish toggle
   *    becomes a 'Débloquer Tiquiz' CTA that postMessages the parent
   */
  embedSessionToken?: string;
}

// Wrap a /api/quiz/* URL with the embed token when it's set so the
// route handler picks the anonymous-quiz auth path.
function withEmbedToken(url: string, token?: string): string {
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}embed=${encodeURIComponent(token)}`;
}

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
export default function QuizDetailClient({ quizId, embedSessionToken }: QuizDetailClientProps) {
  // Single source of truth for "is this an anonymous embed render?".
  // Used to short-circuit profile fetches, hide SIO surfaces, and
  // repurpose the publish CTA into the paywall trigger.
  const isEmbed = !!embedSessionToken;
  const t = useTranslations("quizEditor");
  // The UI locale of the page (next-intl). Distinct from the quiz's
  // own `locale` state below, which represents the quiz content
  // language. We only need this to pick a CTA label in embed mode.
  const uiLocale = useLocale();
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
  const [viralityEnabled, setViralityEnabled] = useState(false);
  const [bonusDescription, setBonusDescription] = useState("");
  const [bonusImageUrl, setBonusImageUrl] = useState<string | null>(null);
  const [uploadingBonusImage, setUploadingBonusImage] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [locale, setLocale] = useState("");
  const [sioShareTagName, setSioShareTagName] = useState("");
  const [status, setStatus] = useState("draft");
  const [editQuestions, setEditQuestions] = useState<QuizQuestion[]>([]);
  const [editResults, setEditResults] = useState<QuizResult[]>([]);

  // Editor state
  const [mainTab, setMainTab] = useState<"create" | "share" | "results">("create");
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
  const bonusImageInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileBrand | null>(null);
  const isPaidPlan = (profile?.plan ?? "free") !== "free";
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Section refs for scroll-to
  const introRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captureRef = useRef<HTMLDivElement>(null);
  const bonusRef = useRef<HTMLDivElement>(null);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  // Back-to-top FAB: the editor's preview canvas can run dozens of screens
  // long once a creator stacks 10+ questions and 4+ result blocks. The
  // browser scrollbar is hard to spot on a long quiz (Marie's feedback #1).
  // We watch scrollTop on the preview container and surface a small floating
  // button once the creator has scrolled past the first viewport.
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

  const scrollToSection = (id: string) => {
    let el: HTMLDivElement | null = null;
    if (id === "intro") el = introRef.current;
    else if (id === "capture") el = captureRef.current;
    else if (id === "bonus") el = bonusRef.current;
    else if (id.startsWith("q-")) el = questionRefs.current[parseInt(id.split("-")[1])];
    else if (id.startsWith("r-")) el = resultRefs.current[parseInt(id.split("-")[1])];
    if (el && previewRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Fetch quiz + profile in parallel (profile branding is the default fallback)
  const fetchQuiz = useCallback(async () => {
    try {
      // In embed mode there's no logged-in user yet, so the profile
      // fetch would 401 and pollute the console. We skip it and let
      // the brand-resolver fall through to its hard-coded defaults.
      const [quizRes, profileRes] = await Promise.all([
        fetch(withEmbedToken(`/api/quiz/${quizId}`, embedSessionToken)).then((r) => r.json()),
        isEmbed
          ? Promise.resolve(null)
          : fetch(`/api/profile`).then((r) => r.json()).catch(() => null),
      ]);
      if (!quizRes?.ok || !quizRes.quiz) {
        toast.error(t("errQuizNotFound"));
        if (!isEmbed) router.push("/dashboard");
        return;
      }
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
      setViralityEnabled(q.virality_enabled); setBonusDescription(q.bonus_description ?? "");
      setBonusImageUrl(q.bonus_image_url ?? null);
      setShareMessage(q.share_message ?? ""); setLocale(q.locale ?? "");
      setSioShareTagName(q.sio_share_tag_name ?? ""); setStatus(q.status);
      setEditQuestions(q.questions); setEditResults(q.results);
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

  // Display-only substitution for the preview canvas: replace {name} / {m|f|x}
  // with a demo value so the creator sees what real visitors will see. The raw
  // template (with placeholders) is preserved in the edit buffer — clicking a
  // field still shows the {name} text for editing. Marie's feedback (2026-04):
  // "Je trouve dommage de voir ce type de titre en aperçu du quiz".
  const previewInterpolate = useCallback(
    (text: string) => interpolateText(text, { name: PREVIEW_DEMO_NAME, gender: "x" }),
    [],
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
    editResults.forEach((_, ri) => {
      (["title", "description", "insight", "projection", "cta_text"] as const).forEach((key) => {
        fields.push({
          get: () => (editResults[ri] as Record<string, unknown>)?.[key] as string | null | undefined,
          set: (v) => setEditResults((p) => p.map((r, i) => i === ri ? { ...r, [key]: v } : r)),
        });
      });
    });

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

  // Bonus image upload: mockup / image / GIF shown on the share step so the
  // visitor understands what they unlock before sharing.
  async function handleBonusImageUpload(file: File) {
    if (!file.type.startsWith("image/")) { toast.error(t("errImageOnly")); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t("errImageTooLarge10")); return; }
    setUploadingBonusImage(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t("errNotSignedIn")); return; }
      const ext = file.name.split(".").pop() ?? "png";
      const path = `bonus/${user.id}/${quizId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      setBonusImageUrl(urlData.publicUrl);
      toast.success(t("bonusImageUploaded"));
    } catch (err) {
      console.error("Bonus image upload failed:", err);
      const msg = err instanceof Error ? err.message : t("errUnknown");
      toast.error(t("errImageUpload", { msg }));
    } finally {
      setUploadingBonusImage(false);
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
      const res = await fetch(withEmbedToken(`/api/quiz/${quizId}`, embedSessionToken), {
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
          virality_enabled: viralityEnabled, bonus_description: bonusDescription,
          bonus_image_url: bonusImageUrl,
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
            })),
            sort_order: i,
          })),
          results: editResults.map((r, i) => ({ title: r.title, description: r.description, insight: r.insight, projection: r.projection, cta_text: r.cta_text, cta_url: r.cta_url, sio_tag_name: r.sio_tag_name || null, sio_course_id: r.sio_course_id || null, sio_community_id: r.sio_community_id || null, sort_order: i })),
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

  // Publishing a project is the strongest "I made it" moment in the app —
  // confetti makes it feel like a win, not a checkbox flip. Deactivation
  // stays silent (toast only) so it doesn't celebrate downgrades.
  const handleToggleStatus = async () => {
    const ns = status === "active" ? "draft" : "active";
    setStatus(ns);
    try {
      // status changes are forbidden in embed mode; the bridge to the
      // checkout is wired through the publish CTA, not this toggle.
      await fetch(withEmbedToken(`/api/quiz/${quizId}`, embedSessionToken), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) });
      toast.success(ns === "active" ? t("quizPublished") : t("quizDeactivated"));
      if (ns === "active") {
        const { celebrate } = await import("@/lib/celebrate");
        celebrate({ intensity: "huge" });
      }
    } catch { setStatus(status); }
  };

  // Public URL — prefer custom slug when set, fall back to UUID. In
  // embed mode the quiz is still draft + anonymous, so we append the
  // embed token so /q/[id] renders it via its own preview gate.
  const publicSegment = slug.trim() ? sanitizeSlug(slug) ?? quizId : quizId;
  const previewSuffix = isEmbed && embedSessionToken ? `?embed=${encodeURIComponent(embedSessionToken)}` : "";
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/q/${publicSegment}${previewSuffix}`
    : `/q/${publicSegment}${previewSuffix}`;
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
  const addQuestion = () => setEditQuestions(p => [...p, { question_text: "", options: [{ text: "", result_index: 0 }, { text: "", result_index: 1 }, { text: "", result_index: 2 }, { text: "", result_index: 0 }], sort_order: p.length }]);
  const removeQuestion = (i: number) => setEditQuestions(p => p.filter((_, qi) => qi !== i));
  const updateR = (i: number, field: string, v: unknown) => setEditResults(p => p.map((r, ri) => ri === i ? { ...r, [field]: v } : r));
  const addResult = () => setEditResults(p => [...p, { title: "", description: null, insight: null, projection: null, cta_text: null, cta_url: null, sio_tag_name: null, sio_course_id: null, sio_community_id: null, sort_order: p.length }]);
  const removeResult = (i: number) => { setEditResults(p => p.filter((_, ri) => ri !== i)); setEditQuestions(p => p.map(q => ({ ...q, options: q.options.map(o => ({ ...o, result_index: o.result_index > i ? o.result_index - 1 : o.result_index === i ? 0 : o.result_index })) }))); };
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
          {!isEmbed && (
            <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link></Button>
          )}
          {/* The title is stored as rich HTML (RichTextEdit on the
              preview canvas drives it). Plain-text rendering here
              would surface the raw markup — strip tags before
              showing it in the chrome. */}
          <span className="font-semibold text-sm truncate max-w-[200px]">
            {(title || "").replace(/<[^>]*>/g, "").trim() || t("titleFallback")}
          </span>
        </div>
        <nav className="hidden sm:flex items-center bg-muted rounded-lg p-0.5">
          {(["create","share","results"] as const).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === tab ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tab === "create" ? <><Pencil className="w-3.5 h-3.5 inline mr-1.5" />{t("tabCreate")}</> : tab === "share" ? <><Share2 className="w-3.5 h-3.5 inline mr-1.5" />{t("tabShare")}</> : <><Eye className="w-3.5 h-3.5 inline mr-1.5" />{t("tabResults")}</>}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* Readiness ring — passive nudge showing how close the project
              is to publishable. Hidden once the quiz is already
              published: the score is a pre-publish gauge, not a quality
              critic, so keeping it visible after the fact reads as
              "your published work is incomplete" — which is misleading
              when the user has consciously chosen to publish without
              100 % of the optional checks (e.g. privacy URL omitted on
              purpose). */}
          {status !== "active" && (() => {
            const r = computeReadiness({
              mode: "quiz",
              title,
              introduction,
              cta_text: ctaText,
              cta_url: ctaUrl,
              questions: editQuestions,
              results: editResults,
              // Match runtime behaviour: the public quiz route falls
              // back to the profile-level privacy URL when the quiz
              // doesn't have its own. Mirror that here so the readiness
              // check doesn't flag a missing field that the published
              // page actually has.
              privacy_url: privacyUrl || profile?.privacy_url || "",
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
          {isEmbed && (
            // 'Aperçu' button: opens the public quiz player in a new
            // tab using the embed-preview gate (?embed=token bypasses
            // the status='active' filter for this token's quiz only).
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(publicUrl, "_blank", "noopener")}
            >
              <Eye className="w-4 h-4 mr-1" />
              {uiLocale === "en" ? "Preview" : "Aperçu"}
            </Button>
          )}
          {isEmbed ? (
            // Paywall trigger: hand off to the iframe parent so the
            // bridge script (public/embed/bridge.js) navigates the
            // host page to its checkout anchor with the session
            // token appended.
            <Button
              size="sm"
              onClick={() => {
                try { window.parent.postMessage({ type: "tiquiz-embed-checkout", session_token: embedSessionToken }, "*"); }
                catch { /* sandboxed iframe — host page handles fallback */ }
              }}
            >
              {uiLocale === "en" ? "Unlock Tiquiz →" : "Débloquer Tiquiz →"}
            </Button>
          ) : (
            <Button size="sm" onClick={handleToggleStatus}>{status === "active" ? t("deactivate") : t("publish")}</Button>
          )}
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
                        label={(() => {
                          // Strip placeholders ({name}, {m|f|x}) before truncating so the
                          // sidebar shows readable preview text rather than raw template
                          // syntax (Marie's feedback #5, 2026-04).
                          const plain = cleanPlaceholdersForLabel(q.question_text).replace(/<[^>]*>/g, "").trim();
                          return plain ? plain.slice(0, 35) + (plain.length > 35 ? "…" : "") : t("sidebarEmptyQuestion");
                        })()}
                        onClick={() => scrollToSection(`q-${i}`)}
                        onRemove={() => removeQuestion(i)}
                        canDelete={editQuestions.length > 1}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {/* Accès aux résultats */}
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pt-2">{t("sidebarResultsAccess")}</div>
                <button onClick={() => scrollToSection("capture")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors">
                  <span className="text-xs text-muted-foreground mr-2">1</span>{t("sidebarLeadCapture")}
                </button>
                {viralityEnabled && (
                  <button onClick={() => scrollToSection("bonus")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors">
                    <span className="text-xs text-muted-foreground mr-2">2</span>{t("sidebarShareStep")}
                  </button>
                )}
                {/* Résultats */}
                <div className="flex items-center justify-between pt-2"><span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t("sidebarResults")}</span><button onClick={addResult} className="text-primary hover:bg-primary/10 rounded p-0.5"><Plus className="w-4 h-4" /></button></div>
                {editResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-1 group">
                    <button onClick={() => scrollToSection(`r-${i}`)} className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors truncate">
                      <span className="text-xs text-muted-foreground mr-2">{i+1}</span>{cleanPlaceholdersForLabel(r.title).replace(/<[^>]*>/g, "").trim() || t("sidebarEmptyResult")}
                    </button>
                    {editResults.length > 1 && <button onClick={() => removeResult(i)} className="opacity-0 group-hover:opacity-100 text-destructive p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></button>}
                  </div>
                ))}
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

                {/* ── Options ── */}
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">{t("optionsTitle")}</h3>
                  <SettingsToggle
                    label={t("optionShareRequest")}
                    hint={t("optionShareRequestHint")}
                    checked={viralityEnabled}
                    onChange={v => setViralityEnabled(v)}
                  />
                </section>

                {viralityEnabled && (
                  <section className="space-y-3 bg-muted/30 border rounded-xl p-3">
                    <div>
                      <h4 className="text-xs font-semibold">{t("bonusTitle")}</h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">{t("bonusHint")}</p>
                    </div>
                    <Input value={bonusDescription} onChange={e => setBonusDescription(e.target.value)} placeholder={t("bonusPlaceholder")} className="text-xs" />

                    <div>
                      <Label className="text-[11px] font-semibold">{t("bonusVisualLabel")}</Label>
                      <p className="text-[10px] text-muted-foreground mb-1.5">{t("bonusVisualHint")}</p>
                      {bonusImageUrl ? (
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={bonusImageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border" />
                          <div className="flex-1 space-y-1">
                            <button
                              type="button"
                              onClick={() => bonusImageInputRef.current?.click()}
                              disabled={uploadingBonusImage}
                              className="text-xs text-primary hover:underline block"
                            >
                              {uploadingBonusImage ? t("uploading") : t("replace")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setBonusImageUrl(null)}
                              className="text-xs text-destructive hover:underline block"
                            >
                              {t("remove")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => bonusImageInputRef.current?.click()}
                          disabled={uploadingBonusImage}
                          className="w-full border-2 border-dashed rounded-lg p-3 text-xs text-muted-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          {uploadingBonusImage ? t("uploading") : t("addBonusVisual")}
                        </button>
                      )}
                      <input
                        ref={bonusImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBonusImageUpload(f); e.target.value = ""; }}
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold">{t("shareMessageLabel")}</Label>
                      <p className="text-[10px] text-muted-foreground mb-1.5">{t("shareMessageHint")}</p>
                      <Textarea value={shareMessage} onChange={e => setShareMessage(e.target.value)} placeholder={t("shareMessageDefault", { title: title || "…" })} className="text-xs" rows={2} />
                    </div>

                    {/* SIO tag is a logged-in-only feature — the
                        embed visitor configures tags later in their
                        account, after the import. */}
                    {!isEmbed && (
                      <div>
                        <Label className="text-[11px] font-semibold">{t("shareTagLabel")}</Label>
                        <p className="text-[10px] text-muted-foreground mb-1.5">{t("shareTagHint")}</p>
                        <SioTagPicker value={sioShareTagName} onChange={setSioShareTagName} />
                      </div>
                    )}
                  </section>
                )}

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

              {/* ── QUESTIONS — one full page per question ── */}
              {editQuestions.map((q, qi) => {
                const progress = ((qi + 1) / editQuestions.length) * 100;
                return (
                  <div key={qi} ref={el => { questionRefs.current[qi] = el; }} className="min-h-screen flex flex-col px-6 sm:px-12 py-8">
                    {/* Progress bar */}
                    <div className="w-full max-w-2xl mx-auto mb-8">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: pc }} /></div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="max-w-2xl w-full space-y-8">
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: pc }}>{t("previewQuestionsCounter", { n: qi + 1, total: editQuestions.length })}</p>
                        <RichTextEdit value={q.question_text} onChange={(v) => updateQ(qi, v)} onGenderize={genderize} availableVars={personalizationVars} previewTransform={previewInterpolate} singleLine className="text-2xl sm:text-4xl font-bold leading-tight" placeholder={t("previewQuestionPh")} />
                        <div className={`grid gap-3 ${q.options.length >= 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="relative p-5 rounded-xl border-2 border-border hover:border-primary/30 transition-all group">
                              <RichTextEdit value={opt.text} onChange={(v) => updateOpt(qi, oi, v)} onGenderize={genderize} availableVars={personalizationVars} previewTransform={previewInterpolate} singleLine className="text-base font-medium" placeholder={t("previewOptionPh", { n: oi + 1 })} />
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs" style={{ color: `${pc}99` }}>{t("previewPointFor")}</span>
                                <select value={opt.result_index} onChange={(e) => updateOptResult(qi, oi, Number(e.target.value))} className="text-xs border rounded px-1.5 py-0.5 bg-background font-medium cursor-pointer" style={{ color: pc }}>
                                  {editResults.map((_, ri) => <option key={ri} value={ri}>{t("previewResult", { n: ri + 1 })}</option>)}
                                </select>
                              </div>
                              {q.options.length > 2 && <button onClick={() => removeOpt(qi, oi)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5"><X className="w-3.5 h-3.5" /></button>}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => addOpt(qi)} className="text-xs hover:underline" style={{ color: pc }}>{t("previewAddOption")}</button>
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

              {/* ── BONUS / SHARE STEP (only if viralityEnabled) ──
                  Inline-editable: click the image slot to upload, click the
                  description or share message to edit. Advanced options
                  (networks, Systeme.io tag, consent) remain in the sidebar
                  Share tab. */}
              {viralityEnabled && (
                <div ref={bonusRef} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16">
                  <div className="max-w-lg w-full space-y-6 text-center">
                    <div className="flex justify-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pc}15`, color: pc }}>
                        <Gift className="w-7 h-7" />
                      </div>
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-bold leading-tight">
                      {t("previewBonusHeadingDefault")}
                    </h2>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      {t("previewBonusIntro")}
                    </p>

                    {/* Bonus card — image + description are inline-editable */}
                    <div className="rounded-xl border p-5 bg-muted/20 space-y-4 text-left">
                      <button
                        type="button"
                        onClick={() => bonusImageInputRef.current?.click()}
                        disabled={uploadingBonusImage}
                        className="group w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors overflow-hidden relative"
                        title={bonusImageUrl ? t("bonusImageClickHint") : undefined}
                      >
                        {bonusImageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={bonusImageUrl} alt={t("bonusImageAlt")} className="w-full max-h-56 object-contain bg-white" />
                            <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[10px] px-2 py-1 rounded">
                              {uploadingBonusImage ? t("uploading") : t("bonusImageClickHint")}
                            </span>
                          </>
                        ) : (
                          <div className="py-10 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                            <Plus className="w-5 h-5" />
                            <span className="text-xs font-medium">{uploadingBonusImage ? t("uploading") : t("addBonusVisual")}</span>
                          </div>
                        )}
                      </button>
                      <RichTextEdit
                        value={bonusDescription}
                        onChange={setBonusDescription}
                        onGenderize={genderize}
                        className="text-sm font-medium"
                        placeholder={t("previewBonusDescPh")}
                      />
                    </div>

                    {/* Pre-filled share message — inline editable */}
                    <div className="text-left space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("shareMessageLabel")}
                      </p>
                      <RichTextEdit
                        value={shareMessage}
                        onChange={setShareMessage}
                        onGenderize={genderize}
                        className="text-sm bg-background border rounded-lg"
                        placeholder={t("shareMessageDefault")}
                      />
                    </div>

                    {/* Share buttons mockup — reflect actual configured networks */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {shareNetworks.length > 0 ? t("previewBonusShareVia") : t("previewBonusNoNetworks")}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {shareNetworks.map((n) => (
                          <span key={n} className="px-4 py-2 rounded-full border text-xs font-medium capitalize" style={{ borderColor: `${pc}40`, color: pc }}>
                            {n}
                          </span>
                        ))}
                        <span className="px-4 py-2 rounded-full border text-xs font-medium inline-flex items-center gap-1.5" style={{ borderColor: `${pc}40`, color: pc }}>
                          <Copy className="w-3 h-3" /> {t("previewBonusCopyLink")}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground underline-offset-2 underline cursor-default">
                      {t("previewBonusContinueWithout")}
                    </p>
                  </div>
                </div>
              )}

              {/* ── RESULTS ── */}
              {editResults.map((r, ri) => (
                <div key={ri} ref={el => { resultRefs.current[ri] = el; }} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16">
                  <div className="max-w-2xl w-full space-y-6">
                    <RichTextEdit value={r.title} onChange={(v) => updateR(ri, "title", v)} onGenderize={genderize} availableVars={personalizationVars} previewTransform={previewInterpolate} singleLine className="text-3xl sm:text-5xl font-bold" style={{ color: pc }} placeholder={t("previewResultTitlePh")} />
                    <RichTextEdit value={r.description ?? ""} onChange={(v) => updateR(ri, "description", v || null)} onGenderize={genderize} availableVars={personalizationVars} previewTransform={previewInterpolate} className="text-muted-foreground text-lg leading-relaxed" placeholder={t("previewResultDescPh")} />
                    <div className="p-5 rounded-xl bg-muted/50 border">
                      <div className="mb-2">
                        <RichTextEdit
                          value={resultInsightHeading || t("previewResultInsightDefault")}
                          onChange={setResultInsightHeading}
                          singleLine
                          className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                          placeholder={t("previewResultInsightHeadingPh")}
                        />
                      </div>
                      <RichTextEdit value={r.insight ?? ""} onChange={(v) => updateR(ri, "insight", v || null)} onGenderize={genderize} availableVars={personalizationVars} previewTransform={previewInterpolate} className="text-sm leading-relaxed" placeholder={t("previewResultInsightPh")} />
                    </div>
                    <div className="p-5 rounded-xl border" style={{ backgroundColor: `${pc}08`, borderColor: `${pc}30` }}>
                      <div className="mb-2">
                        <RichTextEdit
                          value={resultProjectionHeading || t("previewResultProjectionDefault")}
                          onChange={setResultProjectionHeading}
                          singleLine
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: `${pc}99` }}
                          placeholder={t("previewResultProjectionHeadingPh")}
                        />
                      </div>
                      <RichTextEdit value={r.projection ?? ""} onChange={(v) => updateR(ri, "projection", v || null)} onGenderize={genderize} availableVars={personalizationVars} previewTransform={previewInterpolate} className="text-sm leading-relaxed" placeholder={t("previewResultProjectionPh")} />
                    </div>
                    <div className="space-y-2">
                      <button className="w-full px-8 py-4 rounded-full text-white font-semibold text-lg" style={{ backgroundColor: pc }}>
                        <RichTextEdit value={r.cta_text ?? ctaText ?? ""} onChange={(v) => updateR(ri, "cta_text", v || null)} onGenderize={genderize} availableVars={personalizationVars} previewTransform={previewInterpolate} singleLine className="text-white font-semibold text-center" placeholder={t("previewResultCtaPh")} />
                      </button>
                      <InlineEdit value={r.cta_url ?? ctaUrl ?? ""} onChange={(v) => updateR(ri, "cta_url", v || null)} className="text-xs text-muted-foreground text-center" placeholder={t("previewResultCtaUrlPh")} />
                    </div>
                    {/* Per-result SIO tag — same rationale as the
                        share tag above, hidden in the anonymous embed. */}
                    {!isEmbed && (
                      <div className="p-4 rounded-xl bg-muted/40 border border-dashed">
                        <div className="text-xs font-semibold text-foreground mb-1">{t("previewResultTagLabel")}</div>
                        <p className="text-[11px] text-muted-foreground mb-2">{t("previewResultTagHint", { title: r.title || t("previewResult", { n: ri + 1 }) })}</p>
                        <SioTagPicker value={r.sio_tag_name ?? ""} onChange={(v) => updateR(ri, "sio_tag_name", v || null)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

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

          {/* Back-to-top FAB. Anchored to the viewport bottom-right but only
              visible when the creator has scrolled the preview past one
              screen — keeps the editor uncluttered for short quizzes. */}
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

      {/* RESULTS TAB */}
      {mainTab === "results" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <QuizResultsAnalytics
              viewsCount={quiz.views_count}
              startsCount={quiz.starts_count}
              completionsCount={quiz.completions_count}
              sharesCount={quiz.shares_count}
              leads={leads}
              questions={editQuestions}
              results={editResults}
              onExportCSV={handleExportCSV}
            />
          </div>
        </div>
      )}
    </div>
   </SioTagsProvider>
  );
}
