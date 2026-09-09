// components/site/Commentaires.tsx
//
// LES COMMENTAIRES D'UN ARTICLE, RENDUS PAR LE SERVEUR.
//
// Béné, 30 août 2026 : "y'a pas de proposition de partage de l'article,
// ni de commentaires : dommage ça aide à ranker."
//
// -- POURQUOI CÔTÉ SERVEUR, ET PAS EN JAVASCRIPT ----------------------
//
// Sa raison est le référencement. Une liste chargée après coup par le
// navigateur n'est pas dans le HTML servi : pour un moteur, l'article
// n'a alors aucun commentaire, et la fonctionnalité entière ne sert à
// rien. La liste est donc rendue par le serveur, et le JSON-LD de
// l'article la déclare.
//
// Seul le FORMULAIRE est un composant client : il envoie, il attend, il
// annonce le résultat.
//
// -- CE QU'UNE SECTION VIDE DOIT DIRE ---------------------------------
//
// Zéro commentaire n'est pas une erreur : c'est le cas normal d'un
// article qui vient de sortir. La section le dit et invite, au lieu de
// disparaître. Un bloc qui apparaît et disparaît selon les articles se
// lit comme une page cassée (leçon du tableau de liens vide, 24 août).

import FormulaireCommentaire from "@/components/site/FormulaireCommentaire";
import { messageEnHtml } from "@/lib/blog/commentaires";
import type { MotsDuBlog } from "@/lib/blog/motsDuBlog";
import type { CommentairePublie } from "@/lib/blog/commentairesStore";

/**
 * La date d'un commentaire, dans la langue de l'ARTICLE.
 *
 * La locale est un PARAMETRE : `fr-FR` etait ecrit en dur, donc un
 * commentaire sous un article anglais s'affichait "8 septembre 2026".
 */
function jourCourt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function Commentaires({
  slug,
  commentaires,
  mots,
  locale,
}: {
  slug: string;
  commentaires: readonly CommentairePublie[];
  mots: MotsDuBlog["commentaires"];
  /** La locale de `Intl`, celle de l'article. */
  locale: string;
}) {
  return (
    <section id="commentaires" className="mt-16 border-t border-[var(--tq-bord)] pt-12">
      <h2 className="text-[1.6rem]">
        {commentaires.length === 0
          ? mots.titreVide
          : commentaires.length === 1
            ? mots.titreUn
            : mots.titreN(commentaires.length)}
      </h2>

      {commentaires.length > 0 ? (
        <ol className="mt-8 space-y-8">
          {commentaires.map((c) => (
            <li key={c.id}>
              <p className="font-semibold">{c.auteur}</p>
              <p className="tq-doux mt-0.5 text-[0.82rem]">
                <time dateTime={c.cree_le}>{jourCourt(c.cree_le, locale)}</time>
              </p>
              {/* Le message vient d'un inconnu : il est ÉCHAPPÉ par
                  `messageEnHtml`, qui ne laisse passer aucune balise et
                  ne conserve que les retours à la ligne. */}
              <div
                className="mt-2.5 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: messageEnHtml(c.message) }}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="tq-doux mt-3 leading-relaxed">
          {mots.aucun}
        </p>
      )}

      <FormulaireCommentaire slug={slug} mots={mots.formulaire} />
    </section>
  );
}
