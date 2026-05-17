// app/api/custom-domain/[id]/verify/route.ts
// Re-run the DNS check on demand from the Settings UI. Updates the row
// in place and returns it so the caller can re-render without a second
// GET.
//
// Idempotent: calling repeatedly just flips status between pending_dns
// / verified / failed as DNS state evolves. Always safe to spam.

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { DNS_TARGET_IP, verifyDomainDns } from "@/lib/customDomains";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // RLS narrows this to the caller's rows so we don't need an extra
  // user_id filter for security; the .eq below just makes the 404 path
  // clearer than letting RLS silently return empty.
  const { data: existing } = await supabase
    .from("custom_domains")
    .select("id, hostname, verified_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const dnsCheck = await verifyDomainDns(existing.hostname);
  const now = new Date().toISOString();
  const status = dnsCheck.ok ? "verified" : "failed";
  const errorMessage = dnsCheck.ok
    ? null
    : dnsCheck.resolvedIps.length > 0
      ? `DNS resolves to ${dnsCheck.resolvedIps.join(", ")} instead of ${DNS_TARGET_IP}.`
      : (dnsCheck.error ?? "Hostname does not resolve yet.");

  const { data: updated, error } = await supabase
    .from("custom_domains")
    .update({
      status,
      error_message: errorMessage,
      last_checked_at: now,
      // Preserve the original verified_at when the domain was already
      // verified before — useful to surface "verified since X" in the UI.
      verified_at: dnsCheck.ok ? (existing.verified_at ?? now) : existing.verified_at,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, domain: updated });
}
