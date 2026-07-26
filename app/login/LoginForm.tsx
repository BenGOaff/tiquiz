"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Connexion impossible. Vérifie ton email et ton mot de passe.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function sendMagicLink() {
    if (!email) {
      toast.error("Entre d'abord ton email.");
      return;
    }
    setLoading(true);
    // Passe par NOTRE endpoint serveur (flux implicite, fiable cross-device)
    // au lieu de signInWithOtp (PKCE, cassé si on ouvre le mail sur un autre
    // appareil). Anti-énumération : le serveur répond toujours ok.
    try {
      await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      toast.success("Lien de connexion envoyé. Regarde ta boîte mail.");
    } catch {
      toast.error("Envoi impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-6">
        <form onSubmit={signInWithPassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ton mot de passe"
            />
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Un instant..." : "Se connecter"}
          </Button>
        </form>
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={loading}
            className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            Recevoir un lien de connexion par email
          </button>
          <Link
            href="/mot-de-passe-oublie"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
