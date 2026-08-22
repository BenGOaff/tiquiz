// middleware.ts
// Auth protection + locale detection for Tiquiz, plus custom-domain
// host gating (Caddy on-demand TLS routes any creator-owned hostname
// to us; we restrict what paths that hostname can serve and pass the
// host down to route handlers via a request header for ownership
// checks).

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminEmail } from "@/lib/adminEmails";
import { customDomainsEnabled, isOwnHost, normaliseHost } from "@/lib/customDomains";
import { routeTenantPath, TENANT_SLUG_PREFIX } from "@/lib/publicSlug";
import { salesSlugForHost } from "@/lib/sales/salesHosts";
import { readSa, SA_COOKIE, SA_MAX_AGE_SECONDS, SA_PARAM } from "@/lib/affiliate/sa";

const UI_LOCALE_COOKIE = "ui_locale";
const SUPPORTED_LOCALES = ["en", "fr", "es", "it", "ar", "pt", "pt-BR"];
const DEFAULT_LOCALE = "en";

// Header forwarded to route handlers when the request arrived through
// a creator's custom domain. Route handlers read it (via `headers()`
// in server components, or `req.headers` in route handlers) to validate
// that the resolved quiz/popquiz actually belongs to that domain.
const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

// Two-pass match: try the full BCP 47 tag first ("pt-BR" → "pt-BR"),
// then fall back to the language-only prefix ("pt-BR" → "pt"). This is
// what gives a Brazilian browser "pt-BR" instead of forcing it to "pt".
function detectLocaleFromHeader(req: NextRequest): string {
  const acceptLang = req.headers.get("accept-language") ?? "";
  const tags = acceptLang
    .split(",")
    .map((l) => l.split(";")[0].trim())
    .filter(Boolean);

  for (const tag of tags) {
    const match = SUPPORTED_LOCALES.find(
      (l) => l.toLowerCase() === tag.toLowerCase(),
    );
    if (match) return match;
  }
  for (const tag of tags) {
    const prefix = tag.split("-")[0].toLowerCase();
    const match = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === prefix);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/quiz",
  "/quizzes",
  "/popquiz",
  "/popquizzes",
  "/settings",
  "/leads",
  "/stats",
  "/admin",
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // -------------------------------------------------------------------
  // LE `?sa=` D'UNE AFFILIEE, RANGE DES LA PREMIERE PAGE.
  //
  // Sur un tunnel Systeme.io, c'etait leur page qui le captait. Sur
  // notre domaine, personne ne le fait : sans cette ligne, une affiliee
  // qui envoie du monde sur tiquiz.fr n'est payee sur RIEN, et le
  // symptome est le pire qui soit puisqu'il n'y en a aucun. Tout marche,
  // l'argent rentre, et la commission n'existe pas.
  //
  // On le pose sur TOUTES les reponses, y compris la reecriture de la
  // page de vente : c'est justement la page ou le lien atterrit.
  // -------------------------------------------------------------------
  const sa = readSa(req.nextUrl.searchParams.get(SA_PARAM));
  const poseSa = (res: NextResponse): NextResponse => {
    if (sa) {
      res.cookies.set(SA_COOKIE, sa, {
        maxAge: SA_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        // Lisible par le bon de commande : c'est LUI qui doit le
        // transmettre a Stripe. `httpOnly` le rendrait invisible au
        // navigateur, donc inutile.
        httpOnly: false,
        secure: req.nextUrl.protocol === "https:",
      });
    }
    return res;
  };

  // -------------------------------------------------------------------
  // NOS DOMAINES DE VENTE (tiquiz.fr).
  //
  // Ils passent AVANT le portier des domaines personnalises : sans ca,
  // `tiquiz.fr` serait pris pour le domaine d'une creatrice et
  // repondrait 404 a tout sauf a un slug de quiz.
  //
  // La racine sert la page de vente. On REECRIT au lieu de rediriger :
  // l'adresse vue par le visiteur reste `tiquiz.fr`, et le partage d'un
  // lien ne fait pas apparaitre un chemin technique.
  //
  // Le reste des chemins passe normalement : c'est ce qui laisse
  // `/commande/...`, `/api/...` et les fichiers de la page fonctionner
  // sur ce domaine.
  // -------------------------------------------------------------------
  const slugDeVente = salesSlugForHost(req.headers.get("host"));
  if (slugDeVente && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/apercu/vente/${slugDeVente}`;
    return poseSa(NextResponse.rewrite(url));
  }

  // -------------------------------------------------------------------
  // Custom-domain gate. Runs first so a creator-owned hostname can
  // never accidentally land on /dashboard, /login, /admin, etc.
  //
  // We do NOT touch the database here — Edge runtime, latency-sensitive
  // path. We just detect "Host is not one of ours" and forward the
  // hostname to route handlers, which already use supabaseAdmin and
  // can validate ownership without a second hop.
  //
  // Gated behind CUSTOM_DOMAINS_ENABLED so this code is dormant until
  // the VPS-side Caddy config is in place (Step 2+). The hostname
  // never matches a creator domain before that, but extra belt-and-
  // braces costs nothing.
  // -------------------------------------------------------------------
  if (customDomainsEnabled()) {
    const rawHost = req.headers.get("host");
    if (!isOwnHost(rawHost)) {
      const host = normaliseHost(rawHost)!;
      const route = routeTenantPath(pathname);
      if (route.kind === "block") {
        return new NextResponse("Not found", { status: 404 });
      }
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set(CUSTOM_HOST_HEADER, host);
      // Le slug nu est RÉÉCRIT vers un chemin qui n'est pas une page de
      // l'app. Sans ça, le routeur Next ferait gagner sa route statique
      // contre le catch-all, et un quiz nommé "quiz", "stats" ou
      // "dashboard" serait inatteignable sur le domaine de sa créatrice.
      // C'est ce qui obligeait à lui interdire ces mots (retour Béné,
      // 4 août 2026). L'URL vue par le visiteur ne change pas.
      if (route.kind === "slug") {
        const url = req.nextUrl.clone();
        url.pathname = `${TENANT_SLUG_PREFIX}/${route.slug}`;
        return poseSa(NextResponse.rewrite(url, { request: { headers: requestHeaders } }));
      }
      return poseSa(NextResponse.next({ request: { headers: requestHeaders } }));
    }
  }

  // Public routes — never block
  if (pathname === "/") return poseSa(NextResponse.next());

  // Public quiz pages /q/..., public popquiz pages /p/..., API,
  // embed, _next, auth, legal, login, signup, favicon.
  if (
    pathname.startsWith("/q/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/embed/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/legal/") ||
    // Pages de vente servies par nous. PUBLIQUES par nature : un
    // visiteur qui decouvre Tiquiz n'a evidemment pas de session. Sans
    // cette ligne le middleware le renverrait vers /login, ce qui
    // transformerait une page de vente en cul-de-sac.
    // La porte de l'apercu n'est pas ici : c'est la cle
    // SALES_PREVIEW_TOKEN dans l'URL, verifiee par la route elle-meme.
    pathname.startsWith("/apercu/") ||
    pathname.startsWith("/v/") ||
    // Le bon de commande et son retour de paiement. Publics par la meme
    // evidence : quelqu'un qui achete Tiquiz n'a pas encore de compte,
    // c'est justement l'achat qui le lui cree. Ils restent fermes par la
    // cle SALES_PREVIEW_TOKEN tant que le chantier n'est pas ouvert.
    pathname.startsWith("/commande/") ||
    // La page ou quelqu'un qui vient de resilier dit POURQUOI. Publique
    // par la meme evidence que le bon de commande, en sens inverse :
    // elle n'a plus d'abonnement et peut ne plus avoir de compte du
    // tout. Sans cette ligne, le middleware la renverrait vers /login,
    // ce qui reviendrait a lui demander de se connecter pour repondre a
    // une question qu'on lui pose. On n'aurait aucune reponse.
    // L'autorisation est ailleurs : le jeton SIGNE dans l'URL, verifie
    // par la page et par la route (lib/churn/replyToken.ts).
    pathname.startsWith("/depart/") ||
    // ECRIRE AU SUPPORT NE DEMANDE PAS D'ETRE CONNECTEE.
    //
    // Celle qui a le plus besoin d'aide est justement celle qui n'arrive
    // PAS a se connecter. La renvoyer vers /login pour signaler qu'elle
    // n'arrive pas a s'y connecter serait un cul-de-sac parfait.
    // La protection est ailleurs : la route limite le nombre de demandes
    // par adresse IP, et ne lit jamais rien.
    pathname === "/support" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/favicon.ico"
  ) {
    const res = NextResponse.next();
    // The /embed/preview page is loaded inside <iframe> on third-party
    // landing pages (systeme.io, Carrd…). Strip framing restrictions
    // and set a permissive frame-ancestors so the iframe can render.
    // This is safe: the page only exposes anonymous-session draft data
    // already gated by the opaque session_token.
    // Same treatment for /widgets/* (social proof counter etc.) which
    // are designed to be embedded on the Tiquiz sales page (tipote.fr).
    if (pathname.startsWith("/embed/") || pathname.startsWith("/widgets/")) {
      res.headers.set("Content-Security-Policy", "frame-ancestors *");
      res.headers.delete("X-Frame-Options");
    }
    if (!req.cookies.get(UI_LOCALE_COOKIE)?.value) {
      res.cookies.set(UI_LOCALE_COOKIE, detectLocaleFromHeader(req), {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
      });
    }
    return poseSa(res);
  }

  // Protected routes — require auth
  if (startsWithAny(pathname, PROTECTED_PREFIXES)) {
    const res = NextResponse.next();

    // Set locale cookie if missing
    const hasLocaleCookie = !!req.cookies.get(UI_LOCALE_COOKIE)?.value;
    if (!hasLocaleCookie) {
      res.cookies.set(UI_LOCALE_COOKIE, detectLocaleFromHeader(req), {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
      });
    }

    // Check auth via Supabase
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return req.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                res.cookies.set(name, value, options);
              });
            },
          },
        },
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return poseSa(NextResponse.redirect(loginUrl));
      }

      // Admin route protection
      if (pathname.startsWith("/admin") && !isAdminEmail(user.email)) {
        return poseSa(NextResponse.redirect(new URL("/dashboard", req.url)));
      }
    } catch {
      // Fail-open: never block on Supabase errors
    }

    return poseSa(res);
  }

  return poseSa(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
