// app/auth/forgot-password/page.tsx
// Page "mot de passe oublié" : demande l'email et déclenche l'envoi du
// lien de reset (email Resend maison via /api/auth/forgot-password).

import { Suspense } from "react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
