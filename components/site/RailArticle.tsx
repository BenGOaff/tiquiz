// components/site/RailArticle.tsx
//
// LE RAIL COLLANT D'UNE PAGE D'ARTICLE.
//
// Béné, 30 août 2026, en montrant une page d'article de Typeform :
// "le contenu est mal réparti, dur à lire : tu as bien étudié le blog
// et les articles de Typeform ? Pourquoi tu gardes pas un sticky bar
// avec les principaux CTA et/ou articles relatifs ?"
//
// -- CE QUE LE RAIL RÈGLE, ET CE N'EST PAS QU'UNE COMMODITÉ -----------
//
// La page n'avait qu'UNE colonne de 1168 px : le texte s'y étalait sur
// 150 caractères par ligne (l'oeil perd le début de la ligne suivante,
// c'est exactement "dur à lire"), et le sommaire était un pavé posé
// avant l'article, donc perdu dès le premier défilement.
//
// En rendant 320 px au rail, on obtient trois choses d'un coup : une
// colonne de lecture de 720 px, un sommaire qui reste sous les yeux, et
// une place permanente pour l'invitation et le partage. C'est la mise
// en page de Typeform, et elle est bâtie sur cette arithmétique là.
//
// -- IL N'Y A PAS D'ARTICLES LIÉS DANS LE RAIL ------------------------
//
// Elle proposait "les principaux CTA ET/OU articles relatifs". Les deux
// dans un rail de 320 px donneraient une colonne plus longue que
// l'article sur les textes courts, et deux listes d'articles sur la
// même page (le rail et le bas de page) se contrediraient dès qu'on
// touchera à l'une des deux. Le rail porte donc ce qui doit rester
// SOUS LES YEUX pendant la lecture ; les articles liés vivent en bas,
// là où on a fini de lire et où on choisit la suite.
//
// -- LE RAIL N'EXISTE PAS SOUS 1024 px --------------------------------
//
// Sur un téléphone, un rail devient une pile de blocs entre le lecteur
// et son article. Le sommaire y prend une autre forme (repliable, en
// tête), et le partage est répété avant et après le texte.

import EncartCta from "@/components/site/EncartCta";
import PartageArticle from "@/components/site/PartageArticle";
import type { EntreeSommaire } from "@/lib/blog/rendu";

export default function RailArticle({
  sommaire,
  url,
  titre,
  textePartage,
  epingle,
}: {
  sommaire: readonly EntreeSommaire[];
  url: string;
  titre: string;
  textePartage: string;
  epingle: string | null;
}) {
  return (
    <aside className="hidden lg:block">
      {/* `sticky` et pas `fixed` : le rail s'arrête naturellement au bas
          de la grille, donc il ne chevauche jamais le pied de page. */}
      <div className="sticky top-24 space-y-7">
        {sommaire.length >= 3 ? (
          <nav aria-label="Sommaire de l'article">
            <p className="tq-etiquette">Dans cet article</p>
            {/* Le sommaire peut être long : il défile DANS le rail au
                lieu de pousser l'invitation hors de l'écran. */}
            <ul className="tq-sommaire mt-3 max-h-[46vh] space-y-2 overflow-y-auto pr-2 text-[0.9rem]">
              {sommaire.map((e) => (
                <li key={e.id} className={e.niveau === 3 ? "pl-3" : ""}>
                  <a
                    href={`#${e.id}`}
                    className="tq-doux block leading-snug transition hover:text-[var(--tq-bleu)]"
                  >
                    {e.texte}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div>
          <p className="tq-etiquette">Partager</p>
          <div className="mt-3">
            <PartageArticle
              url={url}
              titre={titre}
              texte={textePartage}
              epingle={epingle}
              orientation="colonne"
            />
          </div>
        </div>

        <EncartCta compact />
      </div>
    </aside>
  );
}
