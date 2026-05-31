// app/auth/callback/page.tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import CallbackClient from "./CallbackClient";

export const dynamic = "force-dynamic";

export default async function AuthCallbackPage() {
  const t = await getTranslations("callbackPage");
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-full max-w-md rounded-2xl border border-border p-6 shadow-lg">
            <h1 className="text-xl font-semibold mb-2">{t("loadingTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("loadingDesc")}</p>
          </div>
        </main>
      }
    >
      <CallbackClient />
    </Suspense>
  );
}
