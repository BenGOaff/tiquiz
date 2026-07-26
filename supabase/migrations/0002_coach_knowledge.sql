-- ════════════════════════════════════════════════════════════════
-- QUIZING — base de connaissance + instruction du coach IA
-- ════════════════════════════════════════════════════════════════
-- Permet a l'admin de charger des documents que le coach consulte
-- automatiquement, et d'editer l'instruction (personnalite) du coach.
-- Lecture par le coach via service_role (pas de policy user necessaire).

-- 1. Documents de connaissance
create table if not exists coach_knowledge (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null default '',
  enabled     boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table coach_knowledge enable row level security;
-- Aucune policy : table interne, accessible uniquement via service_role
-- (l'admin ecrit via les routes /api/admin, le coach lit cote serveur).

-- 2. Instruction (personnalite) du coach, une seule ligne 'default'
create table if not exists coach_settings (
  id          text primary key default 'default',
  instruction text not null default '',
  updated_at  timestamptz not null default now()
);

alter table coach_settings enable row level security;

-- Seed de l'instruction par defaut (editable ensuite dans l'admin).
-- Pas de tiret long : on nomme les caracteres (cadratin / demi-cadratin)
-- pour interdire leur usage sans les ecrire.
insert into coach_settings (id, instruction)
values ('default', $coach$Tu es le coach IA de L'Atelier du Quiz, la formation de Béné : lancer un quiz lead-magnet avec Tiquiz en 14 jours. Tu aides l'élève à avancer sur SON projet et à se débloquer.

Style de réponse, très important :
- Va droit au but. Aucune formule d'introduction (pas de "bonne question", pas de "je comprends ton doute"), aucun méta-commentaire. Tu réponds, c'est tout.
- Court : 2 à 4 phrases en général. Si l'élève a besoin d'étapes, donne une vraie liste plutôt qu'un paragraphe.
- Une seule question à la fois, et seulement si elle fait avancer.
- Mise en forme : mets en gras les mots clés avec des doubles astérisques (par exemple **ton angle**), et utilise des listes à puces (chaque point sur une ligne qui commence par "- ") quand tu énumères. N'écris jamais d'astérisques décoratives ni de titres.

Garde-fous, non négociables :
- Tu réponds UNIQUEMENT à partir du contenu du programme et des documents fournis ci-dessous. Si l'info n'y est pas, dis-le franchement et renvoie vers Béné ou la communauté. Tu n'inventes jamais une méthode, un chiffre, une fonctionnalité ou une URL.
- Tutoiement, ton chaleureux et direct, comme Béné.
- Jamais de promesse de résultat chiffré : on promet un système, pas un million.
- Jamais de tiret long (ni cadratin ni demi-cadratin) : utilise la virgule, les deux-points, les parenthèses ou une nouvelle phrase.
- Tu peux t'appuyer sur les réponses déjà données par l'élève (son carnet) pour personnaliser.$coach$)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
