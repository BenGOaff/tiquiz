// components/landing/Temoignages.tsx
//
// SES TÉMOIGNAGES, DANS LE DESSIN DE SA PAGE DE VENTE.
//
// Béné, 7 septembre 2026 : "c'est mal mis en forme, moche -> mets de
// jolis témoignages avec les photos des users, style screenshot comme
// sur ma page d'origine et ajoute que Maurice est coach pour femmes
// entrepreneures."
//
// -- POURQUOI UN COMPOSANT ET PAS UNE ÎLE LEVÉE ----------------------
//
// Son carrousel `tqz-tm` existe dans sa page (et dans
// public/animations/témoignages.txt), et les autres animations sont
// LEVÉES à l'octet près. Celle-ci ne peut pas l'être : une île est du
// HTML figé, sans données, et elle demande d'AJOUTER Maurice avec son
// métier. Maurice n'est pas dans son carrousel (mesuré : ses quinze
// cartes sont Jérémy B., Eric L., Jean Bernard R., Bernard C.,
// Monique P., Evelyne G., Sylvère M., Gwenn, Adeline, Alain M.,
// Samira L., Maulisio T., Fabienne G., Marie Paule C., Thibault L.).
//
// Le CSS ci-dessous est donc le SIEN, recopié de son bloc : mêmes
// 320 px, même avatar de 48 px, même défilement de 50 s, même pause au
// survol, mêmes bords en fondu, même point de rupture à 600 px. Ce qui
// change est la SOURCE : `TEMOIGNAGES`, donc nos portraits locaux et
// les textes verbatim.
//
// -- LES CINQ ÉTOILES SONT LES SIENNES -------------------------------
//
// Le 5 septembre, on les avait écartées : "afficher une note qu'on n'a
// pas est exactement ce qu'elle interdit". Elle demande aujourd'hui le
// dessin de sa page, et sa page les porte, sur ses propres clients.
// C'est SON asset et SA décision : elles reviennent, et c'est dit dans
// le message qui accompagne cette version pour qu'elle puisse dire non.
//
// -- MOINS D'ANIMATIONS ----------------------------------------------
//
// `prefers-reduced-motion: reduce` arrête le défilement et laisse les
// cartes lisibles : elles passent à la ligne au lieu de glisser.

import type { Temoignage } from "@/lib/site/landing";

/** L'initiale, pour les trois personnes sans portrait sur sa page. */
function initiale(nom: string): string {
  return nom.trim().slice(0, 1).toUpperCase();
}

export const CSS_TEMOIGNAGES = `
.tqtm{max-width:100%;overflow:hidden;position:relative;padding:20px 0;text-align:left}
.tqtm *{box-sizing:border-box}
.tqtm-piste{display:flex;gap:20px;animation:tqtmScroll 60s linear infinite;width:max-content;
  align-items:flex-start}
.tqtm-piste:hover{animation-play-state:paused}
.tqtm-card{width:320px;flex-shrink:0;background:#fff;border:1px solid #e8e9f0;border-radius:14px;
  padding:24px;transition:box-shadow .3s ease,transform .3s ease;text-align:left}
.tqtm-card:hover{box-shadow:0 8px 30px rgba(43,50,100,.1);transform:translateY(-3px)}
.tqtm-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.tqtm-av{width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #eef0ff}
.tqtm-av-txt{display:flex;align-items:center;justify-content:center;background:#eef0ff;
  color:#2B3264;font-weight:800;font-size:17px}
.tqtm-info{flex:1;min-width:0}
.tqtm-nom{font-size:14px;font-weight:700;color:#2B3264}
.tqtm-role{font-size:11px;color:#6b7194;margin-top:1px}
.tqtm-et{color:#FFB800;font-size:13px;letter-spacing:1px;margin-top:2px}
.tqtm-txt{font-size:13px;color:#3d4266;line-height:1.55;margin:0}
@keyframes tqtmScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
/* Les bords en fondu : la couleur est celle de la section, blanche. */
.tqtm::before,.tqtm::after{content:'';position:absolute;top:0;bottom:0;width:60px;z-index:2;pointer-events:none}
.tqtm::before{left:0;background:linear-gradient(90deg,#fff 0%,rgba(255,255,255,0) 100%)}
.tqtm::after{right:0;background:linear-gradient(270deg,#fff 0%,rgba(255,255,255,0) 100%)}
@media (max-width:600px){
  .tqtm-card{width:270px;padding:18px}
  .tqtm-av{width:40px;height:40px}
  .tqtm-nom{font-size:13px}
  .tqtm-txt{font-size:12px}
  .tqtm::before,.tqtm::after{width:30px}
}
@media (prefers-reduced-motion:reduce){
  .tqtm-piste{animation:none;width:auto;flex-wrap:wrap;justify-content:center}
}
`;

function Carte({ v }: { v: Temoignage }) {
  return (
    <div className="tqtm-card">
      <div className="tqtm-top">
        {v.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="tqtm-av" src={v.portrait} alt="" width={48} height={48} loading="lazy" />
        ) : (
          <span className="tqtm-av tqtm-av-txt" aria-hidden>
            {initiale(v.nom)}
          </span>
        )}
        <div className="tqtm-info">
          <div className="tqtm-nom">{v.nom}</div>
          {v.metier ? <div className="tqtm-role">{v.metier}</div> : null}
          <div className="tqtm-et" aria-hidden>
            ★★★★★
          </div>
        </div>
      </div>
      <p className="tqtm-txt">{v.texte}</p>
    </div>
  );
}

/**
 * LE LOT EST ÉCRIT DEUX FOIS ET LA PISTE GLISSE DE -50 %.
 *
 * C'est sa mécanique, et elle n'est pas décorative : c'est ce qui rend
 * la boucle invisible. Un seul lot ferait un saut à chaque tour. Le
 * second lot est `aria-hidden` : un lecteur d'écran ne doit pas
 * entendre les mêmes quinze avis deux fois de suite.
 */
export default function Temoignages({ items }: { items: readonly Temoignage[] }) {
  return (
    <div className="tqtm">
      <style>{CSS_TEMOIGNAGES}</style>
      <div className="tqtm-piste">
        {[0, 1].map((lot) => (
          <div
            key={lot}
            aria-hidden={lot === 1 || undefined}
            style={{ display: "flex", gap: 20, alignItems: "flex-start" }}
          >
            {items.map((v) => (
              <Carte key={`${lot}-${v.nom}`} v={v} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
