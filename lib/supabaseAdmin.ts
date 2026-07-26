// lib/supabaseAdmin.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase "admin" (service_role). Bypasse la RLS.
 * ATTENTION : ne jamais importer dans du code côté navigateur.
 *
 * Instanciation PARESSEUSE (lazy) : on ne crée le client qu'au premier
 * usage réel, pas à l'import du module. Sinon l'étape "collect page
 * data" de `next build` (qui importe chaque route) plante si une env
 * var manque ou est mal formée au moment du build. Le client n'est
 * réellement nécessaire qu'au runtime, où les env vars sont présentes.
 */
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY");
  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

// Proxy : transmet tout accès (.from, .auth, .storage...) au vrai client,
// créé à la demande. Les call-sites restent inchangés (supabaseAdmin.from(...)).
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient();
    const value = (c as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(c) : value;
  },
});
