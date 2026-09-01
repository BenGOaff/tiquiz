// instrumentation.ts
//
// LE SEUL CONTRÔLE QUI SURVIT À UN `pm2 restart --update-env`.
//
// `register()` est appelé UNE fois au démarrage du serveur, avant la
// première requête (cf. node_modules/next/dist/docs/01-app/03-api-reference
// /03-file-conventions/instrumentation.md). C'est le seul endroit où l'on
// voit les variables telles que le processus les a VRAIMENT reçues, et
// pas telles que le fichier les écrit.
//
// Ça compte, parce que les deux peuvent différer. Le 22 août au soir,
// `prebuild` a refusé de construire Tipote (il a vu le terminal pollué),
// mais la ligne suivante du déploiement a quand même redémarré l'app avec
// ce terminal là. Résultat : l'URL d'un projet, la clé de l'autre, et
// « Invalid API key » partout, sans une ligne pour dire pourquoi.
//
// -- CE QUE CE CONTRÔLE COMPARE VRAIMENT (vérifié, pas supposé) --------
//
// `process.env.NEXT_PUBLIC_*` n'est PAS lu à l'exécution : Next remplace
// l'expression par la valeur littérale au moment du `next build`. Ici,
// `NEXT_PUBLIC_SUPABASE_URL` vaut donc ce que portait le BUILD, tandis
// que `SUPABASE_SERVICE_ROLE_KEY`, qui n'est pas publique, vaut ce que
// porte le PROCESSUS.
//
// Ce n'est pas un défaut, c'est précisément la comparaison qui manquait :
// l'URL telle qu'elle est gravée, face à la clé telle qu'elle est reçue.
// Le croisement du 22 août tient exactement dans cet écart là.
// Vérifié en démarrant le serveur construit avec deux projets différents.
//
// On JOURNALISE, on ne fait pas tomber le serveur. Une app qui refuse de
// démarrer part en boucle de redémarrage sous PM2, ce qui est plus
// difficile à lire qu'un message écrit une fois, en clair, au bon moment.

export async function register() {
  // `register` est aussi appelé pour le runtime Edge, qui n'a ni Buffer
  // ni les variables serveur. Le contrôle n'a de sens que côté Node.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { verifierProjetSupabase, formaterDiagnostic } = await import("@/lib/env/supabaseProject");

  const diagnostic = verifierProjetSupabase({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  const message = formaterDiagnostic(diagnostic, "TIQUIZ");
  if (message) console.error(message);

  // L'EXPÉDITEUR DES EMAILS, POUR LA MÊME RAISON.
  //
  // Depuis le 30 août, Tiquiz écrit depuis `tiquiz.fr`. Le repli sur
  // l'ancien domaine est délibéré (c'est celui qui ne part pas en spam),
  // mais il est SILENCIEUX : sans ce contrôle, un `.env` non recopié
  // remet toute l'app à écrire sous le nom de Tipote et rien ne le dit.
  const { verifierExpediteur, formaterExpediteur } = await import("@/lib/env/expediteur");
  const expediteur = formaterExpediteur(
    verifierExpediteur({
      brut: process.env.SUPPORT_FROM_EMAIL ?? process.env.RESELLER_FROM_EMAIL,
      domainesAttendus: ["tiquiz.fr", "quiz.tipote.com"],
    }),
    "TIQUIZ",
  );
  if (expediteur) console.error(expediteur);

  // LA REVENDICATION PINTEREST, MÊME RAISON ENCORE.
  //
  // Le code n'est PAS obligatoire : tant qu'il est absent, la balise ne
  // sort pas et on se tait. Mais une valeur POSÉE et illisible fait
  // échouer la revendication en silence, et c'est exactement le genre de
  // panne qu'on ne découvre que des mois plus tard, en se demandant
  // pourquoi son nom n'apparaît sur aucune épingle.
  const { diagnosticVerificationPinterest } = await import("@/lib/site/pinterest");
  const pinterest = diagnosticVerificationPinterest();
  if (pinterest) console.error(`[TIQUIZ] ${pinterest}`);
}
