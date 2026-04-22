"use client";

// components/auth/SetPasswordForm.tsx
// Ported from tipote-app/components/SetPasswordForm.tsx.
// Lets the user set or change their Supabase auth password so they can sign in
// with email + password instead of relying on magic links every time.

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, Lock, ArrowRight } from "lucide-react";

type SetPasswordFormProps = {
  /** "first" = initial set (e.g. after magic-link invite); "reset" = change existing */
  mode?: "first" | "reset";
};

export default function SetPasswordForm({ mode = "reset" }: SetPasswordFormProps) {
  const t = useTranslations("resetPasswordPage");
  const supabase = getSupabaseBrowserClient();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function mapUpdateUserErrorMessage(message: string) {
    const m = (message || "").toLowerCase();
    if (m.includes("auth session missing") || m.includes("session_not_found") || m.includes("not authenticated")) {
      return t("errSessionExpired");
    }
    if (m.includes("password") && (m.includes("should be") || m.includes("at least") || m.includes("weak"))) {
      return message;
    }
    if (m.includes("same password") || (m.includes("different") && m.includes("password"))) {
      return t("errSamePassword");
    }
    return t("errUpdateFailed");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!password || !confirmPassword) {
      setErrorMsg(t("errFillBoth"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(t("errMismatch"));
      return;
    }
    if (password.length < 8) {
      setErrorMsg(t("errMinLength"));
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setErrorMsg(mapUpdateUserErrorMessage(updateError.message || ""));
        setIsLoading(false);
        return;
      }
      setSuccessMsg(mode === "first" ? t("successFirst") : t("successReset"));
      setPassword("");
      setConfirmPassword("");
    } catch {
      setErrorMsg(t("errUnexpected"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">{t("labelNewPassword")}</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">{t("labelConfirm")}</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("hintMinLength")}</p>

      {errorMsg && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
          {errorMsg}
        </p>
      )}

      {successMsg && (
        <p className="text-sm text-primary bg-primary/10 border border-primary/30 rounded-md px-3 py-2">
          {successMsg}
        </p>
      )}

      <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
        {isLoading ? t("saving") : (<>{t("submit")}<ArrowRight className="ml-2 h-4 w-4" /></>)}
      </Button>
    </form>
  );
}
