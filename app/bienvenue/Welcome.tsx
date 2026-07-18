"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type Phase = "loading" | "password" | "error";

export function Welcome() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // On lit les jetons AVANT d'instancier le client, pour ne pas
    // dependre de l'auto-detection (qui pourrait vider le hash).
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const search = window.location.search;
    const supabase = getSupabaseBrowserClient();

    (async () => {
      try {
        const hp = new URLSearchParams(hash);
        const accessToken = hp.get("access_token");
        const refreshToken = hp.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          const code = new URLSearchParams(search).get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          } else {
            // Deja connecte ?
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
              setPhase("error");
              return;
            }
          }
        }

        // Nettoie l'URL (retire le hash avec les jetons).
        window.history.replaceState(null, "", "/bienvenue");
        setPhase("password");
      } catch {
        setPhase("error");
      }
    })();
  }, []);

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Choisis un mot de passe d'au moins 8 caractères.");
      return;
    }
    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error("Le mot de passe n'a pas pu être enregistré. Réessaie.");
      return;
    }
    toast.success("Mot de passe enregistré. Bienvenue !");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="h-10" />
        </div>

        {phase === "loading" && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              On prépare ton accès, un instant...
            </CardContent>
          </Card>
        )}

        {phase === "error" && (
          <Card>
            <CardContent className="flex flex-col gap-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Ce lien a expiré ou a déjà été utilisé. Tu peux te connecter directement.
              </p>
              <Button asChild>
                <Link href="/login">Aller à la connexion</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === "password" && (
          <Card>
            <CardContent className="flex flex-col gap-4 py-6">
              <div className="flex flex-col gap-1 text-center">
                <h1 className="font-display text-xl font-semibold">Bienvenue dans L'Atelier du Quiz</h1>
                <p className="text-sm text-muted-foreground">
                  Choisis un mot de passe pour tes prochaines connexions.
                </p>
              </div>
              <form onSubmit={setNewPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 8 caractères"
                  />
                </div>
                <Button type="submit" size="lg" disabled={saving}>
                  {saving ? "Un instant..." : "C'est parti"}
                </Button>
              </form>
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Je le ferai plus tard
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
