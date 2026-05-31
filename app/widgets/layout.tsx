// app/widgets/layout.tsx
//
// Layout MINIMAL pour les widgets embarquables (compteur preuve sociale
// sur la sales page Systeme.io, etc.). On ne charge PAS la sidebar /
// header / next-intl provider de l'app — juste le strict nécessaire
// pour rendre une page autonome dans un <iframe>.
//
// Le middleware autorise `frame-ancestors *` sur /widgets/* (cf.
// middleware.ts) → Systeme.io peut l'embarquer sans X-Frame-Options.

import "@/app/globals.css";

export default function WidgetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Aucune dépendance globale (pas de Tailwind extra, pas de
            providers) : le widget gère ses propres styles inline. Le
            body est transparent par défaut pour que la page hôte
            (Systeme.io) voit son propre fond derrière les cards. */}
        <meta name="robots" content="noindex" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "transparent" }}>
        {children}
      </body>
    </html>
  );
}
