-- Custom domains pour les créateurs payants Tiquiz.
--
-- Flow : l'user pose un CNAME `quiz.son-ndd.com → connect.tiquiz.com`
-- (ou un A record vers l'IP du VPS pour les domaines apex), Caddy émet
-- un certif Let's Encrypt en On-Demand TLS à la première requête HTTPS,
-- et la middleware Next.js valide la propriété avant de servir le quiz.
--
-- Sécurité :
--   * Hostname unique global (case-insensitive) → un domaine ne peut
--     être réclamé que par un seul créateur ; empêche le hijack par
--     squat.
--   * RLS user-bound côté create/update/delete + lecture publique
--     limitée aux rows `verified` (la middleware en a besoin pour
--     router, et la donnée exposée — hostname + user_id — est de toute
--     façon publique via DNS).
--   * Le endpoint Caddy /ask tourne sous service-role et bypass RLS,
--     donc il valide même les rows non-verified si on en a besoin un
--     jour (suspension, etc.).
--
-- Status machine :
--   pending_dns  → ajout initial, DNS pas encore détecté
--   verified     → DNS résout vers notre IP, Caddy peut émettre le cert
--   failed       → la vérification DNS a échoué explicitement (mauvais
--                  enregistrement, NXDOMAIN, etc.) ; l'user peut
--                  re-vérifier après correction.

CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_dns'
    CHECK (status IN ('pending_dns', 'verified', 'failed')),
  dns_target TEXT NOT NULL DEFAULT 'connect.tiquiz.com',
  error_message TEXT,
  last_checked_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  ssl_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unicité globale (case-insensitive). On stocke en lowercase via
-- l'API mais l'index sur lower() protège contre les écritures directes.
CREATE UNIQUE INDEX IF NOT EXISTS custom_domains_hostname_unique
  ON public.custom_domains (lower(hostname));

CREATE INDEX IF NOT EXISTS custom_domains_user_id_idx
  ON public.custom_domains (user_id);

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- L'user gère ses propres domaines.
CREATE POLICY "Users manage own custom domains" ON public.custom_domains
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lecture publique des rows `verified` uniquement, pour permettre à la
-- middleware (qui tourne anonyme pour les visiteurs des quiz publics)
-- de résoudre Host → user_id sans bypasser RLS.
CREATE POLICY "Public read of verified custom domains" ON public.custom_domains
  FOR SELECT
  USING (status = 'verified');

-- updated_at trigger (cohérent avec le reste du schéma Tiquiz).
CREATE OR REPLACE FUNCTION public.custom_domains_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_domains_updated_at ON public.custom_domains;
CREATE TRIGGER custom_domains_updated_at
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION public.custom_domains_set_updated_at();

COMMENT ON TABLE public.custom_domains IS
  'Domaines personnalisés des créateurs payants. Caddy on-demand TLS gate l''émission des certifs via /api/internal/caddy-ask en filtrant sur status=verified.';
