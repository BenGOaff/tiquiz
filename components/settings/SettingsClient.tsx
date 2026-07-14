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
  Globe, BarChart3,
} from "lucide-react";
import { CustomDomainsTab } from "@/components/settings/CustomDomainsTab";
import { isPaidPlan } from "@/lib/planLimits";
import { toast } from "sonner";
import { LanguageCombobox } from "@/components/quiz/LanguageCombobox";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import SetPasswordForm from "@/components/auth/SetPasswordForm";
import SioApiKeysManager from "@/components/sio/SioApiKeysManager";

type Profile = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
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
  tipote_affiliate_id: string | null;
  // Phase B (Adeline, 19 mai 2026) : défauts user pour les pixels Meta + Google.
  default_meta_pixel_id?: string | null;
  default_meta_capi_token?: string | null;
  default_ga4_measurement_id?: string | null;
  default_google_ads_conversion_id?: string | null;
  default_google_ads_conversion_label?: string | null;
};

const FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Lato", "Roboto", "Open Sans", "Nunito"];
const TONES = [
  { value: "professionnel", labelKey: "toneProfessional" },
  { value: "amical", labelKey: "toneFriendly" },
  { value: "formel", labelKey: "toneFormal" },
  { value: "fun", labelKey: "toneFun" },
  { value: "inspirant", labelKey: "toneInspiring" },
] as const;

