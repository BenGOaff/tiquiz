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
  Palette, SlidersHorizontal, X, Save, ChevronDown, Image,
} from "lucide-react";
import { toast } from "sonner";
import SioSelectors from "@/components/quiz/SioSelectors";

// Types
type QuizOption = { text: string; result_index: number };
type QuizQuestion = { id?: string; question_text: string; options: QuizOption[]; sort_order: number };
type QuizResult = { id?: string; title: string; description: string | null; insight: string | null; projection: string | null; cta_text: string | null; cta_url: string | null; sio_tag_name: string | null; sio_course_id: string | null; sio_community_id: string | null; sort_order: number };
type QuizLead = { id: string; email: string; first_name: string | null; last_name: string | null; phone: string | null; country: string | null; result_title: string | null; has_shared: boolean; bonus_unlocked: boolean; created_at: string };
type QuizData = { id: string; title: string; introduction: string | null; cta_text: string | null; cta_url: string | null; privacy_url: string | null; consent_text: string | null; capture_heading: string | null; capture_subtitle: string | null; capture_first_name: boolean | null; capture_last_name: boolean | null; capture_phone: boolean | null; capture_country: boolean | null; virality_enabled: boolean; bonus_description: string | null; share_message: string | null; locale: string | null; sio_share_tag_name: string | null; status: string; views_count: number; starts_count: number; completions_count: number; shares_count: number; questions: QuizQuestion[]; results: QuizResult[] };
interface QuizDetailClientProps { quizId: string; }

