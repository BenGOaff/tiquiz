"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Settings, Palette, Key, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

type Profile = {
  full_name: string | null;
  email: string | null;
  ui_locale: string | null;
  address_form: string | null;
  privacy_url: string | null;
  sio_user_api_key: string | null;
  sio_api_key_name: string | null;
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
  { value: "professionnel", label: "Professionnel" },
  { value: "amical", label: "Amical (tu)" },
  { value: "formel", label: "Formel (vous)" },
  { value: "fun", label: "Fun & décalé" },
  { value: "inspirant", label: "Inspirant" },
];

export default function SettingsClient() {
  const t = useTranslations("settings");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "general";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // General
  const [addressForm, setAddressForm] = useState("tu");
  const [privacyUrl, setPrivacyUrl] = useState("");

  // Branding
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandColorPrimary, setBrandColorPrimary] = useState("#5D6CDB");
  const [brandColorAccent, setBrandColorAccent] = useState("#20BBE6");
  const [brandFont, setBrandFont] = useState("Inter");
  const [brandTone, setBrandTone] = useState("professionnel");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState("");

  // Target audience
  const [targetAudience, setTargetAudience] = useState("");

  // SIO
  const [sioKey, setSioKey] = useState("");
  const [sioKeyName, setSioKeyName] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.profile) {
          const p = data.profile;
          setProfile(p);
          setAddressForm(p.address_form ?? "tu");
          setPrivacyUrl(p.privacy_url ?? "");
          setSioKey(p.sio_user_api_key ?? "");
          setSioKeyName(p.sio_api_key_name ?? "");
          setBrandLogoUrl(p.brand_logo_url ?? "");
          setBrandColorPrimary(p.brand_color_primary ?? "#5D6CDB");
          setBrandColorAccent(p.brand_color_accent ?? "#20BBE6");
          setBrandFont(p.brand_font ?? "Inter");
          setBrandTone(p.brand_tone ?? "professionnel");
          setBrandWebsiteUrl(p.brand_website_url ?? "");
          setTargetAudience(p.target_audience ?? "");
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
          privacy_url: privacyUrl.trim() || null,
          sio_user_api_key: sioKey.trim() || null,
          sio_api_key_name: sioKeyName.trim() || null,
          brand_logo_url: brandLogoUrl.trim() || null,
          brand_color_primary: brandColorPrimary,
          brand_color_accent: brandColorAccent,
          brand_font: brandFont,
          brand_tone: brandTone,
          brand_website_url: brandWebsiteUrl.trim() || null,
          target_audience: targetAudience.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) toast.success(t("saved"));
      else toast.error(data.error ?? "Erreur");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Es-tu sûr de vouloir supprimer ton compte ? Cette action est irréversible.")) return;
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/");
      }
    } catch {
      toast.error("Erreur");
    }
  }

  if (loading) return null;

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="gradient-primary rounded-xl px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <Settings className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <p className="text-sm text-white/70">Configure ton compte et tes préférences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="secondary" className="shrink-0">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="general"><Settings className="h-4 w-4 mr-1.5" />Général</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="h-4 w-4 mr-1.5" />Branding</TabsTrigger>
          <TabsTrigger value="systemeio"><Key className="h-4 w-4 mr-1.5" />Systeme.io</TabsTrigger>
          <TabsTrigger value="account"><Trash2 className="h-4 w-4 mr-1.5" />Compte</TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("languageTitle")}</CardTitle>
              <CardDescription>{t("languageDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <LanguageSwitcher />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Forme d&apos;adresse</CardTitle>
              <CardDescription>Tutoiement ou vouvoiement dans les quiz</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={addressForm}
                onChange={(e) => setAddressForm(e.target.value)}
                className="text-sm border border-input rounded-lg px-3 py-2 bg-background w-full sm:w-auto"
              >
                <option value="tu">Tutoiement (tu)</option>
                <option value="vous">Vouvoiement (vous)</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Public cible</CardTitle>
              <CardDescription>Décris ton audience — pré-rempli dans la création de quiz IA</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex : J'aide les mampreneures à vendre via Instagram"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background min-h-[60px] resize-y"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Politique de confidentialité</CardTitle>
              <CardDescription>URL par défaut utilisée dans tes quiz</CardDescription>
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

        {/* ── Branding ── */}
        <TabsContent value="branding" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>URL de ton logo (utilisé dans les quiz et emails)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {brandLogoUrl && (
                  <img src={brandLogoUrl} alt="Logo" className="h-12 w-auto rounded border" />
                )}
                <Input
                  value={brandLogoUrl}
                  onChange={(e) => setBrandLogoUrl(e.target.value)}
                  placeholder="https://monsite.com/logo.png"
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Couleurs</CardTitle>
              <CardDescription>Couleurs de marque pour tes quiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Couleur principale</Label>
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
                  <Label>Couleur d&apos;accent</Label>
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
              <CardTitle>Typographie & ton</CardTitle>
              <CardDescription>Police et style de communication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Police</Label>
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
                  <Label>Ton de voix</Label>
                  <select
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    className="mt-1.5 w-full text-sm border border-input rounded-lg px-3 py-2 bg-background"
                  >
                    {TONES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Site web</CardTitle>
              <CardDescription>URL de ton site (affiché dans les quiz)</CardDescription>
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

        {/* ── Systeme.io ── */}
        <TabsContent value="systemeio" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clé API Systeme.io</CardTitle>
              <CardDescription>
                Connecte ton compte Systeme.io pour synchroniser automatiquement les leads.
                Tu peux trouver ta clé API dans Systeme.io &gt; Paramètres &gt; API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom de la connexion</Label>
                <Input
                  value={sioKeyName}
                  onChange={(e) => setSioKeyName(e.target.value)}
                  placeholder="Mon projet"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Clé API</Label>
                <Input
                  value={sioKey}
                  onChange={(e) => setSioKey(e.target.value)}
                  placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxx"
                  type="password"
                  className="mt-1.5 font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Account ── */}
        <TabsContent value="account" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan actuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold capitalize">{profile?.plan ?? "free"}</span>
                {profile?.plan === "free" && (
                  <span className="text-sm text-muted-foreground">— 1 quiz, 10 réponses/mois</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Zone de danger</CardTitle>
              <CardDescription>Ces actions sont irréversibles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Supprimer mon compte</p>
                  <p className="text-sm text-muted-foreground">Supprime toutes tes données, quiz et leads</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                  <Trash2 className="h-4 w-4 mr-2" />Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
