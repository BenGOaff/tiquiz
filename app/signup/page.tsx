// app/signup/page.tsx
//
// L'inscription directe sur Tiquiz est DESACTIVEE (Bene 14 juillet 2026 :
// "il ne devrait pas pouvoir s'inscrire directement sur Tiquiz, mais
// obligatoirement passer par ma page de capture systeme io"). On redirige
// donc toute tentative d'inscription vers la page de capture Systeme.io,
// qui provisionne ensuite le compte via le webhook / free-optin.
//
// URL surchargeable par env (NEXT_PUBLIC_TIQUIZ_SIGNUP_URL) pour que Bene
// puisse la changer sans redeploiement ; defaut = la page fournie.
//
// NB : le blocage cote UI (cette redirection + retrait des liens) empeche
// l'inscription normale. Le verrou DEFINITIF est cote Supabase : desactiver
// "Allow new users to sign up" dans Auth. Le provisioning Systeme.io passe
// par admin.createUser (service-role) et n'est PAS affecte par ce reglage.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SIGNUP_CAPTURE_URL =
  process.env.NEXT_PUBLIC_TIQUIZ_SIGNUP_URL ??
  "https://www.tipote.fr/part-tiquiz-gratuit";

export default function SignupPage() {
  redirect(SIGNUP_CAPTURE_URL);
}
