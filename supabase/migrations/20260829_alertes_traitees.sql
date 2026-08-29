-- 20260829_alertes_traitees.sql
--
-- MARQUER UNE ALERTE COMME TRAITÉE (Béné, 29 août 2026).
--
-- "Je dois pouvoir marquer comme traité, c'est un mauvais suivi de la
-- plateforme pas un vrai sujet."
--
-- Le cas exact : une vente encaissée le 11 juin dont aucun compte ne
-- porte l'adresse. L'alerte est juste et elle ne s'éteindra JAMAIS
-- toute seule, puisque la vente restera sans compte en face pour
-- toujours. Une alerte permanente cesse d'être lue, et le jour où une
-- vraie apparaît à côté, personne ne la voit.
--
-- -- CE QU'ON N'ÉCRIT PAS, ET POURQUOI ---------------------------------
--
-- On ne touche NI à la vente, NI au compte. Marquer traité ne supprime
-- rien : la vente reste dans l'écran des ventes, avec son montant et sa
-- date. C'est l'ALERTE qu'on éteint, pas l'argent qu'on efface.
--
-- -- ET C'EST RÉVERSIBLE ------------------------------------------------
--
-- Un clic de travers ne doit pas cacher pour toujours de l'argent
-- rentré sans contrepartie. La ligne se retire, et l'alerte revient.
--
-- La clé est la RÉFÉRENCE de l'encaissement (PaymentIntent chez Stripe,
-- capture chez PayPal, identifiant de commande chez Systeme.io) : c'est
-- ce qui identifie l'argent, et ça ne bouge pas. L'adresse email, elle,
-- pourrait désigner plusieurs ventes.

create table if not exists public.alertes_traitees (
  -- De quelle alerte on parle. Aujourd'hui `vente-orpheline`, et le
  -- champ existe pour que la prochaine n'exige pas une table de plus.
  genre text not null,
  -- Ce que l'alerte désigne : la référence de l'encaissement.
  reference text not null,
  traite_par text,
  traite_le timestamptz not null default now(),
  note text,
  primary key (genre, reference)
);

create index if not exists alertes_traitees_genre_idx
  on public.alertes_traitees (genre);

comment on table public.alertes_traitees is
  'Les alertes du centre de pilotage que Bene a deja traitees. On n''y ecrit jamais rien de la vente elle meme : marquer traite eteint l''alerte, ca n''efface pas l''argent, et ca se defait.';

alter table public.alertes_traitees enable row level security;

-- Aucune politique : seule la cle de service y touche, et l'ecran est
-- deja reserve aux admins par le middleware et par la page.

notify pgrst, 'reload schema';
