// lib/ai/cleAnthropic.ts
//
// LA CLÉ ANTHROPIC SE LIT À UN SEUL ENDROIT.
//
// Béné, 2 septembre 2026 : "le générateur de bonus ne fonctionne pas
// j'ai un message d'erreur c'est relou". L'écran disait "L'écriture
// n'est pas disponible pour le moment. On est prévenus.", c'est à dire
// `not_configured`, c'est à dire "aucune clé".
//
// Il y en avait une, et toutes les autres fonctions IA de l'app la
// trouvaient très bien. La route des générateurs lisait
// `ANTHROPIC_API_KEY` TOUT COURT, quand les NEUF autres endroits lisent
// `ANTHROPIC_API_KEY` PUIS `CLAUDE_API_KEY_OWNER`. Sur le serveur, c'est
// la seconde qui porte la valeur : les générateurs étaient donc le seul
// écran incapable d'écrire quoi que ce soit, et le message ne pouvait
// pas le dire puisqu'il décrit une absence de configuration.
//
// -- NEUF COPIES, ET LA DIXIÈME ÉTAIT FAUSSE --------------------------
//
// La résolution était recopiée à la main dans neuf fichiers. Une règle
// recopiée finit toujours par en oublier un : c'est le `mx-auto` du
// sous-titre, les images de réponse, les réseaux de partage, les
// libellés de profil. Ici l'oubli coûtait une fonctionnalité entière, et
// en silence, parce qu'un écran qui dit "pas disponible" a l'air de
// parler d'une panne passagère.
//
// -- L'ORDRE EST CELUI DES NEUF, ET IL NE CHANGE PAS ------------------
//
// `ANTHROPIC_API_KEY` d'abord : c'est ce que faisaient déjà toutes les
// fonctions qui marchent, et l'inverser ferait basculer toute l'app sur
// une autre clé sans que personne ne l'ait demandé.

/** La clé Anthropic du compte, ou "" quand aucune n'est posée. */
export function cleAnthropic(): string {
  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY_OWNER?.trim() ||
    ""
  );
}

export default cleAnthropic;
