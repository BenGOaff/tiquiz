"use client";

// components/settings/CustomDomainsTab.tsx
//
// The "Custom domains" tab content. Loads the user's existing
// domains from /api/custom-domain on mount, renders one card per
// row + the "Add domain" trigger.
//
// Plan-gating: the POST endpoint already refuses for free-plan
// users; we read the plan from the parent (passed in) just to hide
// the form upfront with a friendly upsell, rather than letting the
// user fill it in and bump into a 403.

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Loader2, Sparkles, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { CustomDomainRow } from "@/lib/customDomains";
import type { RegistrarInfo } from "@/lib/registrarDetect";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { AddCustomDomainDialog } from "./AddCustomDomainDialog";
import { CustomDomainCard } from "./CustomDomainCard";

type Props = {
  isPaid: boolean;
};

export function CustomDomainsTab({ isPaid }: Props) {
  const t = useTranslations("settings");

  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<CustomDomainRow[]>([]);
  const [cnameTarget, setCnameTarget] = useState("");
  // Per-domain registrar info isn't stored server-side (no point — NS
  // can change), so we keep it in component state, keyed by domain id.
  // Set when the user adds a new domain (we detect at that moment).
  // For domains loaded from the API on mount we initially render
  // without registrar info; the auto-poll still works, the user just
  // doesn't see tailored setup instructions until they re-open the
  // detection somewhere else. Good enough for v1.
  const [registrars, setRegistrars] = useState<Record<string, RegistrarInfo>>({});

  // Nom de marque user-éditable affiché dans les aperçus de partage
  // (og:site_name + suffix du <title>) à la place de "Tiquiz" quand
  // l'user sert ses quiz via un custom domain. Cf. migration
  // 20260519_profiles_share_site_name.sql.
  const [shareSiteName, setShareSiteName] = useState("");
  const [shareSiteNameOriginal, setShareSiteNameOriginal] = useState("");
  const [savingShareSiteName, setSavingShareSiteName] = useState(false);

  // Favicon — Gwenn, 23 mai 2026. Servi dans l'onglet navigateur sur
  // les routes publiques quand l'user a un custom domain vérifié.
  // Sans custom domain, le navigateur charge tiquiz.com/favicon.ico,
  // donc on planque le réglage : il ne sert à rien.
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [brandFaviconUrl, setBrandFaviconUrl] = useState("");
  const [brandFaviconUrlOriginal, setBrandFaviconUrlOriginal] = useState("");
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [savingFavicon, setSavingFavicon] = useState(false);

  useEffect(() => {
    if (!isPaid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // En parallèle : domaines custom + profile.share_site_name pour
        // pré-remplir l'input "nom de marque" du second card.
        const [domRes, profRes] = await Promise.all([
          fetch("/api/custom-domain"),
          fetch("/api/profile"),
        ]);
        const domData = await domRes.json().catch(() => null);
        const profData = await profRes.json().catch(() => null);
        if (cancelled) return;
        if (domData?.ok) {
          setDomains(domData.domains ?? []);
          setCnameTarget(domData.dnsTargetCname ?? "");
        } else {
          toast.error(domData?.error ?? t("errGeneric"));
        }
        if (profData?.ok) {
          const value = (profData.profile?.share_site_name ?? "") as string;
          setShareSiteName(value);
          setShareSiteNameOriginal(value);
          const fav = (profData.profile?.brand_favicon_url ?? "") as string;
          setBrandFaviconUrl(fav);
          setBrandFaviconUrlOriginal(fav);
        }
      } catch {
        if (!cancelled) toast.error(t("errNetwork"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPaid, t]);

  async function handleFaviconUpload(file: File) {
    if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".ico")) {
      toast.error(t("errImageOnly"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("errImageTooLarge2"));
      return;
    }
    setUploadingFavicon(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `favicons/${user.id}/favicon-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
      setBrandFaviconUrl(urlData.publicUrl);
      toast.success(t("faviconUploaded"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Favicon upload failed:", err);
      toast.error(t("errFaviconUpload", { msg }));
    } finally {
      setUploadingFavicon(false);
    }
  }

  async function handleSaveFavicon() {
    setSavingFavicon(true);
    try {
      const trimmed = brandFaviconUrl.trim();
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_favicon_url: trimmed || null }),
      });
      const data = await res.json();
      if (data.ok) {
        const next = (data.profile?.brand_favicon_url ?? "") as string;
        setBrandFaviconUrl(next);
        setBrandFaviconUrlOriginal(next);
        toast.success(t("saved"));
      } else {
        toast.error(data.error ?? t("errGeneric"));
      }
    } catch {
      toast.error(t("errNetwork"));
    } finally {
      setSavingFavicon(false);
    }
  }

  async function handleSaveShareSiteName() {
    setSavingShareSiteName(true);
    try {
      const trimmed = shareSiteName.trim();
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_site_name: trimmed || null }),
      });
      const data = await res.json();
      if (data.ok) {
        const next = (data.profile?.share_site_name ?? "") as string;
        setShareSiteName(next);
        setShareSiteNameOriginal(next);
        toast.success(t("saved"));
      } else {
        toast.error(data.error ?? t("errGeneric"));
      }
    } catch {
      toast.error(t("errNetwork"));
    } finally {
      setSavingShareSiteName(false);
    }
  }

  function handleCreated(domain: CustomDomainRow, registrar: RegistrarInfo | null) {
    setDomains((prev) => [domain, ...prev]);
    if (registrar) {
      setRegistrars((prev) => ({ ...prev, [domain.id]: registrar }));
    }
  }

  function handleUpdated(next: CustomDomainRow) {
    setDomains((prev) => prev.map((d) => (d.id === next.id ? next : d)));
  }

  function handleDeleted(id: string) {
    setDomains((prev) => prev.filter((d) => d.id !== id));
    setRegistrars((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }

  if (!isPaid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("customDomainsTitle")}
          </CardTitle>
          <CardDescription>{t("customDomainsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-3">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">{t("customDomainsUpsellTitle")}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("customDomainsUpsellDesc")}
            </p>
            <Button asChild variant="default" className="rounded-full">
              <a href="/settings?tab=account">{t("customDomainsUpsellCta")}</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Au moins un domain vérifié → on affiche le bloc "nom de marque".
  // Sinon l'option n'a aucun effet (le backend ne l'applique que sur
  // les routes servies via un custom domain).
  const hasVerifiedDomain = domains.some((d) => d.status === "verified");
  const firstVerifiedHost = domains.find((d) => d.status === "verified")?.hostname || "";
  const shareSiteNameDirty = shareSiteName.trim() !== shareSiteNameOriginal.trim();
  const faviconDirty = brandFaviconUrl.trim() !== brandFaviconUrlOriginal.trim();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("customDomainsTitle")}
            </CardTitle>
            <CardDescription>{t("customDomainsDesc")}</CardDescription>
          </div>
          <AddCustomDomainDialog
            cnameTarget={cnameTarget || "connect.tipote.com"}
            onCreated={handleCreated}
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : domains.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              {t("customDomainsEmpty")}
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <CustomDomainCard
                  key={d.id}
                  domain={d}
                  cnameTarget={cnameTarget || "connect.tipote.com"}
                  registrar={registrars[d.id] ?? null}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {hasVerifiedDomain && (
        <Card>
          <CardHeader>
            <CardTitle>{t("faviconTitle")}</CardTitle>
            <CardDescription>{t("faviconDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              {brandFaviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandFaviconUrl} alt="Favicon" className="h-14 w-14 object-contain rounded-lg border bg-white p-1" />
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
                    disabled={uploadingFavicon}
                    onClick={() => faviconInputRef.current?.click()}
                  >
                    {uploadingFavicon ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                    {t("faviconUploadBtn")}
                  </Button>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFaviconUpload(f);
                    }}
                  />
                </div>
                <Input
                  value={brandFaviconUrl}
                  onChange={(e) => setBrandFaviconUrl(e.target.value)}
                  placeholder={t("faviconUrlPh")}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveFavicon}
                disabled={!faviconDirty || savingFavicon}
              >
                {savingFavicon ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasVerifiedDomain && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("shareSiteNameTitle")}
            </CardTitle>
            <CardDescription>{t("shareSiteNameDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Input
                  value={shareSiteName}
                  onChange={(e) => setShareSiteName(e.target.value.slice(0, 60))}
                  placeholder={firstVerifiedHost || "Mon studio"}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {t("shareSiteNameHint", { fallback: firstVerifiedHost })}
                </p>
              </div>
              <Button
                onClick={handleSaveShareSiteName}
                disabled={!shareSiteNameDirty || savingShareSiteName}
              >
                {savingShareSiteName ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
