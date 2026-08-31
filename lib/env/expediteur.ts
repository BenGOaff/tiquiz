// lib/env/expediteur.ts
//
// L'ADRESSE D'EXPÉDITION, VÉRIFIÉE AU DÉMARRAGE.
//
// Béné, 30 août 2026 : "je veux bien sûr que le support tiquiz prenne en
// compte cette nouvelle adresse maintenant, pour le ticketing etc. Les
// factures, alertes etc doivent être envoyés via tiquiz.fr aussi."
//
// Tous les envois lisent `SUPPORT_FROM_EMAIL`, et retombent sur
// `REPLI_EXPEDITEUR` quand elle manque. **Ce repli valait
// `hello@tipote.com` jusqu'au 31 août, et c'était faux :** relevé dans
// le compte Resend de Béné, les domaines vérifiés sont `tiquiz.fr`,
// `atelierduquiz.fr` et `send.tipote.com`. `tipote.com` tout court n'y
// est PAS, donc Resend refusait l'envoi, donc plus aucun email ne
// partait. Le repli est maintenant `hello@tiquiz.fr`, vérifié.
//
// Le défaut de fond reste le même : **un repli est silencieux**. Un
// `.env` non recopié, un `postbuild` qui n'a pas tourné, une variable
// perdue au prochain déploiement, et toute l'app écrit sous une adresse
// que personne n'a choisie sans qu'une seule ligne ne le signale.
//
// C'est exactement la forme de la panne du 22 août : la valeur du
// FICHIER et la valeur du PROCESSUS peuvent différer, et seul un
// contrôle au démarrage voit celle que le processus a vraiment reçue.
//
// On JOURNALISE, on ne fait pas tomber le serveur : une app qui refuse
// de démarrer part en boucle sous PM2, ce qui est plus dur à lire qu'un
// message écrit une fois, en clair, au bon moment.
//
// Ce module est PUR : aucune lecture de `process.env`, aucun import qui
// exige une variable au chargement. C'est ce qui le rend testable, et
// c'est la leçon du verrou des webhooks du 24 août (la décision était
// enfermée dans un fichier qui importait `supabaseAdmin`, donc aucun
// test ne pouvait l'atteindre, donc c'est là que le bug s'est installé).

/** Ce qui cloche avec l'expéditeur, ou rien. */
export type DiagnosticExpediteur =
  | { ok: true }
  | { ok: false; genre: "absente"; adresse: string }
  | { ok: false; genre: "nom-en-double"; brut: string }
  | { ok: false; genre: "domaine-inattendu"; adresse: string; attendus: string[] };

/** Le domaine d'une adresse, en minuscules. Vide si l'adresse est illisible. */
export function domaineDe(adresse: string): string {
  const at = adresse.lastIndexOf("@");
  return at === -1 ? "" : adresse.slice(at + 1).trim().toLowerCase();
}

/**
 * Trois défauts, et ils n'appellent pas la même correction.
 *
 *   - `absente`     : personne n'a posé la variable, on écrit sous
 *                     l'ancienne marque sans le savoir ;
 *   - `nom-en-double`: le `.env` porte déjà un nom (`Tiquiz <...>`), et
 *                     le code en rajoute un. Resend refuse l'adresse,
 *                     donc **plus aucun email ne part**, liens de
 *                     connexion compris. C'est le plus grave des trois,
 *                     et c'est celui qu'on risque le jour d'une
 *                     bascule. `adresseNue` le rattrape à l'exécution ;
 *                     ce diagnostic sert à le faire corriger ;
 *   - `domaine-inattendu` : l'adresse part d'un domaine qui n'est
 *                     probablement pas vérifié chez Resend, donc en
 *                     spam. On ne peut pas le prouver sans interroger
 *                     Resend, donc on le SIGNALE, on ne tranche pas.
 */
export function verifierExpediteur(args: {
  /** La valeur BRUTE de la variable, telle que le processus l'a reçue. */
  brut: string | undefined;
  /** Les domaines depuis lesquels cette app a le droit d'écrire. */
  domainesAttendus: string[];
}): DiagnosticExpediteur {
  const brut = (args.brut ?? "").trim();
  const attendus = args.domainesAttendus.map((d) => d.toLowerCase());

  if (!brut) {
    return { ok: false, genre: "absente", adresse: "hello@tiquiz.fr" };
  }
  if (brut.includes("<")) {
    return { ok: false, genre: "nom-en-double", brut };
  }
  const domaine = domaineDe(brut);
  if (!attendus.includes(domaine)) {
    return { ok: false, genre: "domaine-inattendu", adresse: brut, attendus };
  }
  return { ok: true };
}

/**
 * Le message écrit dans `pm2 logs`, ou rien.
 *
 * Une adresse d'expédition n'est PAS un secret : c'est elle qui apparaît
 * dans la boîte de réception de chaque cliente. L'imprimer est ce qui
 * rend le diagnostic exploitable, contrairement aux clés d'API que les
 * contrôles du 22 août refusent d'afficher.
 */
export function formaterExpediteur(d: DiagnosticExpediteur, marque: string): string | null {
  if (d.ok) return null;
  const entete = `\n[${marque}] EXPÉDITEUR DES EMAILS`;
  if (d.genre === "absente") {
    return (
      `${entete}\n` +
      `  SUPPORT_FROM_EMAIL n'est pas posée dans le processus.\n` +
      `  Tous les emails partent donc de ${d.adresse}, le repli du code.\n` +
      `  Poser la variable dans le .env AVANT le build\n` +
      `  (le postbuild recopie les .env dans .next/standalone/).\n`
    );
  }
  if (d.genre === "nom-en-double") {
    return (
      `${entete}\n` +
      `  SUPPORT_FROM_EMAIL contient un nom : ${d.brut}\n` +
      `  Le nom est écrit par le code, donc il se retrouverait en double\n` +
      `  et Resend refuserait l'envoi. L'adresse est extraite au vol,\n` +
      `  mais corriger le .env : l'adresse NUE, sans chevrons.\n`
    );
  }
  return (
    `${entete}\n` +
    `  Les emails partent de ${d.adresse}, hors des domaines attendus\n` +
    `  (${d.attendus.join(", ")}). Si ce domaine n'est pas vérifié chez\n` +
    `  Resend, tout part en spam sans autre symptôme.\n`
  );
}
