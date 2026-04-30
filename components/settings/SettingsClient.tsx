"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingsAchievements } from "@/components/settings/SettingsAchievements";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings, Palette, Key, Trash2, Loader2, Save,
  CreditCard, Upload, Check, Crown, Zap, Star, ArrowRight,
  Tag as TagIcon, Workflow, AlertTriangle, ExternalLink, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { LanguageCombobox } from "@/components/quiz/LanguageCombobox";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import SetPasswordForm from "@/components/auth/SetPasswordForm";
import SioApiKeysManager from "@/components/sio/SioApiKeysManager";

type Profile = {
  full_name: string | null;
  email: string | null;
  ui_locale: string | null;
  content_locale: string | null;
  address_form: string | null;
  privacy_url: string | null;
  plan: string | null;
  brand_logo_url: string | null;
  brand_color_primary: string | null;
  brand_color_accent: string | null;
  brand_font: string | null;
  brand_tone: string | null;
  brand_website_url: string | null;
  target_audience: string | null;
};

const FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Lato", "Roboto", "Open Sans", "Nunito"];
const TONES = [
  { value: "professionnel", labelKey: "toneProfessional" },
  { value: "amical", labelKey: "toneFriendly" },
  { value: "formel", labelKey: "toneFormal" },
  { value: "fun", labelKey: "toneFun" },
  { value: "inspirant", labelKey: "toneInspiring" },
] as const;

const PLANS = [
  {
    id: "free",
    nameKey: "planFreeName",
    icon: Zap,
    priceKey: "planFreePrice",
    periodKey: null as string | null,
    featureKeys: ["planFreeF1", "planFreeF2", "planFreeF3", "planFreeF4"],
    ctaKey: null as string | null,
  },
  {
    id: "pro_monthly",
    nameKey: "planProName",
    icon: Star,
    priceKey: "planProPrice",
    periodKey: "planProPeriod" as string | null,
    featureKeys: ["planProF1", "planProF2", "planProF3", "planProF4", "planProF5", "planProF6"],
    ctaKey: "planProCta" as string | null,
    popular: true,
  },
  {
    id: "pro_yearly",
    nameKey: "planYearlyName",
    icon: Crown,
    priceKey: "planYearlyPrice",
    periodKey: "planYearlyPeriod" as string | null,
    badge: "−17%",
    featureKeys: ["planYearlyF1", "planYearlyF2", "planYearlyF3", "planYearlyF4"],
    ctaKey: "planYearlyCta" as string | null,
  },
] as const;

