// components/landing/AnimTag.tsx
//
// LE TAG QUI SE CHOISIT DANS UN MENU, ET QUI PART AVEC LE CONTACT.
//
// Béné, 7 septembre 2026, sur le paragraphe "Concrètement : ailleurs,
// tu paies un abonnement de plus..." : "c'est long, il faut faire un
// effort pour comprendre. Fais une animation qui relate ça en
// t'inspirant des animations déjà présentes."
//
// -- POURQUOI ON S'EN INSPIRE AU LIEU DE LA LEVER --------------------
//
// `public/animations/automatisations.txt` est SON bloc, et il montre
// exactement ce geste : un formulaire, puis les trois actions "Ajouter
// un tag", "S'abonner à la campagne", "Accès à la formation".
//
// Il porte aussi DOUZE LOGOS, décodés un par un avant d'écrire cette
// ligne : Brevo, Klaviyo, Kit et neuf autres outils d'emailing
// concurrents. Notre argument est la connexion NATIVE à Systeme.io :
// republier ce visuel promettrait onze intégrations qui n'existent pas
// chez nous. C'est déjà la raison écrite dans
// `scripts/extraire-anims-vente.mjs`, qui refuse ce bloc (son id est
// `rawhtml-8ecf2c31`).
//
// On reprend donc sa GRAMMAIRE, pas ses pixels : une carte qui monte,
// un menu qui s'ouvre, une pastille qui part vers Systeme.io, tout en
// `forwards` pour que la scène finisse VISIBLE. C'est la règle des
// onze îles levées : aucune ne revient à `opacity:0` en s'arrêtant.
//
// -- ELLE N'EST PAS DÉCORATIVE ---------------------------------------
//
// Elle REMPLACE un paragraphe, donc elle porte l'argument : ses mots
// viennent de `landing.ts` (traduits comme le reste) et elle n'est pas
// masquée aux lecteurs d'écran. C'est le même choix que son comparatif
// des formats et son sondage, les deux seules îles non décoratives.

import type { ContenuLanding } from "@/lib/site/landing";

