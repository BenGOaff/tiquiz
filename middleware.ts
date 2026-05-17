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
import { isReservedPublicSlug } from "@/lib/publicSlug";

const UI_LOCALE_COOKIE = "ui_locale";
const SUPPORTED_LOCALES = ["en", "fr", "es", "it", "ar", "pt", "pt-BR"];
const DEFAULT_LOCALE = "en";

// Header forwarded to route handlers when the request arrived through
// a creator's custom domain. Route handlers read it (via `headers()`
// in server components, or `req.headers` in route handlers) to validate
// that the resolved quiz/popquiz actually belongs to that domain.
const CUSTOM_HOST_HEADER = "x-tiquiz-custom-host";

// Slug shape the public catch-all route handles at the root of a
// custom domain. Mirrors lib/quizBranding.sanitizeSlug's regex so
// the middleware never lets a path through that the page would then
// 404 on a malformed slug — keeps the 404 surface small.
const BARE_SLUG_RE = /^\/[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;

// Paths a custom-domain visitor is allowed to hit. Anything else
// returns 404 — we never expose the creator dashboard, admin, login,
// signup, marketing pages, etc. on a creator's branded domain.
function isPublicTenantPath(pathname: string): boolean {
  if (
    pathname.startsWith("/q/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/embed/") ||
    pathname.startsWith("/api/quiz/") ||
    pathname.startsWith("/api/popquiz/") ||
    pathname.startsWith("/api/leads") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt"
  ) {
    return true;
  }
  // Bare-slug shape served by app/[publicSlug]/page.tsx so creators
  // can share `test.ethilife.fr/<slug>` without the /q/ or /p/ prefix.
  // Reserved words are pre-rejected here so the catch-all never has
  // to deal with them.
  if (BARE_SLUG_RE.test(pathname)) {
    const segment = pathname.slice(1);
    if (!isReservedPublicSlug(segment)) return true;
  }
  return false;
}

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
      if (!isPublicTenantPath(pathname) && pathname !== "/") {
        return new NextResponse("Not found", { status: 404 });
      }
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set(CUSTOM_HOST_HEADER, host);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  // Public routes — never block
  if (pathname === "/") return NextResponse.next();

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
    if (pathname.startsWith("/embed/")) {
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
    return res;
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
        return NextResponse.redirect(loginUrl);
      }

      // Admin route protection
      if (pathname.startsWith("/admin") && !isAdminEmail(user.email)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    } catch {
      // Fail-open: never block on Supabase errors
    }

    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
