// app/page.tsx
// Landing page Tiquiz — redirects authenticated users to dashboard
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #5D6CDB 0%, #2E386E 100%)" }}>
              T
            </div>
            <span className="text-xl font-bold" style={{ color: "var(--tiquiz-navy)" }}>
              Tiquiz
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              style={{ color: "var(--tiquiz-navy)" }}
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 shadow-md"
              style={{ background: "linear-gradient(135deg, #5D6CDB 0%, #2E386E 100%)" }}
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(93,108,219,0.95) 0%, rgba(30,38,84,0.98) 100%)" }}
        />
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full opacity-10" style={{ background: "#20bbe6" }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[200px] h-[200px] rounded-full opacity-10" style={{ background: "#20bbe6" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white/90 mb-6" style={{ background: "rgba(32,187,230,0.2)", border: "1px solid rgba(32,187,230,0.3)" }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: "#20bbe6" }} />
            Propulsé par l&apos;IA
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6 leading-tight">
            Crée des quiz engageants.
            <br />
            <span style={{ color: "#20bbe6" }}>Capture des leads.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crée des quiz interactifs en quelques minutes avec l&apos;IA,
            capture des emails et synchronise automatiquement tes leads avec Systeme.io.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 shadow-lg"
              style={{ background: "#20bbe6" }}
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--tiquiz-navy)" }}>
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
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-transparent"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: "rgba(32,187,230,0.1)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#20bbe6" }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--tiquiz-navy)" }}>
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 sm:py-24" style={{ background: "rgba(93,108,219,0.03)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--tiquiz-navy)" }}>
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
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 text-lg font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #5D6CDB 0%, #2E386E 100%)" }}
                >
                  {step}
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--tiquiz-navy)" }}>
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing hint ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--tiquiz-navy)" }}>
            Commence gratuitement
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            1 quiz + 10 réponses/mois offerts. Passe en illimité quand tu es prêt.
          </p>

          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 text-left">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl font-bold" style={{ color: "var(--tiquiz-navy)" }}>Gratuit</div>
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
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "#20bbe6" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl w-full px-6 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 shadow-md"
              style={{ background: "linear-gradient(135deg, #5D6CDB 0%, #2E386E 100%)" }}
            >
              Créer mon premier quiz
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(93,108,219,0.95) 0%, rgba(30,38,84,0.98) 100%)" }}
        />
        <div className="absolute top-[-40px] left-[50%] w-[200px] h-[200px] rounded-full opacity-10" style={{ background: "#20bbe6" }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Prêt à capturer tes premiers leads ?
          </h2>
          <p className="text-lg text-white/70 mb-8">
            Rejoins Tiquiz et crée ton premier quiz en moins de 5 minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 shadow-lg"
            style={{ background: "#20bbe6" }}
          >
            Commencer maintenant
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, #5D6CDB 0%, #2E386E 100%)" }}>
              T
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--tiquiz-navy)" }}>
              Tiquiz
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Tiquiz. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
