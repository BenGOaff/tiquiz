import { redirect } from "next/navigation";

// La racine renvoie vers le tableau de bord (le middleware redirige
// vers /login si pas de session).
export default function Home() {
  redirect("/dashboard");
}
