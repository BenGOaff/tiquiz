import { ForgotForm } from "./ForgotForm";
import { Logo } from "@/components/Logo";

export default function MotDePasseOubliePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Saisis ton email, on t'envoie un lien pour choisir un nouveau mot de passe.
          </p>
        </div>
        <ForgotForm />
      </div>
    </main>
  );
}
