"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Copy, Eye, Play, CheckCircle, Users, Share2, Download,
  RefreshCw, Loader2, Plus, Trash2, Monitor, Smartphone, Pencil,
  Palette, SlidersHorizontal, GripVertical, X, ChevronDown, Save,
} from "lucide-react";
import { toast } from "sonner";
import SioSelectors from "@/components/quiz/SioSelectors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuizOption = { text: string; result_index: number };

type QuizQuestion = {
  id?: string;
  question_text: string;
  options: QuizOption[];
  sort_order: number;
};

type QuizResult = {
  id?: string;
  title: string;
  description: string | null;
  insight: string | null;
  projection: string | null;
  cta_text: string | null;
  cta_url: string | null;
  sio_tag_name: string | null;
  sio_course_id: string | null;
  sio_community_id: string | null;
  sort_order: number;
};

type QuizLead = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  result_title: string | null;
  has_shared: boolean;
  bonus_unlocked: boolean;
  created_at: string;
};

type QuizData = {
  id: string;
  title: string;
  introduction: string | null;
  cta_text: string | null;
  cta_url: string | null;
  privacy_url: string | null;
  consent_text: string | null;
  capture_heading: string | null;
  capture_subtitle: string | null;
  capture_first_name: boolean | null;
  capture_last_name: boolean | null;
  capture_phone: boolean | null;
  capture_country: boolean | null;
  virality_enabled: boolean;
  bonus_description: string | null;
  share_message: string | null;
  locale: string | null;
  sio_share_tag_name: string | null;
  status: string;
  views_count: number;
  starts_count: number;
  completions_count: number;
  shares_count: number;
  questions: QuizQuestion[];
  results: QuizResult[];
};

interface QuizDetailClientProps { quizId: string; }

// ---------------------------------------------------------------------------
// InlineEdit — click-to-edit text in WYSIWYG preview
// ---------------------------------------------------------------------------

