-- ════════════════════════════════════════════════════════════════
-- QUIZING — seed du Jour 1 (Module 1 : Pourquoi un quiz)
-- ════════════════════════════════════════════════════════════════
--
-- Contenu tiré de contenu/parcours/01-module-pourquoi-un-quiz.md.
-- La "mission du jour" devient les questions du quiz (règle d'or :
-- la vidéo enseigne, le quiz fait agir). Zéro tiret long, tutoiement.
--
-- Idempotent : on upsert le jour par day_number, et on ne réinsère pas
-- les questions si elles existent déjà pour ce jour.
-- video_url reste NULL : tu chargeras la vidéo depuis l'admin.

insert into days (day_number, slug, title, subtitle, intro_html, result_html, status, sort_order, resources)
values (
  1,
  'jour-1-pourquoi-un-quiz',
  'Le déclic',
  'Pourquoi le quiz écrase tous les autres lead magnets',
  $html$
<p>Ton PDF gratuit, presque personne ne le lit. Ton webinaire, la moitié des inscrits ne viennent pas. Ta page de capture transforme un visiteur sur cinquante. Ce n'est pas toi le problème, c'est le format.</p>
<h2>Ce que le quiz fait de différent</h2>
<ul>
<li><strong>Interactif</strong> : le prospect participe au lieu de subir. L'attention monte.</li>
<li><strong>Il qualifie</strong> : tu apprends qui il est pendant qu'il répond.</li>
<li><strong>Il segmente</strong> : chaque réponse est une info que tu peux taguer.</li>
<li><strong>Il est viral</strong> : on partage son résultat, jamais son PDF.</li>
<li><strong>Il est rapide</strong> : 5 minutes avec Tiquiz, contre des jours pour un tunnel.</li>
</ul>
<h2>Les maths qui changent tout</h2>
<p>Une page de capture classique : 1 à 3 leads pour 100 visiteurs. Un bon quiz : couramment 20 à 50 leads pour 100 visiteurs. Ce sont des fourchettes, ça dépend de ton quiz et de ta cible. On ne garantit pas un chiffre, on installe un système dont les maths jouent pour toi.</p>
<h2>Le miroir d'identité</h2>
<p>Les quiz qui cartonnent ne notent pas, ils révèlent une identité. "Tu es un Visionnaire" se partage. "Tu as eu 6 sur 10" se cache. Donc on bannit la logique bonne ou mauvaise réponse, on révèle un type.</p>
<p>Ta mission d'aujourd'hui, la plus importante de toute la première semaine : répondre à une seule vraie question. Quelle transformation ton audience cherche vraiment ? Tu vas l'écrire juste en dessous.</p>
$html$,
  $html$
<p>Bravo, tu viens de poser la première pierre de ton quiz : ton angle pressenti et ton archétype.</p>
<p>Garde ta phrase de transformation sous les yeux, c'est elle qui guidera tout le reste. Demain, on creuse ta cible jusqu'à la connaître mieux qu'elle ne se connaît elle-même.</p>
<p>Et si tu veux pousser : donne un nom propriétaire à ta méthode pour rendre ton futur quiz mémorable.</p>
$html$,
  'published',
  10,
  '[]'::jsonb
)
on conflict (day_number) do update set
  slug = excluded.slug,
  title = excluded.title,
  subtitle = excluded.subtitle,
  intro_html = excluded.intro_html,
  result_html = excluded.result_html,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Questions du Jour 1 = la mission. On ne les réinsère pas si déjà là.
insert into questions (day_id, type, prompt, help_text, options, required, sort_order)
select d.id, q.type, q.prompt, q.help_text, q.options::jsonb, q.required, q.sort_order
from days d
cross join (values
  (
    'action',
    'Écris en une phrase la transformation que ton audience cherche vraiment.',
    'Pas la fonctionnalité, le résultat. Exemple : "passer de débordée à organisée sans culpabiliser".',
    '[]',
    true,
    1
  ),
  (
    'decision',
    'Quel archétype de quiz colle le mieux à ton sujet ?',
    'Tu pourras changer plus tard, c''est juste ton intuition de départ.',
    '[{"value":"identitaire","label":"Quel type de X es-tu ? (identitaire, très viral)"},{"value":"diagnostic","label":"Quel est ton blocage en Y ? (diagnostic, vend bien)"},{"value":"declencheur","label":"Es-tu prêt pour Z ? (déclencheur de décision)"}]',
    true,
    2
  ),
  (
    'self_eval',
    'Où en es-tu aujourd''hui avec les quiz ?',
    'Ça me sert à adapter ton parcours et les réponses du coach.',
    '[{"value":"jamais","label":"Je n''en ai jamais fait"},{"value":"essaye","label":"J''ai déjà essayé sans vrai résultat"},{"value":"actif","label":"J''en ai un qui tourne déjà"}]',
    true,
    3
  ),
  (
    'recall',
    'Pour ancrer : selon la vidéo, ce qui fait qu''un quiz capte mieux qu''une page de capture, c''est surtout...',
    'Aucun piège, c''est juste pour fixer l''idée clé du jour.',
    '[{"value":"interactif","label":"Il est interactif : on participe au lieu de subir"},{"value":"joli","label":"Il est plus joli à regarder"},{"value":"long","label":"Il est plus long à remplir"}]',
    false,
    4
  )
) as q(type, prompt, help_text, options, required, sort_order)
where d.day_number = 1
  and not exists (
    select 1 from questions x where x.day_id = d.id and x.sort_order = q.sort_order
  );

notify pgrst, 'reload schema';