// Inline edit: click to edit text directly on the preview
function InlineEdit({ value, onChange, multiline, className, placeholder, style }: {
  value: string; onChange: (v: string) => void; multiline?: boolean; className?: string; placeholder?: string; style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  if (editing) {
    const cls = `${className || ""} w-full bg-white/90 border-2 border-primary/40 outline-none rounded-lg px-2 py-1`;
    return multiline ? (
      <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)} className={`${cls} resize-none min-h-[60px]`} placeholder={placeholder} style={style} />
    ) : (
      <input ref={ref as React.RefObject<HTMLInputElement>} value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} className={cls} placeholder={placeholder} style={style} />
    );
  }
  return (
    <div onClick={() => setEditing(true)} style={style} className={`${className || ""} cursor-text rounded-lg hover:ring-2 hover:ring-primary/20 hover:bg-primary/5 px-2 py-1 transition-all group relative min-h-[1.2em]`}>
      {value || <span className="opacity-40 italic">{placeholder}</span>}
      <Pencil className="absolute top-1 right-1 w-3 h-3 text-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// Main component
export default function QuizDetailClient({ quizId }: QuizDetailClientProps) {
  const t = useTranslations("quizDetail");
  const tf = useTranslations("quizForm");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [leads, setLeads] = useState<QuizLead[]>([]);

  // Form state
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

  // Editor state
  const [mainTab, setMainTab] = useState<"create" | "share" | "results">("create");
  const [leftTab, setLeftTab] = useState<"edition" | "design" | "settings">("edition");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [primaryColor, setPrimaryColor] = useState("#5B5FE2");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Section refs for scroll-to
  const introRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captureRef = useRef<HTMLDivElement>(null);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    let el: HTMLDivElement | null = null;
    if (id === "intro") el = introRef.current;
    else if (id === "capture") el = captureRef.current;
    else if (id.startsWith("q-")) el = questionRefs.current[parseInt(id.split("-")[1])];
    else if (id.startsWith("r-")) el = resultRefs.current[parseInt(id.split("-")[1])];
    if (el && previewRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Fetch
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
      setCaptureFirstName(q.capture_first_name ?? false); setCaptureLastName(q.capture_last_name ?? false);
      setCapturePhone(q.capture_phone ?? false); setCaptureCountry(q.capture_country ?? false);
      setViralityEnabled(q.virality_enabled); setBonusDescription(q.bonus_description ?? "");
      setShareMessage(q.share_message ?? ""); setLocale(q.locale ?? "");
      setSioShareTagName(q.sio_share_tag_name ?? ""); setStatus(q.status);
      setEditQuestions(q.questions); setEditResults(q.results);
    } catch { toast.error("Error loading quiz"); } finally { setLoading(false); }
  }, [quizId, router]);
  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  // Save
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
          results: editResults.map((r, i) => ({ title: r.title, description: r.description, insight: r.insight, projection: r.projection, cta_text: r.cta_text, cta_url: r.cta_url, sio_tag_name: r.sio_tag_name || null, sio_course_id: r.sio_course_id || null, sio_community_id: r.sio_community_id || null, sort_order: i })),
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Error");
      toast.success("Sauvegardé !");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); } finally { setSaving(false); }
  };

  const handleToggleStatus = async () => {
    const ns = status === "active" ? "draft" : "active";
    setStatus(ns);
    try { await fetch(`/api/quiz/${quizId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) }); toast.success(ns === "active" ? "Quiz publié !" : "Quiz désactivé"); } catch { setStatus(status); }
  };

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${quizId}` : `/q/${quizId}`;
  const handleCopyLink = () => { navigator.clipboard.writeText(publicUrl).then(() => { setCopied(true); toast.success("Lien copié !"); setTimeout(() => setCopied(false), 2000); }); };

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
    const csv = ["Email,Prénom,Nom,Résultat,Date", ...leads.map(l => [l.email, l.first_name ?? "", l.last_name ?? "", l.result_title ?? "", l.created_at ? new Date(l.created_at).toLocaleDateString() : ""].map(c => `"${String(c).replace(/"/g,'""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `leads-${quizId}.csv`; a.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!quiz) return null;
  const pc = primaryColor;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link></Button>
          <span className="font-semibold text-sm truncate max-w-[200px]">{title || "Mon quiz"}</span>
        </div>
        <nav className="hidden sm:flex items-center bg-muted rounded-lg p-0.5">
          {(["create","share","results"] as const).map(tab => (
            <button key={tab} onClick={() => setMainTab(tab)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === tab ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tab === "create" ? <><Pencil className="w-3.5 h-3.5 inline mr-1.5" />Créer</> : tab === "share" ? <><Share2 className="w-3.5 h-3.5 inline mr-1.5" />Partager</> : <><Eye className="w-3.5 h-3.5 inline mr-1.5" />Résultats</>}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md ${device === "desktop" ? "bg-background shadow-sm" : ""}`}><Monitor className="w-4 h-4" /></button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md ${device === "mobile" ? "bg-background shadow-sm" : ""}`}><Smartphone className="w-4 h-4" /></button>
          </div>
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}{saving ? "" : "Enregistrer"}
          </Button>
          <Button size="sm" onClick={handleToggleStatus}>{status === "active" ? "Désactiver" : "Publier"}</Button>
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
                  {tab === "edition" ? "Édition" : tab === "design" ? "Design" : "Paramètres"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
              {leftTab === "edition" && (<>
                {/* Introduction */}
                <button onClick={() => scrollToSection("intro")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors">
                  <span className="text-xs text-muted-foreground mr-2">1</span>Introduction
                </button>
                {/* Questions */}
                <div className="flex items-center justify-between"><span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Questions</span><button onClick={addQuestion} className="text-primary hover:bg-primary/10 rounded p-0.5"><Plus className="w-4 h-4" /></button></div>
                {editQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-1 group">
                    <button onClick={() => scrollToSection(`q-${i}`)} className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors truncate">
                      <span className="text-xs text-muted-foreground mr-2">{i+1}</span>
                      {q.question_text ? q.question_text.slice(0,35) + (q.question_text.length > 35 ? "…" : "") : "Question vide"}
                    </button>
                    {editQuestions.length > 1 && <button onClick={() => removeQuestion(i)} className="opacity-0 group-hover:opacity-100 text-destructive p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></button>}
                  </div>
                ))}
                {/* Accès aux résultats */}
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pt-2">Accès aux résultats</div>
                <button onClick={() => scrollToSection("capture")} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors">
                  <span className="text-xs text-muted-foreground mr-2">1</span>Prise d&apos;informations
                </button>
                {/* Résultats */}
                <div className="flex items-center justify-between pt-2"><span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Résultats</span><button onClick={addResult} className="text-primary hover:bg-primary/10 rounded p-0.5"><Plus className="w-4 h-4" /></button></div>
                {editResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-1 group">
                    <button onClick={() => scrollToSection(`r-${i}`)} className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors truncate">
                      <span className="text-xs text-muted-foreground mr-2">{i+1}</span>{r.title || "Résultat vide"}
                    </button>
                    {editResults.length > 1 && <button onClick={() => removeResult(i)} className="opacity-0 group-hover:opacity-100 text-destructive p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></button>}
                  </div>
                ))}
              </>)}
              {leftTab === "design" && (<div className="space-y-5">
                <div className="space-y-2"><Label className="text-xs">Police d&apos;écriture</Label><select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full border rounded-lg px-2.5 py-1.5 text-sm bg-background"><option>Inter</option><option>Poppins</option><option>DM Sans</option><option>Montserrat</option></select></div>
                <div className="space-y-3"><Label className="text-xs">Couleurs</Label>
                  <div className="flex items-center gap-2"><input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" /><span className="text-xs text-muted-foreground">Couleur principale</span></div>
                  <div className="flex items-center gap-2"><input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" /><span className="text-xs text-muted-foreground">Couleur de fond</span></div>
                </div>
                <div className="space-y-2"><Label className="text-xs">Image de couverture</Label><button className="w-full border-2 border-dashed rounded-lg p-4 text-xs text-muted-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2"><Image className="w-4 h-4" />Ajouter une image</button></div>
                <div className="space-y-2"><Label className="text-xs">Logo <Badge variant="outline" className="text-[10px] ml-1">Payant</Badge></Label><button className="w-full border-2 border-dashed rounded-lg p-4 text-xs text-muted-foreground hover:border-primary/30 transition-colors flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Ajouter mon logo</button></div>
              </div>)}
              {leftTab === "settings" && (<div className="space-y-5">
                <div><Label className="text-xs font-semibold">Formulaire de prise de contact</Label><p className="text-[11px] text-muted-foreground mb-2">Personnalise le questionnaire permettant d&apos;accéder aux résultats</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {captureFirstName && <Badge variant="secondary" className="text-xs">Prénom* <button onClick={() => setCaptureFirstName(false)}><X className="w-2.5 h-2.5 ml-1" /></button></Badge>}
                    {captureLastName && <Badge variant="secondary" className="text-xs">Nom* <button onClick={() => setCaptureLastName(false)}><X className="w-2.5 h-2.5 ml-1" /></button></Badge>}
                    <Badge variant="default" className="text-xs">Adresse email*</Badge>
                    {capturePhone && <Badge variant="secondary" className="text-xs">Téléphone <button onClick={() => setCapturePhone(false)}><X className="w-2.5 h-2.5 ml-1" /></button></Badge>}
                  </div>
                  <button onClick={() => { if (!captureFirstName) setCaptureFirstName(true); else if (!captureLastName) setCaptureLastName(true); else if (!capturePhone) setCapturePhone(true); else if (!captureCountry) setCaptureCountry(true); }} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Ajouter un élément</button>
                </div>
                <div className="space-y-2"><Label className="text-xs">Options</Label>
                  <label className="flex items-center justify-between text-xs"><span>Planifier une date de clôture</span><input type="checkbox" className="rounded" /></label>
                  <label className="flex items-center justify-between text-xs"><span>Inclure le lien de mon site</span><input type="checkbox" className="rounded" /></label>
                  <label className="flex items-center justify-between text-xs"><span>Prioriser le partage</span><input type="checkbox" checked={viralityEnabled} onChange={e => setViralityEnabled(e.target.checked)} className="rounded" /></label>
                </div>
                {viralityEnabled && <div className="space-y-2 pl-3 border-l-2 border-primary/20">
                  <Input value={bonusDescription} onChange={e => setBonusDescription(e.target.value)} placeholder="Description du bonus" className="text-xs" />
                  <Textarea value={shareMessage} onChange={e => setShareMessage(e.target.value)} placeholder="Message de partage" className="text-xs" rows={2} />
                </div>}
                <div className="space-y-2"><Label className="text-xs">CTA global</Label><Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Texte du CTA" className="text-xs" /><Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="URL du CTA" className="text-xs" /></div>
              </div>)}
            </div>
          </aside>

          {/* RIGHT: LIVE PREVIEW — all sections stacked, exactly as visitor sees it */}
          <main ref={previewRef} className="flex-1 overflow-y-auto" style={{ backgroundColor: bgColor, fontFamily }}>
            <div className={`mx-auto transition-all duration-300 ${device === "mobile" ? "max-w-sm" : "w-full"}`}>

              {/* ── INTRO SECTION ── */}
              <div ref={introRef} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16 text-center">
                <div className="max-w-2xl w-full space-y-6">
                  <InlineEdit value={title} onChange={setTitle} className="text-3xl sm:text-5xl font-bold leading-tight" placeholder="Titre du quiz…" />
                  <InlineEdit value={introduction} onChange={setIntroduction} multiline className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto" placeholder="Texte d'introduction…" />
                  <p className="text-sm text-muted-foreground">{editQuestions.length} questions — ~{Math.max(1, Math.ceil(editQuestions.length * 0.5))} min</p>
                  <button className="px-10 py-4 rounded-full text-white font-semibold text-lg shadow-lg mx-auto block transition-opacity hover:opacity-90" style={{ backgroundColor: pc }}>
                    Commencer le test
                  </button>
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
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: pc }}>Questions {qi + 1}/{editQuestions.length}</p>
                        <InlineEdit value={q.question_text} onChange={(v) => updateQ(qi, v)} className="text-2xl sm:text-4xl font-bold leading-tight" placeholder="Texte de la question…" />
                        <div className={`grid gap-3 ${q.options.length >= 3 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="relative p-5 rounded-xl border-2 border-border hover:border-primary/30 transition-all group">
                              <InlineEdit value={opt.text} onChange={(v) => updateOpt(qi, oi, v)} className="text-base font-medium" placeholder={`Option ${oi + 1}…`} />
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="text-xs" style={{ color: `${pc}99` }}>+1 point pour le</span>
                                <select value={opt.result_index} onChange={(e) => updateOptResult(qi, oi, Number(e.target.value))} className="text-xs border rounded px-1.5 py-0.5 bg-background font-medium cursor-pointer" style={{ color: pc }}>
                                  {editResults.map((_, ri) => <option key={ri} value={ri}>Résultat {ri + 1}</option>)}
                                </select>
                              </div>
                              {q.options.length > 2 && <button onClick={() => removeOpt(qi, oi)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5"><X className="w-3.5 h-3.5" /></button>}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => addOpt(qi)} className="text-xs hover:underline" style={{ color: pc }}>+ Ajouter une option</button>
                        <div className="text-center pt-4">
                          <button className="px-8 py-3 rounded-full text-white font-semibold text-base" style={{ backgroundColor: pc }}>Suivant</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── CAPTURE / LEAD FORM ── */}
              <div ref={captureRef} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16">
                <div className="max-w-lg w-full space-y-6">
                  <InlineEdit value={captureHeading || "Vos résultats sont prêts"} onChange={setCaptureHeading} className="text-2xl sm:text-4xl font-bold text-center" placeholder="Titre…" />
                  <InlineEdit value={captureSubtitle || "Pour accéder aux résultats, veuillez laisser vos coordonnées."} onChange={setCaptureSubtitle} className="text-muted-foreground text-center text-base" placeholder="Sous-titre…" />
                  <div className="space-y-3 max-w-md mx-auto">
                    {(captureFirstName || captureLastName) && <div className="grid grid-cols-2 gap-3">
                      {captureFirstName && <div><label className="text-sm text-muted-foreground">Prénom</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                      {captureLastName && <div><label className="text-sm text-muted-foreground">Nom</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                    </div>}
                    <div><label className="text-sm text-muted-foreground">Email</label><Input readOnly className="mt-1 bg-muted/20" /></div>
                    {capturePhone && <div><label className="text-sm text-muted-foreground">Téléphone (optional)</label><Input readOnly className="mt-1 bg-muted/20" /></div>}
                  </div>
                  <button className="w-full max-w-md mx-auto block px-8 py-4 rounded-full text-white font-semibold text-lg" style={{ backgroundColor: pc }}>Accéder aux résultats</button>
                </div>
              </div>

              {/* ── RESULTS ── */}
              {editResults.map((r, ri) => (
                <div key={ri} ref={el => { resultRefs.current[ri] = el; }} className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 py-16">
                  <div className="max-w-2xl w-full space-y-6">
                    <InlineEdit value={r.title} onChange={(v) => updateR(ri, "title", v)} className="text-3xl sm:text-5xl font-bold" style={{ color: pc }} placeholder="Titre du résultat…" />
                    <InlineEdit value={r.description ?? ""} onChange={(v) => updateR(ri, "description", v || null)} multiline className="text-muted-foreground text-lg leading-relaxed" placeholder="Description…" />
                    <div className="p-5 rounded-xl bg-muted/50 border"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Prise de conscience</p><InlineEdit value={r.insight ?? ""} onChange={(v) => updateR(ri, "insight", v || null)} multiline className="text-sm leading-relaxed" placeholder="Insight…" /></div>
                    <div className="p-5 rounded-xl border" style={{ backgroundColor: `${pc}08`, borderColor: `${pc}30` }}><p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: `${pc}99` }}>Et si...</p><InlineEdit value={r.projection ?? ""} onChange={(v) => updateR(ri, "projection", v || null)} multiline className="text-sm leading-relaxed" placeholder="Projection…" /></div>
                    <div className="space-y-2">
                      <button className="w-full px-8 py-4 rounded-full text-white font-semibold text-lg" style={{ backgroundColor: pc }}>
                        <InlineEdit value={r.cta_text ?? ctaText ?? ""} onChange={(v) => updateR(ri, "cta_text", v || null)} className="text-white font-semibold text-center" placeholder="Texte du CTA…" />
                      </button>
                      <InlineEdit value={r.cta_url ?? ctaUrl ?? ""} onChange={(v) => updateR(ri, "cta_url", v || null)} className="text-xs text-muted-foreground text-center" placeholder="URL du CTA (https://…)" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Footer Tiquiz */}
              <div className="text-center py-8 border-t">
                <p className="text-xs text-muted-foreground/50">Ce quiz vous est offert par <span className="font-semibold">Tiquiz</span></p>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* SHARE TAB */}
      {mainTab === "share" && (
        <div className="flex-1 overflow-y-auto p-6"><div className="max-w-3xl mx-auto space-y-4">
          <Card><CardContent className="pt-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4 text-primary" /> Lien de partage</h3>
            <div className="flex items-center gap-2">
              <Input value={publicUrl} readOnly className="font-mono text-sm bg-muted" />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>{copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</Button>
            </div>
            <pre className="text-xs font-mono bg-muted rounded-lg p-3 overflow-x-auto border mt-3">{`<iframe src="${publicUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;max-width:640px;margin:0 auto;display:block;"></iframe>`}</pre>
          </CardContent></Card>
        </div></div>
      )}

      {/* RESULTS TAB */}
      {mainTab === "results" && (
        <div className="flex-1 overflow-y-auto p-6"><div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[{ icon: Eye, label: "Vues", v: quiz.views_count },{ icon: Play, label: "Démarrés", v: quiz.starts_count },{ icon: CheckCircle, label: "Complétés", v: quiz.completions_count },{ icon: Users, label: "Leads", v: leads.length },{ icon: Share2, label: "Partages", v: quiz.shares_count }].map(({ icon: I, label, v }) => (
              <Card key={label}><CardContent className="pt-6"><div className="flex items-center gap-2 text-sm text-muted-foreground"><I className="w-4 h-4" />{label}</div><div className="mt-1 text-2xl font-bold">{v}</div></CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="pt-6"><h3 className="text-sm text-muted-foreground mb-2">Taux de conversion</h3><div className="text-4xl font-bold">{quiz.views_count > 0 ? ((leads.length / quiz.views_count) * 100).toFixed(1) : "0"}%</div></CardContent></Card>
          <div className="flex items-center justify-between"><h3 className="font-bold text-lg">Leads ({leads.length})</h3>{leads.length > 0 && <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>}</div>
          {leads.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aucun lead</CardContent></Card> : (
            <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/50"><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Prénom</th><th className="text-left px-4 py-3">Résultat</th><th className="text-left px-4 py-3">Date</th></tr></thead><tbody>
              {leads.map(l => <tr key={l.id} className="border-b"><td className="px-4 py-3 font-medium">{l.email}</td><td className="px-4 py-3">{l.first_name ?? "—"}</td><td className="px-4 py-3">{l.result_title ?? "—"}</td><td className="px-4 py-3 text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}</td></tr>)}
            </tbody></table></div></Card>
          )}
        </div></div>
      )}
    </div>
  );
}
