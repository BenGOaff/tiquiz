// lib/adminGuard.ts
// Garde-fou serveur pour l'admin. Vérifie la session ET l'appartenance
// à la liste d'emails admin. À appeler dans TOUTE route /api/admin et
// dans les pages /admin (défense en profondeur au-delà du middleware).
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/adminEmails";

export interface AdminContext {
  userId: string;
  email: string;
}

export async function requireAdmin(): Promise<AdminContext | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return { userId: user.id, email: user.email! };
}
