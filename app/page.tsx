// app/page.tsx
// Landing page Tiquiz — redirects authenticated users to dashboard
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  BarChart3,
  Mail,
  Zap,
  Globe,
  Share2,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";

export default async function HomePage() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  } catch {
    // fail-open
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="w-full border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/tiquiz-logo (2).png"
              alt="Tiquiz"
              width={120}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg gradient-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 shadow-md"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-tq-turquoise/10" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[200px] h-[200px] rounded-full bg-tq-turquoise/10" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white/90 mb-6 border border-tq-turquoise/30 bg-tq-turquoise/20">
            <Sparkles className="h-3.5 w-3.5 text-tq-turquoise" />
            Propulsé par l&apos;IA
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6 leading-tight">
            Crée des quiz engageants.
            <br />
            <span className="text-tq-turquoise">Capture des leads.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crée des quiz interactifs en quelques minutes avec l&apos;IA,
            capture des emails et synchronise automatiquement tes leads avec Systeme.io.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-tq-turquoise px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 shadow-lg"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-white/20"
            >
              Se connecter
            </Link>
          </div>
          <p className="text-white/40 text-sm mt-5">Gratuit — aucune carte bancaire requise</p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-tq-navy mb-4">
              Tout ce qu&apos;il te faut pour tes quiz
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              De la création à la capture de leads, en passant par le CRM. Simple, rapide, puissant.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "Génération IA",
                desc: "Décris ton objectif et laisse l'IA créer un quiz complet en quelques secondes : questions, résultats, CTA.",
              },
              {
                icon: ClipboardList,
                title: "Quiz interactifs",
                desc: "Parcours multi-étapes responsive avec capture email, résultats personnalisés et CTA par profil.",
              },
              {
                icon: Mail,
                title: "Capture de leads",
                desc: "Email, prénom, nom, téléphone, pays — configure les champs dont tu as besoin, consent RGPD inclus.",
              },
              {
                icon: Zap,
                title: "Sync Systeme.io",
                desc: "Auto-tagging, inscription formation, ajout communauté — tes leads arrivent dans ton CRM automatiquement.",
              },
              {
                icon: Globe,
                title: "5 langues + RTL",
                desc: "Quiz et interface en français, anglais, espagnol, italien et arabe avec support RTL complet.",
              },
              {
                icon: Share2,
                title: "Viralité intégrée",
                desc: "Bonus de partage pour tes leads. Plus ils partagent, plus tu captures — avec tag SIO dédié.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-tq-turquoise/30"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-tq-turquoise/10">
                  <Icon className="h-5 w-5 text-tq-turquoise" />
                </div>
                <h3 className="text-lg font-semibold text-tq-navy mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 sm:py-24 bg-primary/[0.03]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-tq-navy mb-4">
              3 étapes, c&apos;est tout
            </h2>
            <p className="text-lg text-muted-foreground">
              De l&apos;idée au quiz publié en moins de 5 minutes.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Décris ton quiz", desc: "Objectif, audience cible, ton souhaité. L'IA fait le reste." },
              { step: "2", title: "Personnalise & publie", desc: "Ajuste les questions, résultats et CTA. Configure Systeme.io. Publie." },
              { step: "3", title: "Capture des leads", desc: "Partage le lien. Les leads arrivent dans ton dashboard et ton CRM." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 text-lg font-bold text-white gradient-primary">
                  {step}
                </div>
                <h3 className="text-lg font-semibold text-tq-navy mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing hint ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-tq-navy mb-4">
            Commence gratuitement
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            1 quiz + 10 réponses/mois offerts. Passe en illimité quand tu es prêt.
          </p>

          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 text-left shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl font-bold text-tq-navy">Gratuit</div>
              <span className="text-sm text-muted-foreground">pour toujours</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "1 quiz",
                "10 réponses par mois",
                "Génération IA",
                "Sync Systeme.io",
                "5 langues",
                "Quiz public responsive",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-tq-turquoise" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl w-full gradient-primary px-6 py-3.5 text-base font-semibold text-white transition-all hover:opacity-90 shadow-md"
            >
              Créer mon premier quiz
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-[-40px] left-[50%] w-[200px] h-[200px] rounded-full bg-tq-turquoise/10" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Prêt à capturer tes premiers leads ?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Rejoins Tiquiz et crée ton premier quiz en moins de 5 minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-tq-turquoise px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 shadow-lg"
          >
            Commencer maintenant
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/tiquiz-logo (2).png"
              alt="Tiquiz"
              width={80}
              height={28}
              className="h-6 w-auto"
            />
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Tiquiz. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
