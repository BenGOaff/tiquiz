"use client";

// components/site/VideoArticle.tsx
//
// LA VIDÉO D'UN ARTICLE, QUI NE CONTACTE PERSONNE AVANT QU'ON LA
// DEMANDE.
//
// Béné, 8 septembre 2026 : "oui je veux la vidéo Youtube".
//
// -- POURQUOI UNE MINIATURE ET PAS LE CADRE ---------------------------
//
// MESURÉ, pas supposé : un article de blog ne porte AUCUNE bannière de
// consentement (celle de Béné vit dans la page de vente capturée, et
// range son choix dans `aq_consent_v1`). Poser le cadre au chargement
// enverrait donc l'adresse IP de chaque lecteur chez Google sans lui
// avoir rien demandé, sur une page où rien ne peut recueillir son
// accord.
//
// Ici, tant qu'on n'a pas cliqué : zéro requête vers Google, zéro
// cookie. La miniature est sur NOTRE disque (`public/blog/video/`) : la
// servir depuis `i.ytimg.com` serait exactement la requête tierce qu'on
// évite, et elle partirait à chaque chargement.
//
// -- C'EST UN LIEN, PAS UN BOUTON, ET ÇA COMPTE -----------------------
//
// Sans JavaScript, un bouton ne fait RIEN : la vidéo serait morte et le
// lecteur n'aurait aucun moyen de le savoir. Un lien vers YouTube
// marche dans tous les cas ; le clic est intercepté quand JavaScript
// est là, et il ouvre le cadre à la place.
//
// -- LE TRIANGLE EST DESSINÉ ------------------------------------------
//
// Jamais un caractère Unicode : "▶" n'existe ni dans Open Sans ni dans
// Inter, donc Windows rend le carré vide (drame du 2 septembre, les
// icônes de la landing).

import { useState } from "react";

import { cheminMiniature, urlEmbedYouTube, urlYouTube } from "@/lib/blog/video";

export default function VideoArticle({
  id,
  titre,
  libelleLecture,
  note,
}: {
  id: string;
  titre: string;
  /** "Lire la vidéo" / "Play the video", dans la langue de l'article. */
  libelleLecture: string;
  /** La phrase qui dit ce qu'un clic déclenche. */
  note: string;
}) {
  const [ouverte, setOuverte] = useState(false);

  const miniature = cheminMiniature(id);
  const cadre = urlEmbedYouTube(id);
  const publique = urlYouTube(id);

  // Un identifiant qu'on ne sait pas lire ne fabrique aucune adresse :
  // on ne rend rien plutôt qu'un cadre cassé.
  if (!miniature || !cadre || !publique) return null;

  return (
    <figure className="my-10">
      <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16 / 9" }}>
        {ouverte ? (
          <iframe
            src={cadre}
            title={titre}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <a
            href={publique}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${libelleLecture} : ${titre}`}
            onClick={(e) => {
              // Un clic modifié (nouvel onglet, nouvelle fenêtre) reste
              // un clic sur un lien : on ne le vole pas.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              setOuverte(true);
            }}
            className="group absolute inset-0 block no-underline"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={miniature}
              alt=""
              width={1280}
              height={720}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/10">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-110">
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <path d="M9 6.5 18.5 12 9 17.5Z" fill="var(--tq-bleu)" />
                </svg>
              </span>
            </span>
          </a>
        )}
      </div>
      <figcaption className="tq-doux mt-3 text-[0.9rem] leading-snug">
        {titre}
        {ouverte ? null : <span className="block opacity-80">{note}</span>}
      </figcaption>
    </figure>
  );
}
