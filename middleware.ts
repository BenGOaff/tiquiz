// middleware.ts
// Auth protection + locale detection for Tiquiz.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminEmail } from "@/lib/adminEmails";

const UI_LOCALE_COOKIE = "ui_locale";
const SUPPORTED_LOCALES = ["en", "fr", "es", "it", "ar", "pt", "pt-BR"];
const DEFAULT_LOCALE = "en";

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

const PROTECTED_PREFIXES = ["/dashboard", "/quiz", "/quizzes", "/settings", "/leads", "/stats", "/admin"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — never block
  if (pathname === "/") return NextResponse.next();

  // Public quiz pages /q/... and API routes
  if (
    pathname.startsWith("/q/") ||
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
