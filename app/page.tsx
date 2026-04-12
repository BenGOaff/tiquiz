// app/page.tsx
// Rôle : page d'accueil qui affiche LoginForm (comme Tipote).
// Pas de landing page — toute la vente est sur Systeme.io.

import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