const CSS = `
.tqtag{--tag:#5A6EF6;--enc:#2B3264;--gris:#6B7291;--bord:#E4E8F3;
  display:grid;grid-template-columns:1fr 64px 1fr;gap:0;align-items:stretch;
  max-width:920px;margin:34px auto 0}
.tqtag *{box-sizing:border-box}
.tqtag-carte{background:#fff;border:1px solid var(--bord);border-radius:16px;padding:20px;
  box-shadow:0 10px 30px rgba(35,40,80,.07);opacity:0;transform:translateY(14px)}
.tqtag.tqz-visible .tqtag-a{animation:tqtagUp .5s ease .1s forwards}
.tqtag.tqz-visible .tqtag-b{animation:tqtagUp .5s ease 3.4s forwards}
.tqtag-lg{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:var(--gris);margin:0 0 10px}
.tqtag-profil{font-size:15px;font-weight:700;color:var(--enc);margin:0 0 16px}
.tqtag-champ{font-size:12px;font-weight:600;color:var(--gris);margin:0 0 6px}
.tqtag-select{display:flex;align-items:center;justify-content:space-between;gap:10px;
  border:1px solid var(--bord);border-radius:10px;padding:10px 12px;background:#F8FAFF}
.tqtag.tqz-visible .tqtag-select{animation:tqtagFocus .4s ease .9s forwards}
.tqtag-vide{font-size:13px;color:var(--gris)}
.tqtag.tqz-visible .tqtag-vide{animation:tqtagOut .2s ease 2.2s forwards}
.tqtag-chev{width:10px;height:10px;border-right:2px solid var(--gris);border-bottom:2px solid var(--gris);
  transform:rotate(45deg) translateY(-2px);flex:none}
.tqtag-choisi{position:absolute;left:12px;top:50%;transform:translateY(-50%) scale(.9);opacity:0;
  display:inline-block;background:rgba(90,110,246,.12);color:var(--tag);
  font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px}
.tqtag.tqz-visible .tqtag-choisi{animation:tqtagPop .35s ease 2.25s forwards}
.tqtag-boite{position:relative}
.tqtag-liste{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:3;
  background:#fff;border:1px solid var(--bord);border-radius:10px;padding:6px;
  box-shadow:0 14px 34px rgba(35,40,80,.14);opacity:0;transform:translateY(-6px);
  pointer-events:none}
.tqtag.tqz-visible .tqtag-liste{animation:tqtagIn .3s ease 1s forwards,tqtagOut .25s ease 2.1s forwards}
.tqtag-opt{font-size:12.5px;color:var(--enc);padding:7px 9px;border-radius:7px;list-style:none}
.tqtag.tqz-visible .tqtag-opt-1{animation:tqtagSurvol .4s ease 1.6s forwards}
.tqtag-cree{display:inline-flex;align-items:center;gap:6px;margin:12px 0 0;
  font-size:11.5px;font-weight:700;color:#0F9D58;opacity:0;transform:translateY(6px)}
.tqtag.tqz-visible .tqtag-cree{animation:tqtagUp .4s ease 2.7s forwards}
.tqtag-fleche{position:relative;align-self:center;height:2px;background:var(--bord);border-radius:2px}
.tqtag-fleche::after{content:"";position:absolute;right:0;top:50%;width:7px;height:7px;
  border-top:2px solid var(--bord);border-right:2px solid var(--bord);
  transform:translate(0,-50%) rotate(45deg)}
.tqtag-bille{position:absolute;top:50%;left:0;width:10px;height:10px;border-radius:50%;
  background:var(--tag);transform:translate(-50%,-50%);opacity:0}
.tqtag.tqz-visible .tqtag-bille{animation:tqtagFile 1s ease 3s forwards}
.tqtag-ligne{display:flex;align-items:center;gap:10px;border:1px solid var(--bord);
  border-radius:10px;padding:9px 11px;opacity:0;transform:translateY(8px)}
.tqtag.tqz-visible .tqtag-ligne{animation:tqtagUp .4s ease 3.9s forwards}
.tqtag-rond{width:26px;height:26px;border-radius:50%;background:#EDF1F7;flex:none}
.tqtag-barre{height:7px;border-radius:4px;background:#EDF1F7}
.tqtag-pastille{background:rgba(90,110,246,.12);color:var(--tag);font-size:11px;font-weight:700;
  border-radius:999px;padding:3px 9px;white-space:nowrap}
.tqtag-camp{display:flex;align-items:center;gap:8px;margin:14px 0 0;font-size:12.5px;
  font-weight:700;color:var(--enc);opacity:0;transform:translateY(6px)}
.tqtag.tqz-visible .tqtag-camp{animation:tqtagUp .4s ease 4.5s forwards}
.tqtag-leg{max-width:920px;margin:16px auto 0;text-align:center;font-size:13.5px;color:var(--gris)}
@keyframes tqtagUp{to{opacity:1;transform:translateY(0)}}
@keyframes tqtagIn{to{opacity:1;transform:translateY(0)}}
@keyframes tqtagOut{to{opacity:0}}
@keyframes tqtagPop{to{opacity:1;transform:translateY(-50%) scale(1)}}
@keyframes tqtagFocus{to{border-color:var(--tag);background:#fff;box-shadow:0 0 0 3px rgba(90,110,246,.14)}}
@keyframes tqtagSurvol{to{background:rgba(90,110,246,.1);color:var(--tag);font-weight:700}}
@keyframes tqtagFile{0%{opacity:0;left:0}15%{opacity:1}85%{opacity:1}100%{opacity:0;left:100%}}
@media (max-width:760px){
  .tqtag{grid-template-columns:1fr;gap:0}
  .tqtag-fleche{width:2px;height:44px;margin:0 auto}
  .tqtag-bille{top:0;left:50%}
  .tqtag.tqz-visible .tqtag-bille{animation:tqtagFileBas 1s ease 3s forwards}
}
@keyframes tqtagFileBas{0%{opacity:0;top:0}15%{opacity:1}85%{opacity:1}100%{opacity:0;top:100%}}
@media (prefers-reduced-motion:reduce){
  .tqtag-carte,.tqtag-ligne,.tqtag-cree,.tqtag-camp{opacity:1;transform:none}
  .tqtag-liste{display:none}
  .tqtag-choisi{opacity:1;transform:translateY(-50%)}
  .tqtag-vide{display:none}
}
`;

/** Une coche pleine, DESSINÉE : un caractère Unicode rend un carré
 *  vide sur les machines où la police ne le porte pas (2 septembre). */
function Coche() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M8 12.4l2.6 2.6L16 9.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnimTag({ t }: { t: ContenuLanding }) {
  const a = t.tagAnim;
  return (
    <div data-anim-vente="tag-systeme-io">
      <style>{CSS}</style>
      <div className="tqtag tqz-visible tqz1-visible">
        <div className="tqtag-carte tqtag-a">
          <p className="tqtag-lg">{a.profilTitre}</p>
          <p className="tqtag-profil">{a.profil}</p>
          <p className="tqtag-champ">{a.champ}</p>
          <div className="tqtag-boite">
            <div className="tqtag-select">
              <span className="tqtag-vide">{a.champ}</span>
              <span className="tqtag-chev" aria-hidden />
              <span className="tqtag-choisi">{a.options[0]}</span>
            </div>
            <ul className="tqtag-liste">
              {a.options.map((o, i) => (
                <li key={o} className={`tqtag-opt tqtag-opt-${i + 1}`}>
                  {o}
                </li>
              ))}
            </ul>
          </div>
          <p className="tqtag-cree">
            <Coche />
            {a.cree}
          </p>
        </div>

        <div className="tqtag-fleche" aria-hidden>
          <span className="tqtag-bille" />
        </div>

        <div className="tqtag-carte tqtag-b">
          <p className="tqtag-lg">Systeme.io</p>
          <div className="tqtag-ligne">
            <span className="tqtag-rond" aria-hidden />
            <span className="tqtag-barre" style={{ flex: 1 }} aria-hidden />
            <span className="tqtag-pastille">{a.options[0]}</span>
          </div>
          <p className="tqtag-camp">
            <Coche />
            {a.arrivee} · {a.campagne}
          </p>
        </div>
      </div>
      <p className="tqtag-leg">{a.legende}</p>
    </div>
  );
}