export default function SettingsClient() {
  const t = useTranslations("settings");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "general";
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [addressForm, setAddressForm] = useState("tu");
  const [contentLocale, setContentLocale] = useState("fr");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandColorPrimary, setBrandColorPrimary] = useState("#5D6CDB");
  const [brandColorAccent, setBrandColorAccent] = useState("#20BBE6");
  const [brandFont, setBrandFont] = useState("Inter");
  const [brandTone, setBrandTone] = useState("professionnel");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.profile) {
          const p = data.profile;
          setProfile(p);
          setAddressForm(p.address_form ?? "tu");
          setContentLocale(p.content_locale ?? "fr");
          setPrivacyUrl(p.privacy_url ?? "");
          setTargetAudience(p.target_audience ?? "");
          setBrandLogoUrl(p.brand_logo_url ?? "");
          setBrandColorPrimary(p.brand_color_primary ?? "#5D6CDB");
          setBrandColorAccent(p.brand_color_accent ?? "#20BBE6");
          setBrandFont(p.brand_font ?? "Inter");
          setBrandTone(p.brand_tone ?? "professionnel");
          setBrandWebsiteUrl(p.brand_website_url ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address_form: addressForm,
          content_locale: contentLocale,
          privacy_url: privacyUrl.trim() || null,
          target_audience: targetAudience.trim() || null,
          brand_logo_url: brandLogoUrl.trim() || null,
          brand_color_primary: brandColorPrimary,
          brand_color_accent: brandColorAccent,
          brand_font: brandFont,
          brand_tone: brandTone,
          brand_website_url: brandWebsiteUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) toast.success(t("saved"));
      else toast.error(data.error ?? t("errGeneric"));
    } catch {
      toast.error(t("errNetwork"));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error(t("errImageOnly"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("errImageTooLarge2"));
      return;
    }
    setUploadingLogo(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split(".").pop() ?? "png";
      const path = `logos/${user.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      setBrandLogoUrl(urlData.publicUrl);
      toast.success(t("logoUploaded"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Logo upload failed:", err);
      toast.error(t("errLogoUpload", { msg }));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm(t("confirmDeleteAccount"))) return;
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/");
      }
    } catch {
      toast.error(t("errGeneric"));
    }
  }

  async function handleConfirmCancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // WhenBillingCycleEnds = grace period until next billing date.
        // SIO webhook will flip plan→free at period end (handled in
        // app/api/systeme-io/webhook/route.ts).
        body: JSON.stringify({ cancel: "WhenBillingCycleEnds" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.message ?? t("cancelError"));
        return;
      }
      toast.success(t("cancelRequested"));
      setCancelOpen(false);
      // Refresh profile so the UI reflects any immediate downgrade
      // (status="no_active_subscription" path in the API).
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => { if (d.ok && d.profile) setProfile(d.profile); })
        .catch(() => {});
    } catch {
      toast.error(t("cancelError"));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return null;

  const currentPlan = profile?.plan ?? "free";
  const isLifetimePlan = currentPlan === "beta" || currentPlan === "lifetime";
  const hasActiveSubscription = currentPlan === "monthly" || currentPlan === "yearly";

  return (
    <div className="space-y-5">
      <div className="gradient-primary rounded-xl px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <Settings className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <p className="text-sm text-white/70">{t("subtitle")}</p>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="secondary" className="shrink-0 rounded-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t("saveBtn")}
        </Button>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-4">
        {/* Pill tabs — same style as the rest of Tiquiz / Tipote post-refresh. */}
        <TabsList className="h-auto p-1 gap-1 flex-wrap sticky top-14 z-10">
          <TabsTrigger value="general" className="gap-1.5 px-4 py-2"><Settings className="h-4 w-4" />{t("tabGeneral")}</TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5 px-4 py-2"><Palette className="h-4 w-4" />{t("tabBranding")}</TabsTrigger>
          <TabsTrigger value="systemeio" className="gap-1.5 px-4 py-2"><Key className="h-4 w-4" />{t("tabSystemeio")}</TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5 px-4 py-2"><CreditCard className="h-4 w-4" />{t("tabAccount")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("contentLocaleTitle")}</CardTitle>
              <CardDescription>{t("contentLocaleDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <LanguageCombobox
                value={contentLocale}
                onValueChange={setContentLocale}
                strings={{
                  placeholder: t("contentLocalePlaceholder"),
                  searchPlaceholder: t("contentLocaleSearchPlaceholder"),
                  popularHeading: t("contentLocalePopularHeading"),
                  allHeading: t("contentLocaleAllHeading"),
                  noResults: t("contentLocaleNoResults"),
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("addressFormTitle")}</CardTitle>
              <CardDescription>{t("addressFormDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={addressForm}
                onChange={(e) => setAddressForm(e.target.value)}
                className="text-sm border border-input rounded-lg px-3 py-2 bg-background w-full sm:w-auto"
              >
                <option value="tu">{t("addressTu")}</option>
                <option value="vous">{t("addressVous")}</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("audienceTitle")}</CardTitle>
              <CardDescription>{t("audienceDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder={t("audiencePh")}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background min-h-[60px] resize-y"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("privacyTitle")}</CardTitle>
              <CardDescription>{t("privacyDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={privacyUrl}
                onChange={(e) => setPrivacyUrl(e.target.value)}
                placeholder="https://monsite.com/confidentialite"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("logoTitle")}</CardTitle>
              <CardDescription>{t("logoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                {brandLogoUrl ? (
                  <img src={brandLogoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-lg border bg-white p-1" />
                ) : (
                  <div className="h-14 w-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadingLogo ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                      {t("logoUploadBtn")}
                    </Button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                      }}
                    />
                  </div>
                  <Input
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    placeholder={t("logoUrlPh")}
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("colorsTitle")}</CardTitle>
              <CardDescription>{t("colorsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>{t("colorPrimary")}</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <input
                      type="color"
                      value={brandColorPrimary}
                      onChange={(e) => setBrandColorPrimary(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={brandColorPrimary}
                      onChange={(e) => setBrandColorPrimary(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("colorAccent")}</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <input
                      type="color"
                      value={brandColorAccent}
                      onChange={(e) => setBrandColorAccent(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={brandColorAccent}
                      onChange={(e) => setBrandColorAccent(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("typoTitle")}</CardTitle>
              <CardDescription>{t("typoDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>{t("fontLabel")}</Label>
                  <select
                    value={brandFont}
                    onChange={(e) => setBrandFont(e.target.value)}
                    className="mt-1.5 w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t("toneLabel")}</Label>
                  <select
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    className="mt-1.5 w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  >
                    {TONES.map((tone) => (
                      <option key={tone.value} value={tone.value}>{t(tone.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("websiteTitle")}</CardTitle>
              <CardDescription>{t("websiteDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={brandWebsiteUrl}
                onChange={(e) => setBrandWebsiteUrl(e.target.value)}
                placeholder="https://monsite.com"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="systemeio" className="space-y-4">
          <SioApiKeysManager />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" />
                {t("autoTitle")}
              </CardTitle>
              <CardDescription>{t("autoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                  1
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <TagIcon className="h-4 w-4" />
                    {t("autoStep1Title")}
                  </div>
                  <p className="text-muted-foreground">{t("autoStep1P1")}</p>
                  <p className="text-muted-foreground">{t("autoStep1P2")}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                  2
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Workflow className="h-4 w-4" />
                    {t("autoStep2Title")}
                  </div>
                  <p className="text-muted-foreground">{t("autoStep2P1")}</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>{t("autoStep2Trigger")}</li>
                    <li>
                      {t("autoStep2Actions")}
                      <ul className="list-[circle] pl-5 mt-1 space-y-0.5">
                        <li>{t("autoStep2A1")}</li>
                        <li>{t("autoStep2A2")}</li>
                        <li>{t("autoStep2A3")}</li>
                        <li>{t("autoStep2A4")}</li>
                        <li>{t("autoStep2A5")}</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                  3
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold">{t("autoStep3Title")}</div>
                  <p className="text-muted-foreground">{t("autoStep3P")}</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-900 dark:text-amber-200">{t("autoTestTitle")}</div>
                  <p className="text-amber-900/80 dark:text-amber-200/80 text-[13px]">{t("autoTestP")}</p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap gap-3 text-[13px]">
                <a
                  href="https://aide.systeme.io/article/1214-comment-fonctionne-le-workflow-de-systemeio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {t("autoLinkSio")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://app.tipote.com/support/article/tiquiz-systeme-io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {t("autoLinkTiquiz")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          {/* Achievements gallery — gamified summary of what the user
              has earned. Computed live on mount from /api/quiz so it
              always reflects the current state without a separate
              tracking system. */}
          <SettingsAchievements />

          <Card>
            <CardHeader>
              <CardTitle>{t("subscriptionTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg font-semibold capitalize">{currentPlan}</span>
                {currentPlan === "free" && (
                  <span className="text-sm text-muted-foreground">{t("freeInline")}</span>
                )}
                {hasActiveSubscription && (
                  <span className="text-sm text-muted-foreground">{t("paidInline")}</span>
                )}
                {isLifetimePlan && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-full">
                    <Sparkles className="h-3 w-3" /> {t("lifetimeAccess")}
                  </span>
                )}
              </div>
              {hasActiveSubscription && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="text-sm text-destructive hover:underline"
                >
                  {t("cancelSub")}
                </button>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.id || (currentPlan === "free" && plan.id === "free") || (currentPlan === "monthly" && plan.id === "pro_monthly") || (currentPlan === "yearly" && plan.id === "pro_yearly") || (currentPlan === "lifetime" && plan.id === "pro_monthly");
              return (
                <Card key={plan.id} className={`relative overflow-visible ${('popular' in plan && plan.popular) ? "border-primary ring-1 ring-primary" : ""}`}>
                  {('popular' in plan && plan.popular) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap z-10 shadow-sm">
                      {t("popular")}
                    </div>
                  )}
                  <CardContent className="pt-8 pb-5 px-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${('popular' in plan && plan.popular) ? "bg-primary/10" : "bg-muted"}`}>
                        <plan.icon className={`h-4 w-4 ${('popular' in plan && plan.popular) ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{t(plan.nameKey)}</h3>
                        {('badge' in plan && plan.badge) && <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{plan.badge}</span>}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{t(plan.priceKey)}</span>
                      {plan.periodKey && <span className="text-sm text-muted-foreground">{t(plan.periodKey)}</span>}
                    </div>
                    <ul className="space-y-2">
                      {plan.featureKeys.map((fk) => (<li key={fk} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary shrink-0" />{t(fk)}</li>))}
                    </ul>
                    {isCurrent ? (
                      <div className="text-center text-sm font-medium text-muted-foreground py-2 border rounded-full">{t("currentPlan")}</div>
                    ) : plan.ctaKey ? (
                      <Button className="w-full rounded-full" variant={('popular' in plan && plan.popular) ? "default" : "outline"} asChild>
                        <a href={plan.id === "pro_monthly" ? "https://www.tipote.fr/tiquiz-mensuel" : "https://www.tipote.fr/tiquiz-annuel"} target="_blank" rel="noopener noreferrer">{t(plan.ctaKey)} <ArrowRight className="h-4 w-4 ml-1.5" /></a>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center">{t("paymentsManaged")}</p>

          <PasswordSection />

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
              <CardDescription>{t("dangerZoneDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("deleteAccount")}</p>
                  <p className="text-sm text-muted-foreground">{t("deleteAccountDesc")}</p>
                </div>
                <Button variant="destructive" size="sm" className="rounded-full" onClick={handleDeleteAccount}>
                  <Trash2 className="h-4 w-4 mr-2" />{t("deleteBtn")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel-subscription confirmation. Calls /api/billing/cancel which
          tells SIO to cancel at the end of the current billing period. The
          eventual SALE_CANCELED webhook then flips plan→free locally. */}
      <Dialog open={cancelOpen} onOpenChange={(open) => { if (!cancelling) setCancelOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
            <DialogDescription>{t("cancelDialog.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              {t("cancelDialog.keep")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelling}
            >
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("cancelDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PasswordSection() {
  const t = useTranslations("resetPasswordPage");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sectionTitle")}</CardTitle>
        <CardDescription>{t("sectionDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SetPasswordForm mode="reset" />
      </CardContent>
    </Card>
  );
}
