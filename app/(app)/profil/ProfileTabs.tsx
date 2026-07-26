"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, KeyRound, Camera, User, Settings } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Avatar } from "@/components/Avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_OPTIONS,
  MATURITY_OPTIONS,
  MONETIZATION_OPTIONS,
  ADS_OPTIONS,
  type ActivityType,
  type Maturity,
  type Monetization,
  type AdsBudget,
} from "@/lib/businessProfile";

type Tab = "profil" | "reglages";

export function ProfileTabs({
  userId,
  email,
  initialTab,
  firstName: initialFirstName,
  niche: initialNiche,
  activity: initialActivity,
  maturity: initialMaturity,
  monetization: initialMonetization,
  adsBudget: initialAds,
  avatarUrl: initialAvatarUrl,
}: {
  userId: string;
  email: string | null;
  initialTab: Tab;
  firstName: string;
  niche: string;
  activity: ActivityType | null;
  maturity: Maturity | null;
  monetization: Monetization | null;
  adsBudget: AdsBudget | null;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  const [firstName, setFirstName] = useState(initialFirstName);
  const [niche, setNiche] = useState(initialNiche);
  const [activity, setActivity] = useState<ActivityType | null>(initialActivity);
  const [maturity, setMaturity] = useState<Maturity | null>(initialMaturity);
  const [monetization, setMonetization] = useState<Monetization | null>(initialMonetization);
  const [ads, setAds] = useState<AdsBudget | null>(initialAds);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choisis une image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image trop lourde (3 Mo max).");
      return;
    }
    setUploading(true);
    const supabase = getSupabaseBrowserClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error("Upload impossible. Réessaie.");
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setUploading(false);
    if (updErr) {
      toast.error("Enregistrement impossible.");
      return;
    }
    setAvatarUrl(url);
    toast.success("Photo mise à jour.");
    router.refresh();
  }

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !niche.trim() || !activity || !maturity || !monetization || !ads) {
      toast.error("Remplis tous les champs pour enregistrer.");
      return;
    }
    setSavingInfo(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          niche: niche.trim(),
          activityType: activity,
          maturity,
          monetization,
          adsBudget: ads,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Profil mis à jour.");
      router.refresh();
    } catch {
      toast.error("Enregistrement impossible. Réessaie.");
    } finally {
      setSavingInfo(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Choisis un mot de passe d'au moins 8 caractères.");
      return;
    }
    setSavingPwd(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPwd(false);
    if (error) {
      toast.error("Le mot de passe n'a pas pu être changé. Réessaie.");
      return;
    }
    setPassword("");
    toast.success("Mot de passe mis à jour.");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Onglets */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface-soft p-1">
        <TabButton active={tab === "profil"} onClick={() => setTab("profil")} icon={User}>
          Profil
        </TabButton>
        <TabButton active={tab === "reglages"} onClick={() => setTab("reglages")} icon={Settings}>
          Réglages
        </TabButton>
      </div>

      {tab === "profil" && (
        <Card>
          <CardContent className="flex flex-col gap-5 py-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar src={avatarUrl} name={firstName} email={email} className="size-16 text-lg" />
              <div className="flex flex-col gap-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera />
                  {uploading ? "Envoi..." : "Changer la photo"}
                </Button>
                <span className="text-xs text-muted-foreground">JPG ou PNG, 3 Mo max.</span>
              </div>
            </div>

            <form onSubmit={saveInfo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email ?? ""} disabled />
                <p className="text-xs text-muted-foreground">
                  L'email de ton compte ne se change pas ici. Écris-moi si besoin.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ton prénom"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="niche">Ma niche</Label>
                <Textarea
                  id="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  rows={2}
                  placeholder="J'aide..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Mon activité</Label>
                <div className="flex flex-col gap-2">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <Choice
                      key={opt.value}
                      label={opt.label}
                      selected={activity === opt.value}
                      onClick={() => setActivity(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Où j'en suis</Label>
                <div className="flex flex-col gap-2">
                  {MATURITY_OPTIONS.map((opt) => (
                    <Choice
                      key={opt.value}
                      label={opt.label}
                      selected={maturity === opt.value}
                      onClick={() => setMaturity(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Ma monétisation</Label>
                <div className="flex flex-col gap-2">
                  {MONETIZATION_OPTIONS.map((opt) => (
                    <Choice
                      key={opt.value}
                      label={opt.label}
                      selected={monetization === opt.value}
                      onClick={() => setMonetization(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Budget pub</Label>
                <div className="flex flex-col gap-2">
                  {ADS_OPTIONS.map((opt) => (
                    <Choice
                      key={opt.value}
                      label={opt.label}
                      selected={ads === opt.value}
                      onClick={() => setAds(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={savingInfo}>
                  <Save />
                  {savingInfo ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "reglages" && (
        <Card>
          <CardContent className="py-5">
            <form onSubmit={changePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <KeyRound className="size-4 text-primary" />
                  Changer mon mot de passe
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 8 caractères"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={savingPwd}>
                  {savingPwd ? "Un instant..." : "Mettre à jour"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function Choice({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-surface-soft font-medium ring-1 ring-primary"
          : "border-border bg-background hover:border-primary/50 hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
