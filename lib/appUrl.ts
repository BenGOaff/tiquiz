// lib/appUrl.ts — URL publique de l'app, lue au RUNTIME.
// On privilegie APP_URL (runtime) a NEXT_PUBLIC_APP_URL (inline au build)
// pour eviter qu'une valeur gravee au build (ex. localhost:3002) fuite dans
// les liens partages. Cf. lib/email/templates.ts.
export function getAppUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://quizing.tipote.com"
  )
    .trim()
    .replace(/\/$/, "");
}
