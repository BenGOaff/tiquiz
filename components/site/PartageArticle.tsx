// components/site/PartageArticle.tsx
//
// PARTAGER UN ARTICLE.
//
// Béné, 30 août 2026 : "y'a pas de proposition de partage de l'article,
// ni de commentaires : dommage ça aide à ranker (en plus on a un widget
// de partage dans Tipote que tu peux sûrement réutiliser)."
//
// -- CE QU'ON A RÉUTILISÉ, ET CE QU'ON A RÉPARÉ AU PASSAGE ------------
//
// Le widget existait bien, mais ses URL vivaient DANS
// `PublicQuizClient.tsx`, au milieu d'un composant de 5000 lignes.
// Elles vivent maintenant dans `lib/partage/urlsReseaux.ts`, pures et
// testées, et les DEUX écrans les appellent. En les sortant, un bug de
// fond est apparu : le lien Pinterest n'a jamais porté de `media=`,
// donc Pinterest ouvrait son formulaire SANS image et demandait au
// visiteur d'en choisir une. C'est ce que Béné décrit par "aucune image
// ne peut être repartagée sur Pinterest".
//
// -- CE COMPOSANT N'A PAS BESOIN DE JAVASCRIPT ------------------------
//
// Six liens sur sept sont de simples `<a href>` calculés au build : la
// page est statique, l'adresse de l'article est connue. Ils marchent
// donc sans JavaScript, ils sont dans le HTML servi, et ils ne coûtent
// aucun octet de bundle à quelqu'un venu lire.
//
// Seul "Copier le lien" a besoin du navigateur : il vit dans son propre
// composant client (`BoutonCopier`), et lui seul.

import BoutonCopier from "@/components/site/BoutonCopier";
import { urlPartage } from "@/lib/partage/urlsReseaux";

/**
 * Les réseaux proposés sur un ARTICLE, dans cet ordre.
 *
 * Ce n'est pas la liste du viewer de quiz, et c'est voulu : on partage
 * un article de blog vers des endroits où on partage des articles.
 * Pinterest est en tête parce que c'est le canal que Béné nomme
 * explicitement ("qui m'aide à faire ranker mon site").
 *
 * Instagram est ABSENT : il n'a aucune adresse de partage web, donc son
 * bouton ne peut que copier un lien. C'est déjà ce que fait "Copier le
 * lien", en le disant.
 */
const RESEAUX = [
  { cle: "pinterest", nom: "Pinterest", couleur: "#E60023" },
  { cle: "linkedin", nom: "LinkedIn", couleur: "#0A66C2" },
  { cle: "facebook", nom: "Facebook", couleur: "#1877F2" },
  { cle: "x", nom: "X", couleur: "#000000" },
  { cle: "whatsapp", nom: "WhatsApp", couleur: "#25D366" },
  { cle: "email", nom: "Email", couleur: "#4a5270" },
] as const;

const ICONES: Record<string, React.ReactNode> = {
  pinterest: (
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
  ),
  linkedin: (
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  ),
  facebook: (
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  ),
  x: (
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  ),
  whatsapp: (
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  ),
  email: (
    <path d="M1.5 5.25A2.25 2.25 0 013.75 3h16.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0120.25 21H3.75a2.25 2.25 0 01-2.25-2.25V5.25zm2.4-.75L12 11.19 20.1 4.5H3.9zM21 6.66l-8.36 6.9a1 1 0 01-1.28 0L3 6.66V18.75c0 .41.34.75.75.75h16.5c.41 0 .75-.34.75-.75V6.66z" />
  ),
};

export default function PartageArticle({
  url,
  titre,
  texte,
  epingle,
  orientation = "ligne",
}: {
  /** L'adresse ABSOLUE de l'article. Un chemin relatif ne partage rien. */
  url: string;
  titre: string;
  /** Le message proposé. Il devient la description d'une épingle. */
  texte: string;
  /** L'image verticale à épingler, absolue. Absente -> pas de bouton Pinterest. */
  epingle: string | null;
  orientation?: "ligne" | "colonne";
}) {
  const liens = RESEAUX.map((r) => ({
    ...r,
    href: urlPartage(r.cle, { url, texte, titre, media: epingle }),
  }))
    // Pinterest SANS image conforme : on retire le bouton au lieu d'en
    // proposer un qui ouvrira un formulaire vide. Un bouton qui ne fait
    // rien coûte plus cher que pas de bouton (leçon du 3 août).
    .filter((r) => r.href && (r.cle !== "pinterest" || epingle));

  return (
    <div
      className={
        orientation === "colonne"
          ? "flex flex-wrap gap-2"
          : "flex flex-wrap items-center gap-2"
      }
    >
      {liens.map((r) => (
        <a
          key={r.cle}
          href={r.href as string}
          target="_blank"
          rel="noopener noreferrer"
          title={`Partager sur ${r.nom}`}
          aria-label={`Partager sur ${r.nom}`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--tq-bord)] bg-white text-[var(--tq-encre-douce)] transition hover:border-transparent hover:text-white"
          style={{ ["--survol" as string]: r.couleur }}
          data-partage={r.cle}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-[1.05rem] w-[1.05rem]">
            {ICONES[r.cle]}
          </svg>
        </a>
      ))}
      <BoutonCopier url={url} />
    </div>
  );
}
