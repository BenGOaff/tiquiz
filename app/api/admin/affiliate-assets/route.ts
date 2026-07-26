// app/api/admin/affiliate-assets/route.ts
// Gestion des visuels affiliés (admin only). Upload via service role dans le
// bucket public 'affiliate-assets', enregistrement de la ligne, suppression
// (fichier + ligne). Les lectures pour les affiliés se font côté serveur
// (page Affiliation), pas ici.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const BUCKET = "affiliate-assets";
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo : bannières / mockups confortables.

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_form" }, { status: 400 });
  }

  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const kind = String(form.get("kind") ?? "visuel").trim() || "visuel";

  if (!title) return NextResponse.json({ ok: false, reason: "no_title" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, reason: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "too_large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Chemin stable et lisible : timestamp + nom slugifié. (Date.now côté
  // serveur Node : autorisé ici, ce n'est pas un script de workflow.)
  const path = `assets/${Date.now()}-${slugify(file.name || "fichier")}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
  if (upErr) {
    return NextResponse.json({ ok: false, reason: "upload_failed", error: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const { data: row, error: insErr } = await supabaseAdmin
    .from("affiliate_assets")
    .insert({ title, description: description || null, kind, url, storage_path: path, file_type: file.type || null })
    .select("id, title, description, kind, url, file_type, created_at")
    .single();
  if (insErr) {
    // Rollback best-effort du fichier orphelin.
    await supabaseAdmin.storage.from(BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ ok: false, reason: "db_failed", error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, asset: row });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ ok: false, reason: "no_id" }, { status: 400 });

  const { data: row } = await supabaseAdmin
    .from("affiliate_assets")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const storagePath = (row as { storage_path?: string | null } | null)?.storage_path;
  if (storagePath) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]).catch(() => {});
  }
  const { error } = await supabaseAdmin.from("affiliate_assets").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_failed", error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
