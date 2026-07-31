"use client";

// app/auth/reset-password/page.tsx
// Choix du nouveau mot de passe après un lien recovery. La session vient
// d'être posée par /auth/callback (tokens en hash) : si elle manque, on
// renvoie au login plutôt que d'afficher un formulaire qui échouerait.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import SetPasswordForm from "@/components/auth/SetPasswordForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const t = useTranslations("resetPasswordPage");
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data?.session) {
        router.replace("/login?auth_error=not_authenticated");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/tiquiz-logo (2).png" alt="Tiquiz" className="h-12 w-auto mx-auto mb-2" />
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">{t("pageTitle")}</CardTitle>
            <CardDescription className="text-center">{t("pageDesc")}</CardDescription>
          </CardHeader>

          <CardContent>
            {ready ? (
              <>
                <SetPasswordForm mode="reset" />
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => router.push("/dashboard")}
                >
                  {t("goDashboard")}
                </Button>
              </>
            ) : (
              <div className="min-h-[120px] flex items-center justify-center">
                <p className="text-muted-foreground">{t("pageLoading")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