// Catalogue des plans affichés dans Settings → Abonnement.
// Chaque carte a un CTA "Passer en X" qui ouvre le checkout SIO du
// plan correspondant. Le webhook fait le reste automatiquement :
//   - upsert profiles.plan = nouveau plan
//   - auto-cancel les anciens subs SIO (cf. webhook route.ts)
//   - flag expected_sio_cancel_until = NOW + 24h pour ignorer le
//     SALE_CANCELED de l'ancien sub qui arrivera plus tard
// Donc upgrade ET downgrade marchent en 1 clic, sans intervention user
// côté SIO ni double-facturation.
const PLANS = [
  {
    id: "free",
    nameKey: "planFreeName",
    icon: Zap,
    priceKey: "planFreePrice",
    periodKey: null as string | null,
    featureKeys: ["planFreeF1", "planFreeF2", "planFreeF3", "planFreeF4"],
    ctaKey: null as string | null,
    checkoutUrl: null as string | null,
  },
  {
    id: "pro_monthly",
    nameKey: "planProName",
    icon: Star,
    priceKey: "planProPrice",
    periodKey: "planProPeriod" as string | null,
    featureKeys: ["planProF1", "planProF2", "planProF3", "planProF4", "planProF5", "planProF6"],
    ctaKey: "planProCta" as string | null,
    checkoutUrl: "https://www.tipote.fr/part-tiquiz-mensuel" as string | null,
  },
  {
    id: "pro_yearly",
    nameKey: "planYearlyName",
    icon: Crown,
    priceKey: "planYearlyPrice",
    periodKey: "planYearlyPeriod" as string | null,
    featureKeys: ["planYearlyF1", "planYearlyF2", "planYearlyF3", "planYearlyF4"],
    ctaKey: "planYearlyCta" as string | null,
    checkoutUrl: "https://www.tipote.fr/part-tiquiz-annuel" as string | null,
  },
  {
    id: "pro_monthly_plus",
    nameKey: "planMonthlyPlusName",
    icon: Sparkles,
    priceKey: "planMonthlyPlusPrice",
    periodKey: "planMonthlyPlusPeriod" as string | null,
    featureKeys: [
      "planMonthlyPlusF1",
      "planMonthlyPlusF2",
      "planMonthlyPlusF3",
      "planMonthlyPlusF4",
    ],
    ctaKey: "planMonthlyPlusCta" as string | null,
    checkoutUrl: "https://www.tipote.fr/tiquiz-mensuel-plus-part" as string | null,
    popular: true,
  },
  {
    id: "pro_yearly_plus",
    nameKey: "planYearlyPlusName",
    icon: Crown,
    priceKey: "planYearlyPlusPrice",
    periodKey: "planYearlyPlusPeriod" as string | null,
    featureKeys: [
      "planYearlyPlusF1",
      "planYearlyPlusF2",
      "planYearlyPlusF3",
      "planYearlyPlusF4",
    ],
    ctaKey: "planYearlyPlusCta" as string | null,
    checkoutUrl: "https://www.tipote.fr/tiquiz-annuel-plus-part" as string | null,
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

  // Identite du titulaire (editable — retour Bene 14 juillet 2026).
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [addressForm, setAddressForm] = useState("tu");
  const [contentLocale, setContentLocale] = useState("fr");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  // Phase B (Adeline, 19 mai 2026) : défauts user pixels Meta + Google.
  // Auto-remplis sur les nouveaux quizzes (à la création) et applicables
  // à un quiz existant via un bouton dans l'éditeur.
  const [defaultMetaPixelId, setDefaultMetaPixelId] = useState("");
  const [defaultMetaCapiToken, setDefaultMetaCapiToken] = useState("");
  const [defaultGa4MeasurementId, setDefaultGa4MeasurementId] = useState("");
  const [defaultGoogleAdsConversionId, setDefaultGoogleAdsConversionId] = useState("");
  const [defaultGoogleAdsConversionLabel, setDefaultGoogleAdsConversionLabel] = useState("");

  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandColorPrimary, setBrandColorPrimary] = useState("#5D6CDB");
  const [brandColorAccent, setBrandColorAccent] = useState("#20BBE6");
  const [brandFont, setBrandFont] = useState("Inter");
  const [brandTone, setBrandTone] = useState("professionnel");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ID affilié Tipote — sauvegardé indépendamment du gros bouton
  // "Save" du tab Profile (l'user le saisit depuis le tab "systemeio").
  const [tipoteAffiliateId, setTipoteAffiliateId] = useState("");
  const [savingAffiliate, setSavingAffiliate] = useState(false);

  // Clients gérés par un revendeur : leurs CTA d'achat pointent vers les
  // bons de commande du REVENDEUR, jamais vers les BDC tipote.fr (sinon
  // ils payeraient Béné au lieu de leur revendeur). managed=true sans URL
  // pour un plan = pas de CTA du tout (pas de fallback, volontairement).
  const [managedBilling, setManagedBilling] = useState<{
    managed: boolean;
    urls: Record<string, string>;
  } | null>(null);
  // Changement de formule en cours (client de revendeur).
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  // Toggle Mensuel / Annuel (parité page de vente, Béné 14 juin 2026).
  // 3 colonnes affichées : Gratuit + les 2 plans du cycle choisi.
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    fetch("/api/billing/checkout-urls", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok) setManagedBilling({ managed: !!data.managed, urls: data.urls ?? {} });
      })
      .catch(() => {});
  }, []);

  // Changement de formule pour un client de revendeur. Stripe : mise a jour
  // en place avec proration (rien d'autre a faire). PayPal / pas d'abo :
  // l'endpoint renvoie l'URL du bon de commande du revendeur.
  const changePlan = async (planKey: string) => {
    setChangingPlan(planKey);
    try {
      const res = await fetch("/api/reseller/client/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }
      if (data?.ok && data.mode === "updated") {
        toast.success(t("planChanged"));
        setTimeout(() => window.location.reload(), 1200);
        return;
      }
      if (data?.ok) {
        window.location.reload();
        return;
      }
      toast.error(t("errGeneric"));
    } catch {
      toast.error(t("errNetwork"));
    } finally {
      setChangingPlan(null);
    }
  };

  // Si l'user est déjà sur un plan annuel, on ouvre le toggle sur Annuel
  // pour qu'il voie son plan courant directement.
  useEffect(() => {
    const p = profile?.plan;
    if (p === "yearly" || p === "yearly_plus") setBillingCycle("yearly");
  }, [profile?.plan]);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.profile) {
          const p = data.profile;
          setProfile(p);
          // Prenom / Nom : on prefere les colonnes dediees ; fallback sur
          // full_name (1er mot = prenom, reste = nom) pour les comptes
          // legacy self-signup ou seul full_name est rempli.
          const fullParts = typeof p.full_name === "string" ? p.full_name.trim().split(/\s+/) : [];
          setFirstName(p.first_name ?? (fullParts.length > 0 ? fullParts[0] : ""));
          setLastName(p.last_name ?? (fullParts.length > 1 ? fullParts.slice(1).join(" ") : ""));
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
          setTipoteAffiliateId(p.tipote_affiliate_id ?? "");
          setDefaultMetaPixelId(p.default_meta_pixel_id ?? "");
          setDefaultMetaCapiToken(p.default_meta_capi_token ?? "");
          setDefaultGa4MeasurementId(p.default_ga4_measurement_id ?? "");
          setDefaultGoogleAdsConversionId(p.default_google_ads_conversion_id ?? "");
          setDefaultGoogleAdsConversionLabel(p.default_google_ads_conversion_label ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveAffiliate() {
    setSavingAffiliate(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipote_affiliate_id: tipoteAffiliateId.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) toast.success(t("saved"));
      else toast.error(data.error ?? t("errGeneric"));
    } catch {
      toast.error(t("errNetwork"));
    } finally {
      setSavingAffiliate(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
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
          default_meta_pixel_id: defaultMetaPixelId.trim() || null,
          default_meta_capi_token: defaultMetaCapiToken.trim() || null,
          default_ga4_measurement_id: defaultGa4MeasurementId.trim() || null,
          default_google_ads_conversion_id: defaultGoogleAdsConversionId.trim() || null,
          default_google_ads_conversion_label: defaultGoogleAdsConversionLabel.trim() || null,
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
          <TabsTrigger value="domain" className="gap-1.5 px-4 py-2"><Globe className="h-4 w-4" />{t("tabDomain")}</TabsTrigger>
          <TabsTrigger value="systemeio" className="gap-1.5 px-4 py-2"><Key className="h-4 w-4" />{t("tabSystemeio")}</TabsTrigger>
          <TabsTrigger value="tracking" className="gap-1.5 px-4 py-2"><BarChart3 className="h-4 w-4" />{t("tabTracking")}</TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5 px-4 py-2"><CreditCard className="h-4 w-4" />{t("tabAccount")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          {/* Identite du titulaire — editable (retour Bene 14 juillet 2026 :
              corriger prenom / nom saisis a l'envers a l'inscription). */}
          <Card>
            <CardHeader>
              <CardTitle>{t("identityTitle")}</CardTitle>
              <CardDescription>{t("identityDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-first-name">{t("identityFirstName")}</Label>
                <Input
                  id="settings-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("identityFirstNamePh")}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-last-name">{t("identityLastName")}</Label>
                <Input
                  id="settings-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("identityLastNamePh")}
                  autoComplete="family-name"
                />
              </div>
            </CardContent>
          </Card>

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

        <TabsContent value="domain" className="space-y-4">
          <CustomDomainsTab isPaid={isPaidPlan(profile?.plan)} />
        </TabsContent>

        <TabsContent value="systemeio" className="space-y-4">
          <SioApiKeysManager />

          {/* Bloc affilié Tipote — sous la clé SIO car c'est dans le
              même contexte mental "compte Systeme.io". L'ID affilié
              vit dans l'URL ?sa=<id> du footer "Ce quiz vous est offert
              par Tiquiz" et permet au créateur de toucher des commissions
              sur les inscriptions Tiquiz qui en découlent. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Touche des commissions sur tes quizzes
              </CardTitle>
              <CardDescription>
                Sur chaque quiz publié, le footer <em>« Ce quiz vous est
                offert par Tiquiz »</em> redirige vers la page de présentation
                de Tiquiz. Si tu colles ton identifiant affilié Systeme.io
                ci-dessous, chaque inscription qui en découle te rapporte
                une commission — automatiquement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="tipote-affiliate-id">
                  Mon identifiant affilié Tipote
                </Label>
                <Input
                  id="tipote-affiliate-id"
                  type="text"
                  autoComplete="off"
                  placeholder="sa00078783172001..."
                  value={tipoteAffiliateId}
                  onChange={(e) => setTipoteAffiliateId(e.target.value)}
                  disabled={loading || savingAffiliate}
                  className="font-mono text-sm"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    {t.rich("affiliateWhereId", {
                      strong: (chunks) => <strong>{chunks}</strong>,
                      em: (chunks) => <em>{chunks}</em>,
                      code: (chunks) => <code className="px-1 py-0.5 rounded bg-muted">{chunks}</code>,
                    })}
                  </p>
                  <p>
                    {t("affiliateNotRegistered")}{" "}
                    <a
                      href="https://www.tipote.fr/part-tiquiz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-primary hover:text-primary/80"
                    >
                      {t("affiliateDiscoverProgram")}
                    </a>
                    {" · "}
                    <a
                      href="https://www.tipote.fr/conditions-generales-affiliation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-primary hover:text-primary/80"
                    >
                      {t("affiliateTerms")}
                    </a>
                  </p>
                  <p className="italic">
                    {t("affiliateEmptyFieldNote")}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAffiliate}
                disabled={savingAffiliate || (profile?.tipote_affiliate_id ?? "") === tipoteAffiliateId.trim()}
              >
                {savingAffiliate ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t("save")}
              </Button>
            </CardContent>
          </Card>

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
                  <p className="text-muted-foreground rounded-lg bg-muted/50 border border-dashed px-2.5 py-2">{t("autoSurveyNote")}</p>
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

        {/* Tracking & Pubs — Phase B (Adeline + Gwenn, 19 mai 2026).
            Onglet dédié entre Systeme.io et Compte & Tarifs pour la
            visibilité (avant c'était noyé en bas du tab Branding).
            Défauts pixels Meta + Google appliqués automatiquement aux
            nouveaux quizzes du créateur. Modifiables par quiz dans
            l'éditeur. */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("trackingDefaultsTitle")}</CardTitle>
              <CardDescription>{t("trackingDefaultsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("trackingDefaultsMetaLabel")}</label>
                <Input
                  value={defaultMetaPixelId}
                  onChange={(e) => setDefaultMetaPixelId(e.target.value)}
                  placeholder="1234567890123456"
                />
                <p className="text-xs text-muted-foreground">
                  <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                    {t("trackingDefaultsMetaHelp")} <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("trackingDefaultsMetaCapiLabel")}</label>
                <Input
                  value={defaultMetaCapiToken}
                  onChange={(e) => setDefaultMetaCapiToken(e.target.value)}
                  placeholder={t("trackingDefaultsMetaCapiPlaceholder")}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  {t("trackingDefaultsMetaCapiHelp")}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("trackingDefaultsGa4Label")}</label>
                <Input
                  value={defaultGa4MeasurementId}
                  onChange={(e) => setDefaultGa4MeasurementId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                />
                <p className="text-xs text-muted-foreground">
                  <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                    {t("trackingDefaultsGa4Help")} <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("trackingDefaultsAdsIdLabel")}</label>
                  <Input
                    value={defaultGoogleAdsConversionId}
                    onChange={(e) => setDefaultGoogleAdsConversionId(e.target.value)}
                    placeholder="AW-1234567890"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("trackingDefaultsAdsLabelLabel")}</label>
                  <Input
                    value={defaultGoogleAdsConversionLabel}
                    onChange={(e) => setDefaultGoogleAdsConversionLabel(e.target.value)}
                    placeholder="abcDEF123"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                  {t("trackingDefaultsAdsHelp")} <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
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

          {/* Toggle Mensuel / Annuel (parité page de vente). Affiché
              pour TOUS (y compris lifetime/beta : les cartes montrent
              "Inclus" mais Béné doit pouvoir vérifier le switch). */}
          <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`text-sm font-semibold transition-colors ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                {t("billingMonthly")}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={billingCycle === "yearly"}
                onClick={() => setBillingCycle((c) => (c === "monthly" ? "yearly" : "monthly"))}
                className="relative w-12 h-6 rounded-full bg-primary/20 transition-colors"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary shadow transition-transform ${billingCycle === "yearly" ? "translate-x-6" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`text-sm font-semibold transition-colors ${billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
              >
                {t("billingYearly")}
              </button>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                {t("billingYearlySave")}
              </span>
            </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.filter((plan) =>
              plan.id === "free" ||
              (billingCycle === "monthly"
                ? plan.id === "pro_monthly" || plan.id === "pro_monthly_plus"
                : plan.id === "pro_yearly" || plan.id === "pro_yearly_plus")
            ).map((plan) => {
              // Strict match only. We used to map "lifetime" → "pro_monthly"
              // which falsely surfaced "Plan actuel" on the monthly card for
              // lifetime users — making it look like they were on a 9€/mo
              // billing they could downgrade or cancel. Lifetime users get
              // their own "included" pill below instead (no CTA, no charge
              // implication).
              // Detection plan actuel — couvre TOUS les paliers (Béné
              // 2 juin 2026). Lifetime/beta ne matchent AUCUNE carte
              // (ils ont accès à tout, on affiche un pill "Inclus").
              const isCurrent =
                (currentPlan === "free" && plan.id === "free") ||
                (currentPlan === "monthly" && plan.id === "pro_monthly") ||
                (currentPlan === "yearly" && plan.id === "pro_yearly") ||
                (currentPlan === "monthly_plus" && plan.id === "pro_monthly_plus") ||
                (currentPlan === "yearly_plus" && plan.id === "pro_yearly_plus");
              const isPaidPlanCard =
                plan.id === "pro_monthly" ||
                plan.id === "pro_yearly" ||
                plan.id === "pro_monthly_plus" ||
                plan.id === "pro_yearly_plus";
              // URL effective du CTA : BDC tipote.fr par défaut, BDC du
              // revendeur si le compte est dans un portefeuille. Client
              // géré + plan non configuré par son revendeur = pas de CTA
              // (surtout PAS de fallback vers les BDC Béné).
              const planKey = (
                {
                  pro_monthly: "monthly",
                  pro_yearly: "yearly",
                  pro_monthly_plus: "monthly_plus",
                  pro_yearly_plus: "yearly_plus",
                } as Record<string, string>
              )[plan.id];
              const effectiveCheckoutUrl = managedBilling?.managed
                ? (planKey ? managedBilling.urls[planKey] ?? null : null)
                : plan.checkoutUrl;
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
                      <h3 className="font-bold">{t(plan.nameKey)}</h3>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{t(plan.priceKey)}</span>
                        {plan.periodKey && <span className="text-sm text-muted-foreground">{t(plan.periodKey)}</span>}
                      </div>
                      {isPaidPlanCard && (
                        <p className="text-xs text-muted-foreground mt-0.5">{t("planNoCommitment")}</p>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {plan.featureKeys.map((fk) => (<li key={fk} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary shrink-0" />{t(fk)}</li>))}
                    </ul>
                    {isLifetimePlan && isPaidPlanCard ? (
                      // Lifetime / beta users already have every Pro feature.
                      // No upgrade or downgrade is possible, and we must NOT
                      // imply a recurring charge. A neutral "included" pill
                      // confirms they're covered without faking a state.
                      <div className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 py-2 rounded-full">
                        {t("lifetimeIncluded")}
                      </div>
                    ) : isCurrent ? (
                      <div className="text-center text-sm font-medium text-muted-foreground py-2 border rounded-full">{t("currentPlan")}</div>
                    ) : plan.ctaKey && managedBilling?.managed && planKey && effectiveCheckoutUrl ? (
                      // Client de revendeur : changement de formule en place.
                      // Stripe -> proration immediate (un clic). PayPal / pas
                      // d'abo -> redirection vers le bon de commande. Cf.
                      // /api/reseller/client/change-plan.
                      <Button
                        className="w-full rounded-full"
                        variant={('popular' in plan && plan.popular) ? "default" : "outline"}
                        onClick={() => changePlan(planKey)}
                        disabled={changingPlan !== null}
                      >
                        {changingPlan === planKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            {t(plan.ctaKey)} <ArrowRight className="h-4 w-4 ml-1.5" />
                          </>
                        )}
                      </Button>
                    ) : plan.ctaKey && effectiveCheckoutUrl ? (
                      // Client direct Tiquiz : CTA universel (checkout SIO du
                      // nouveau plan). Le webhook auto-cancel l'ancien sub cote
                      // SIO et upsert profiles.plan. Cf. webhook route.ts.
                      <Button className="w-full rounded-full" variant={('popular' in plan && plan.popular) ? "default" : "outline"} asChild>
                        <a href={effectiveCheckoutUrl} target="_blank" rel="noopener noreferrer">{t(plan.ctaKey)} <ArrowRight className="h-4 w-4 ml-1.5" /></a>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {isLifetimePlan ? (
            <p className="text-xs text-muted-foreground text-center">{t("lifetimeNote")}</p>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              {managedBilling?.managed ? t("paymentsManagedReseller") : t("paymentsManaged")}
            </p>
          )}

          {/* Mes badges (gamification) — déplacé SOUS les tarifs : peu
              prioritaire dans les paramètres de compte (retour Béné
              14 juin 2026). Calculé au mount depuis /api/quiz. */}
          <SettingsAchievements />

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
