// app/api/me/affiliate-emails/route.ts
// L'affilié enregistre / réinitialise SA version d'un email de vente (espace
// Affiliation > Emails). Stocké dans profiles.affiliate_email_overrides (JSON
// par numéro d'email). RLS : l'affilié ne touche que sa propre ligne.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const schema = z.object({
  n: z.number().int().min(1).max(50),
  subject: z.string().max(300).nullable().optional(),
  // HTML produit par l'éditeur WYSIWYG. null = réinitialise cet email.
  bodyHtml: z.string().max(20000).nullable().optional(),
});

/** Nettoyage léger : contenu self-scoped, mais on retire scripts / handlers. */
function sanitize(html: string): string {
  return html
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauth" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "bad_body" }, { status: 400 });
  }
  const { n, subject, bodyHtml } = parsed.data;

  const { data: row } = await supabase
    .from("profiles")
    .select("affiliate_email_overrides")
    .eq("id", user.id)
    .maybeSingle();
  const overrides = {
    ...(((row as { affiliate_email_overrides?: Record<string, unknown> } | null)?.affiliate_email_overrides) ?? {}),
  } as Record<string, { subject?: string | null; bodyHtml?: string | null }>;

  const key = String(n);
  const reset = (subject === null || subject === undefined) && (bodyHtml === null || bodyHtml === undefined);
  if (reset) {
    delete overrides[key];
  } else {
    overrides[key] = {
      ...(overrides[key] ?? {}),
      ...(subject !== undefined ? { subject: subject } : {}),
      ...(bodyHtml !== undefined ? { bodyHtml: bodyHtml === null ? null : sanitize(bodyHtml) } : {}),
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ affiliate_email_overrides: overrides, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return NextResponse.json({ ok: false, reason: "db" }, { status: 400 });

  return NextResponse.json({ ok: true, reset });
}
