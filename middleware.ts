// middleware.ts
// Protection auth de L'Atelier du Quiz. Rafraîchit la session Supabase et garde
// les routes membre + admin. Mono-langue, donc pas de logique de locale
// (contrairement à Tiquiz).

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminEmail } from "@/lib/adminEmails";

// Routes accessibles sans être connecté.
const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/bienvenue",
  "/nouveau-mot-de-passe",
  "/mot-de-passe-oublie",
  "/api/systeme-io",
  "/api/auth",
  "/api/cron",
  // Tracking affilié : webhooks Systeme.io + tracker JS, appelés sans session.
  "/api/affiliate",
];

// Routes réservées à l'élève connecté (enrollment vérifié plus loin
// dans les pages elles-mêmes / la RLS).
const PROTECTED_PREFIXES = ["/dashboard", "/jour", "/carnet", "/profil", "/diagnostic", "/funnel", "/affiliation", "/api/me", "/api/days", "/api/integrations"];

// Routes réservées à l'admin.
const ADMIN_PREFIXES = ["/admin", "/api/admin"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisse passer les assets et les routes publiques.
  if (startsWithAny(pathname, PUBLIC_PREFIXES)) {
    return NextResponse.next();
  }

  const needsAuth = startsWithAny(pathname, PROTECTED_PREFIXES);
  const needsAdmin = startsWithAny(pathname, ADMIN_PREFIXES);
  if (!needsAuth && !needsAdmin) {
    return NextResponse.next();
  }

  // Prépare une réponse mutable pour que Supabase puisse rafraîchir les
  // cookies de session.
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (needsAdmin && !isAdminEmail(user.email)) {
    // Un élève ne voit jamais l'admin : on le renvoie à son tableau de bord.
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  // On exclut les assets statiques de Next et le favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