function InlineEdit({ value, onChange, multiline, className, placeholder, style }: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (editing) {
    const cls = `${className || ""} w-full bg-white/80 backdrop-blur border-2 border-primary/40 outline-none rounded-lg px-3 py-2`;
    return multiline ? (
      <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} value={value}
        onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)}
        className={`${cls} resize-none min-h-[80px]`} placeholder={placeholder} style={style} />
    ) : (
      <input ref={ref as React.RefObject<HTMLInputElement>} value={value}
        onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)}
        onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
        className={cls} placeholder={placeholder} style={style} />
    );
  }

  return (
    <div onClick={() => setEditing(true)} style={style}
      className={`${className || ""} cursor-text rounded-lg hover:ring-2 hover:ring-primary/20 hover:bg-white/10 px-3 py-1 transition-all group relative min-h-[1.5em]`}>
      {value || <span className="opacity-40 italic">{placeholder}</span>}
      <Pencil className="absolute top-1 right-1 w-3 h-3 text-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizDetailClient({ quizId }: QuizDetailClientProps) {
  const t = useTranslations("quizDetail");
  const tf = useTranslations("quizForm");
  const router = useRouter();

  // ---- Loading / data state ----
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [leads, setLeads] = useState<QuizLead[]>([]);

  // ---- Edit form state ----
  const [title, setTitle] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [consentText, setConsentText] = useState("");
  const [captureHeading, setCaptureHeading] = useState("");
  const [captureSubtitle, setCaptureSubtitle] = useState("");
  const [captureFirstName, setCaptureFirstName] = useState(false);
  const [captureLastName, setCaptureLastName] = useState(false);
  const [capturePhone, setCapturePhone] = useState(false);
  const [captureCountry, setCaptureCountry] = useState(false);
  const [viralityEnabled, setViralityEnabled] = useState(false);
  const [bonusDescription, setBonusDescription] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [locale, setLocale] = useState("");
  const [sioShareTagName, setSioShareTagName] = useState("");
  const [status, setStatus] = useState("draft");
  const [editQuestions, setEditQuestions] = useState<QuizQuestion[]>([]);
  const [editResults, setEditResults] = useState<QuizResult[]>([]);

  // ---- WYSIWYG editor state ----
  const [mainTab, setMainTab] = useState<"create" | "share" | "results">("create");
  const [leftTab, setLeftTab] = useState<"edition" | "design" | "settings">("edition");
  const [selectedSection, setSelectedSection] = useState("intro");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  // ---- Design state ----
  const [primaryColor, setPrimaryColor] = useState("#5B5FE2");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("Inter");

  // ---- Action state ----
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // ---- Fetch quiz data ----
  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz/${quizId}`);
      const json = await res.json();
      if (!json?.ok || !json.quiz) { toast.error("Quiz not found"); router.push("/dashboard"); return; }
      const q: QuizData = { ...json.quiz, questions: json.quiz.questions ?? [], results: json.quiz.results ?? [] };
      setQuiz(q); setLeads(json.leads ?? []);
      setTitle(q.title); setIntroduction(q.introduction ?? "");
      setCtaText(q.cta_text ?? ""); setCtaUrl(q.cta_url ?? "");
      setPrivacyUrl(q.privacy_url ?? ""); setConsentText(q.consent_text ?? "");
      setCaptureHeading(q.capture_heading ?? ""); setCaptureSubtitle(q.capture_subtitle ?? "");
      setCaptureFirstName(q.capture_first_name ?? false);
      setCaptureLastName(q.capture_last_name ?? false);
      setCapturePhone(q.capture_phone ?? false);
      setCaptureCountry(q.capture_country ?? false);
      setViralityEnabled(q.virality_enabled);
      setBonusDescription(q.bonus_description ?? "");
      setShareMessage(q.share_message ?? "");
      setLocale(q.locale ?? ""); setSioShareTagName(q.sio_share_tag_name ?? "");
      setStatus(q.status); setEditQuestions(q.questions); setEditResults(q.results);
    } catch { toast.error("Error loading quiz"); } finally { setLoading(false); }
  }, [quizId, router]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  // ---- Save quiz ----
  const handleSave = async () => {
    if (!title.trim()) { toast.error("Titre requis"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, introduction, cta_text: ctaText, cta_url: ctaUrl,
          privacy_url: privacyUrl || null, consent_text: consentText,
          capture_heading: captureHeading || null, capture_subtitle: captureSubtitle || null,
          capture_first_name: captureFirstName, capture_last_name: captureLastName,
          capture_phone: capturePhone, capture_country: captureCountry,
          virality_enabled: viralityEnabled, bonus_description: bonusDescription,
          share_message: shareMessage, locale: locale || null,
          sio_share_tag_name: sioShareTagName || null, status,
          questions: editQuestions.map((q, i) => ({ question_text: q.question_text, options: q.options, sort_order: i })),
          results: editResults.map((r, i) => ({
            title: r.title, description: r.description, insight: r.insight, projection: r.projection,
            cta_text: r.cta_text, cta_url: r.cta_url, sio_tag_name: r.sio_tag_name || null,
            sio_course_id: r.sio_course_id || null, sio_community_id: r.sio_community_id || null, sort_order: i,
          })),
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Error");
      toast.success("Sauvegardé !");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setSaving(false); }
  };

  // ---- Toggle status ----
  const handleToggleStatus = async () => {
    const ns = status === "active" ? "draft" : "active";
    setStatus(ns);
    try {
      await fetch(`/api/quiz/${quizId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) });
      toast.success(ns === "active" ? "Quiz activé" : "Quiz désactivé");
    } catch { setStatus(status); toast.error("Erreur"); }
  };

  // ---- Copy link ----
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${quizId}` : `/q/${quizId}`;
  const handleCopyLink = () => { navigator.clipboard.writeText(publicUrl).then(() => { setCopied(true); toast.success("Lien copié !"); setTimeout(() => setCopied(false), 2000); }); };

  // ---- Question helpers ----
  const updateQuestionText = (i: number, v: string) => setEditQuestions(p => p.map((q, qi) => qi === i ? { ...q, question_text: v } : q));
  const updateOptionText = (qi: number, oi: number, v: string) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text: v } : o) }));
  const updateOptionResult = (qi: number, oi: number, ri: number) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, result_index: ri } : o) }));
  const addOption = (qi: number) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: [...q.options, { text: "", result_index: 0 }] }));
  const removeOption = (qi: number, oi: number) => setEditQuestions(p => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.filter((_, j) => j !== oi) }));
  const addQuestion = () => { setEditQuestions(p => [...p, { question_text: "", options: [{ text: "", result_index: 0 }, { text: "", result_index: 1 }, { text: "", result_index: 2 }, { text: "", result_index: 0 }], sort_order: p.length }]); };
  const removeQuestion = (i: number) => setEditQuestions(p => p.filter((_, qi) => qi !== i));

  // ---- Result helpers ----
  const updateResultField = (i: number, field: string, v: unknown) => setEditResults(p => p.map((r, ri) => ri === i ? { ...r, [field]: v } : r));
  const addResult = () => setEditResults(p => [...p, { title: "", description: null, insight: null, projection: null, cta_text: null, cta_url: null, sio_tag_name: null, sio_course_id: null, sio_community_id: null, sort_order: p.length }]);
  const removeResult = (i: number) => { setEditResults(p => p.filter((_, ri) => ri !== i)); setEditQuestions(p => p.map(q => ({ ...q, options: q.options.map(o => ({ ...o, result_index: o.result_index > i ? o.result_index - 1 : o.result_index === i ? 0 : o.result_index })) }))); };

  // ---- Export CSV ----
  const handleExportCSV = () => {
    if (!leads.length) return;
    const headers = ["Email","Prénom","Nom","Téléphone","Pays","Résultat","Date","Partagé","Bonus"];
    const rows = leads.map(l => [l.email, l.first_name ?? "", l.last_name ?? "", l.phone ?? "", l.country ?? "", l.result_title ?? "", l.created_at ? new Date(l.created_at).toLocaleDateString() : "", l.has_shared ? "Oui" : "Non", l.bonus_unlocked ? "Oui" : "Non"]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `quiz-leads-${quizId}.csv`; a.click();
  };

  // ---- Render WYSIWYG section ----
  const renderWysiwygSection = () => {
    const pc = primaryColor;
    const maxW = device === "mobile" ? "max-w-sm" : "max-w-2xl";

    // INTRO
    if (selectedSection === "intro") return (
      <div className={`${maxW} w-full mx-auto space-y-6 text-center py-12 px-6`}>
        <InlineEdit value={title} onChange={setTitle} className="text-3xl sm:text-4xl font-bold leading-tight" placeholder="Titre du quiz…" />
        <InlineEdit value={introduction} onChange={setIntroduction} multiline className="text-lg text-muted-foreground leading-relaxed" placeholder="Introduction du quiz…" />
        <p className="text-sm text-muted-foreground">{editQuestions.length} questions — ~{Math.max(1, Math.ceil(editQuestions.length * 0.5))} min</p>
        <button className="px-10 py-4 rounded-full text-white font-semibold text-lg shadow-lg mx-auto block" style={{ backgroundColor: pc }}>
          Commencer le test
        </button>
      </div>
    );

    // QUESTION
    if (selectedSection.startsWith("q-")) {
      const qi = parseInt(selectedSection.split("-")[1]);
      const q = editQuestions[qi];
      if (!q) return null;
      const progress = ((qi + 1) / editQuestions.length) * 100;
      return (
        <div className={`${maxW} w-full mx-auto space-y-6 py-12 px-6`}>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: pc }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: pc }}>Questions {qi + 1}/{editQuestions.length}</p>
          <InlineEdit value={q.question_text} onChange={(v) => updateQuestionText(qi, v)} className="text-2xl sm:text-3xl font-bold leading-tight" placeholder="Texte de la question…" />
          <div className={`grid gap-3 ${q.options.length >= 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            {q.options.map((opt, oi) => (
              <div key={oi} className="relative p-4 rounded-xl border-2 border-border hover:border-primary/30 transition-all group">
                <InlineEdit value={opt.text} onChange={(v) => updateOptionText(qi, oi, v)} className="text-sm font-medium" placeholder={`Option ${oi + 1}…`} />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-primary/60">+1 point pour le</span>
                  <select value={opt.result_index} onChange={(e) => updateOptionResult(qi, oi, Number(e.target.value))}
                    className="text-xs border rounded px-1.5 py-0.5 bg-background text-primary font-medium cursor-pointer">
                    {editResults.map((r, ri) => <option key={ri} value={ri}>Résultat {ri + 1}</option>)}
                  </select>
                </div>
                {q.options.length > 2 && (
                  <button onClick={() => removeOption(qi, oi)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => addOption(qi)} className="text-xs text-primary hover:underline">+ Ajouter une option</button>
          <div className="text-center pt-4">
            <button className="px-8 py-3 rounded-full text-white font-semibold" style={{ backgroundColor: pc }}>Suivant</button>
          </div>
        </div>
      );
    }

    // CAPTURE
    if (selectedSection === "capture") return (
      <div className={`${maxW} w-full mx-auto space-y-6 text-center py-12 px-6`}>
        <InlineEdit value={captureHeading || "Vos résultats sont prêts"} onChange={setCaptureHeading} className="text-2xl sm:text-3xl font-bold" placeholder="Titre de la capture…" />
        <InlineEdit value={captureSubtitle || "Pour accéder aux résultats, veuillez laisser vos coordonnées."} onChange={setCaptureSubtitle} className="text-muted-foreground" placeholder="Sous-titre…" />
        <div className="max-w-md mx-auto space-y-3 text-left">
          {(captureFirstName || captureLastName) && (
            <div className="grid grid-cols-2 gap-3">
              {captureFirstName && <div className="space-y-1"><label className="text-sm text-muted-foreground">Prénom</label><Input readOnly className="bg-muted/30" /></div>}
              {captureLastName && <div className="space-y-1"><label className="text-sm text-muted-foreground">Nom</label><Input readOnly className="bg-muted/30" /></div>}
            </div>
          )}
          <div className="space-y-1"><label className="text-sm text-muted-foreground">Email</label><Input readOnly className="bg-muted/30" /></div>
          {capturePhone && <div className="space-y-1"><label className="text-sm text-muted-foreground">Téléphone (optional)</label><Input readOnly className="bg-muted/30" /></div>}
          {captureCountry && <div className="space-y-1"><label className="text-sm text-muted-foreground">Pays</label><Input readOnly className="bg-muted/30" /></div>}
        </div>
        <button className="px-10 py-4 rounded-full text-white font-semibold text-lg shadow-lg mx-auto block mt-6" style={{ backgroundColor: pc }}>
          Accéder aux résultats
        </button>
      </div>
    );

    // RESULT
    if (selectedSection.startsWith("r-")) {
      const ri = parseInt(selectedSection.split("-")[1]);
      const r = editResults[ri];
      if (!r) return null;
      return (
        <div className={`${maxW} w-full mx-auto space-y-6 py-12 px-6`}>
          <InlineEdit value={r.title} onChange={(v) => updateResultField(ri, "title", v)}
            className="text-2xl sm:text-3xl font-bold" style={{ color: pc }} placeholder="Titre du résultat…" />
          <InlineEdit value={r.description ?? ""} onChange={(v) => updateResultField(ri, "description", v || null)}
            multiline className="text-muted-foreground text-base leading-relaxed" placeholder="Description…" />
          {/* Insight */}
          <div className="p-4 rounded-xl bg-muted/50 border">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Prise de conscience</p>
            <InlineEdit value={r.insight ?? ""} onChange={(v) => updateResultField(ri, "insight", v || null)}
              multiline className="text-sm leading-relaxed" placeholder="Insight…" />
          </div>
          {/* Projection */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: `${pc}08`, borderColor: `${pc}30` }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: `${pc}99` }}>Et si...</p>
            <InlineEdit value={r.projection ?? ""} onChange={(v) => updateResultField(ri, "projection", v || null)}
              multiline className="text-sm leading-relaxed" placeholder="Projection motivante…" />
          </div>
          {/* CTA */}
          <div className="space-y-2">
            <InlineEdit value={r.cta_text ?? ""} onChange={(v) => updateResultField(ri, "cta_text", v || null)}
              className="inline-block px-8 py-3 rounded-full text-white font-semibold text-center w-full"
              style={{ backgroundColor: pc }} placeholder="Texte du CTA…" />
            <InlineEdit value={r.cta_url ?? ""} onChange={(v) => updateResultField(ri, "cta_url", v || null)}
              className="text-xs text-muted-foreground" placeholder="URL du CTA (https://…)" />
          </div>
          {/* SIO selectors */}
          <div className="pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-3">Intégrations Systeme.io</p>
            <SioSelectors
              tagValue={r.sio_tag_name ?? ""} courseValue={r.sio_course_id ?? ""} communityValue={r.sio_community_id ?? ""}
              onTagChange={(v) => updateResultField(ri, "sio_tag_name", v || null)}
              onCourseChange={(v) => updateResultField(ri, "sio_course_id", v || null)}
              onCommunityChange={(v) => updateResultField(ri, "sio_community_id", v || null)}
            />
          </div>
        </div>
      );
    }
    return null;
  };

  // ---- Loading state ----
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!quiz) return null;

  // ---- RENDER ----
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ===== TOP BAR ===== */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link></Button>
          <span className="font-semibold text-sm truncate max-w-[200px]">{title || "Mon quiz"}</span>
          <Badge variant={status === "active" ? "default" : "secondary"} className={status === "active" ? "bg-green-100 text-green-700" : ""}>
            {status === "active" ? "Actif" : "Brouillon"}
          </Badge>
        </div>
        <nav className="hidden sm:flex items-center bg-muted rounded-lg p-0.5">
          {(["create", "share", "results"] as const).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {tab === "create" ? "Créer" : tab === "share" ? "Partager" : "Résultats"}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md ${device === "desktop" ? "bg-background shadow-sm" : ""}`}><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md ${device === "mobile" ? "bg-background shadow-sm" : ""}`}><Smartphone className="w-4 h-4" /></button>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            {saving ? "…" : "Enregistrer"}
          </Button>
          <Button size="sm" variant={status === "active" ? "outline" : "default"} onClick={handleToggleStatus}>
            {status === "active" ? "Désactiver" : "Publier"}
          </Button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      {mainTab === "create" && (
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside className="w-64 border-r bg-background flex flex-col shrink-0 overflow-hidden">
            {/* Sub-tabs */}
            <div className="flex border-b">
              {(["edition", "design", "settings"] as const).map(tab => (
                <button key={tab} onClick={() => setLeftTab(tab)}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${leftTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab === "edition" ? "Édition" : tab === "design" ? "Design" : "Paramètres"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* EDITION TAB */}
              {leftTab === "edition" && (
                <>
                  {/* Intro */}
                  <button onClick={() => setSelectedSection("intro")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedSection === "intro" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                    Introduction
                  </button>
                  {/* Questions */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Questions</span>
                      <button onClick={addQuestion} className="text-primary hover:bg-primary/10 rounded p-0.5"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    {editQuestions.map((q, i) => (
                      <div key={i} className="flex items-center gap-1 group">
                        <button onClick={() => setSelectedSection(`q-${i}`)}
                          className={`flex-1 text-left px-3 py-1.5 rounded-lg text-sm transition-colors truncate ${selectedSection === `q-${i}` ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                          <span className="text-xs text-muted-foreground mr-1.5">{i + 1}</span>
                          {q.question_text ? q.question_text.slice(0, 30) + (q.question_text.length > 30 ? "…" : "") : "Question vide"}
                        </button>
                        {editQuestions.length > 1 && (
                          <button onClick={() => removeQuestion(i)} className="opacity-0 group-hover:opacity-100 text-destructive p-0.5 rounded hover:bg-destructive/10">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Capture */}
                  <button onClick={() => setSelectedSection("capture")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedSection === "capture" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                    Formulaire de capture
                  </button>
                  {/* Results */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Résultats</span>
                      <button onClick={addResult} className="text-primary hover:bg-primary/10 rounded p-0.5"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    {editResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-1 group">
                        <button onClick={() => setSelectedSection(`r-${i}`)}
                          className={`flex-1 text-left px-3 py-1.5 rounded-lg text-sm transition-colors truncate ${selectedSection === `r-${i}` ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                          <span className="text-xs text-muted-foreground mr-1.5">{i + 1}</span>
                          {r.title || "Résultat vide"}
                        </button>
                        {editResults.length > 1 && (
                          <button onClick={() => removeResult(i)} className="opacity-0 group-hover:opacity-100 text-destructive p-0.5 rounded hover:bg-destructive/10">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* DESIGN TAB */}
              {leftTab === "design" && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs">Police d&apos;écriture</Label>
                    <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                      className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-background">
                      <option value="Inter">Inter</option><option value="Poppins">Poppins</option>
                      <option value="DM Sans">DM Sans</option><option value="Montserrat">Montserrat</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs">Couleurs</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                      <span className="text-sm text-muted-foreground">Couleur principale</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                      <span className="text-sm text-muted-foreground">Couleur de fond</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {leftTab === "settings" && (
                <div className="space-y-5">
                  <div>
                    <Label className="text-xs font-semibold">Formulaire de prise de contact</Label>
                    <p className="text-xs text-muted-foreground mb-3">Champs du formulaire de capture</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="outline" className="text-xs">Adresse email*</Badge>
                      {captureFirstName && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setCaptureFirstName(false)}>Prénom* <X className="w-2.5 h-2.5 ml-1" /></Badge>}
                      {captureLastName && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setCaptureLastName(false)}>Nom* <X className="w-2.5 h-2.5 ml-1" /></Badge>}
                      {capturePhone && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setCapturePhone(false)}>Téléphone <X className="w-2.5 h-2.5 ml-1" /></Badge>}
                      {captureCountry && <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setCaptureCountry(false)}>Pays <X className="w-2.5 h-2.5 ml-1" /></Badge>}
                    </div>
                    <div className="space-y-1.5">
                      {!captureFirstName && <button onClick={() => setCaptureFirstName(true)} className="text-xs text-primary hover:underline block">+ Prénom</button>}
                      {!captureLastName && <button onClick={() => setCaptureLastName(true)} className="text-xs text-primary hover:underline block">+ Nom</button>}
                      {!capturePhone && <button onClick={() => setCapturePhone(true)} className="text-xs text-primary hover:underline block">+ Téléphone</button>}
                      {!captureCountry && <button onClick={() => setCaptureCountry(true)} className="text-xs text-primary hover:underline block">+ Pays</button>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Viralité</Label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={viralityEnabled} onChange={e => setViralityEnabled(e.target.checked)} className="rounded" />
                      Activer le bonus de partage
                    </label>
                    {viralityEnabled && (
                      <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                        <Input value={bonusDescription} onChange={e => setBonusDescription(e.target.value)} placeholder="Description du bonus" className="text-sm" />
                        <Textarea value={shareMessage} onChange={e => setShareMessage(e.target.value)} placeholder="Message de partage" className="text-sm" rows={2} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CTA global</Label>
                    <Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Texte du CTA" className="text-sm" />
                    <Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="URL du CTA" className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Confidentialité</Label>
                    <Input value={privacyUrl} onChange={e => setPrivacyUrl(e.target.value)} placeholder="URL politique de confidentialité" className="text-sm" />
                    <Input value={consentText} onChange={e => setConsentText(e.target.value)} placeholder="Texte de consentement" className="text-sm" />
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN WYSIWYG AREA */}
          <main className="flex-1 overflow-y-auto flex items-start justify-center p-6" style={{ backgroundColor: bgColor, fontFamily }}>
            <div className={`w-full ${device === "mobile" ? "max-w-sm" : "max-w-3xl"} min-h-[500px] bg-background rounded-2xl shadow-lg border transition-all duration-300`}>
              {renderWysiwygSection()}
              {/* Tiquiz footer */}
              <div className="text-center py-4 border-t">
                <p className="text-xs text-muted-foreground/50">Ce quiz vous est offert par <span className="font-medium">Tiquiz</span></p>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ===== SHARE TAB ===== */}
      {mainTab === "share" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Public link */}
            <Card><CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4 text-primary" /> Lien de partage</h3>
              <div className="flex items-center gap-2">
                <Input value={publicUrl} readOnly className="font-mono text-sm bg-muted" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">Code iframe :</p>
                <pre className="text-xs font-mono bg-muted rounded-lg p-3 overflow-x-auto border">
                  {`<iframe src="${publicUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;max-width:640px;margin:0 auto;display:block;"></iframe>`}
                </pre>
              </div>
            </CardContent></Card>
          </div>
        </div>
      )}

      {/* ===== RESULTS TAB (Leads + Stats) ===== */}
      {mainTab === "results" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: Eye, label: "Vues", value: quiz.views_count },
                { icon: Play, label: "Démarrés", value: quiz.starts_count },
                { icon: CheckCircle, label: "Complétés", value: quiz.completions_count },
                { icon: Users, label: "Leads", value: leads.length },
                { icon: Share2, label: "Partages", value: quiz.shares_count },
              ].map(({ icon: Icon, label, value }) => (
                <Card key={label}><CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="w-4 h-4" />{label}</div>
                  <div className="mt-1 text-2xl font-bold">{value}</div>
                </CardContent></Card>
              ))}
            </div>
            {/* Conversion */}
            <Card><CardContent className="pt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Taux de conversion (Vues → Leads)</h3>
              <div className="text-4xl font-bold">{quiz.views_count > 0 ? ((leads.length / quiz.views_count) * 100).toFixed(1) : "0"}%</div>
            </CardContent></Card>
            {/* Leads table */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Leads ({leads.length})</h3>
              {leads.length > 0 && <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" /> Exporter CSV</Button>}
            </div>
            {leads.length === 0 ? (
              <Card><CardContent className="py-8 text-center"><p className="text-sm text-muted-foreground">Aucun lead pour le moment</p></CardContent></Card>
            ) : (
              <Card><div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left font-medium px-4 py-3">Email</th>
                    <th className="text-left font-medium px-4 py-3">Prénom</th>
                    <th className="text-left font-medium px-4 py-3">Résultat</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-left font-medium px-4 py-3">Partagé</th>
                  </tr></thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{lead.email}</td>
                        <td className="px-4 py-3">{lead.first_name ?? "—"}</td>
                        <td className="px-4 py-3">{lead.result_title ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3">{lead.has_shared ? <Badge className="bg-green-100 text-green-700">Oui</Badge> : "Non"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
