// components/figures/Figure.tsx
// Schemas des jours. Rendu HTML/CSS (classes .fig-* dans globals.css) :
// icones inline + couleurs + degrades, cases calibrees au contenu (aucun
// debordement), responsive, theme-aware. Composant pur (pas de hooks),
// utilisable en rendu serveur (RichContent).
import { Fragment } from "react";
import type { ReactNode } from "react";

const ICON: Record<string, ReactNode> = {
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  video: <path d="M6 4l14 8-14 8Z" />,
  action: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v1" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
    </>
  ),
  key: (
    <>
      <circle cx="8.5" cy="14.5" r="4" />
      <path d="m11.3 11.7 7-7M16.5 6l2 2M14.7 7.8l2 2" />
    </>
  ),
  users: (
    <>
      <path d="M16.5 20v-1.5a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4V20" />
      <circle cx="10" cy="8" r="3.4" />
      <path d="M20.5 20v-1.5a4 4 0 0 0-3-3.85" />
    </>
  ),
  trending: (
    <>
      <path d="M3.5 16.5 10 10l4 4 6.5-6.5" />
      <path d="M16 7.5h4.5V12" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20.5 20.5-4-4" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 3.5 20.5 7 17 10.5" />
      <path d="M20.5 7H9A4.5 4.5 0 0 0 4.5 11.5" />
      <path d="M7 20.5 3.5 17 7 13.5" />
      <path d="M3.5 17H15a4.5 4.5 0 0 0 4.5-4.5" />
    </>
  ),
  euro: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15 9.2a3.8 3.8 0 1 0 0 5.6" />
      <path d="M8 12h6" />
    </>
  ),
  gift: (
    <>
      <rect x="3.5" y="9" width="17" height="4" rx="1" />
      <path d="M5 13v7.5h14V13" />
      <path d="M12 9v11.5" />
      <path d="M12 9C11 6 8.5 5.5 7.5 6.8 6.5 8.2 9.5 9 12 9Z" />
      <path d="M12 9c1-3 3.5-3.5 4.5-2.2C17.5 8.2 14.5 9 12 9Z" />
    </>
  ),
  sparkle: <path d="M12 3.5l1.8 4.9 4.9 1.8-4.9 1.8L12 16.9l-1.8-4.9L5.3 10.2l4.9-1.8z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  heart: <path d="M12 20.3S3.5 15 3.5 9.2a4.3 4.3 0 0 1 8.5-1.1 4.3 4.3 0 0 1 8.5 1.1c0 5.8-8.5 11.1-8.5 11.1Z" />,
  cart: (
    <>
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3.5H5l2.3 12h11l1.8-8.5H6.2" />
    </>
  ),
  rocket: (
    <>
      <path d="M5.5 15c-1.2 1-2 4.5-2 4.5s3.5-.8 4.5-2M9.5 11.5l3 3M14.5 4.5c4 1 5 3 5 3s.5 4.5-3.5 8.5l-6-6c4-4 4.5-5.5 4.5-5.5Z" />
      <circle cx="14.5" cy="9.5" r="1.3" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L18 10l-4-4L4 16v4Z" />
      <path d="M13 7l4 4" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.5 11 5h6.5v6.5L10 19l-6.5-6.5Z" />
      <circle cx="14.5" cy="8.5" r="1.2" />
    </>
  ),
  check: <path d="m5 13 4 4 10-11" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON[name]}
    </svg>
  );
}

type Color = "indigo" | "cyan" | "green" | "amber" | "muted";

function Node({
  icon,
  title,
  sub,
  color = "indigo",
}: {
  icon: string;
  title: string;
  sub?: string;
  color?: Color;
}) {
  const cls = color === "indigo" ? "fig-node" : `fig-node fig-node--${color}`;
  return (
    <div className={cls}>
      <span className="fig-node__ic">
        <Icon name={icon} />
      </span>
      <span className="fig-node__tx">
        <span className="fig-node__t">{title}</span>
        {sub && <span className="fig-node__s">{sub}</span>}
      </span>
    </div>
  );
}

function Conn() {
  return (
    <span className="fig-conn">
      <Icon name="arrow" />
    </span>
  );
}

function Flow({
  nodes,
  loop,
}: {
  nodes: { icon: string; title: string; sub?: string; color?: Color }[];
  loop?: string;
}) {
  return (
    <div className="fig__body">
      <div className="fig-flow">
        {nodes.map((n, i) => (
          <Fragment key={i}>
            <Node icon={n.icon} title={n.title} sub={n.sub} color={n.color} />
            {i < nodes.length - 1 && <Conn />}
          </Fragment>
        ))}
      </div>
      {loop && (
        <div className="fig-loop">
          <Icon name="repeat" />
          {loop}
        </div>
      )}
    </div>
  );
}

function Panel({
  icon,
  title,
  lines,
  color = "indigo",
}: {
  icon: string;
  title: string;
  lines: { t: string; muted?: boolean }[];
  color?: Color;
}) {
  const cls = color === "indigo" ? "fig-panel" : `fig-panel fig-panel--${color}`;
  return (
    <div className={cls}>
      <div className="fig-panel__ic">
        <Icon name={icon} />
      </div>
      <div className="fig-panel__t">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className={l.muted ? "fig-panel__l fig-panel__l--muted" : "fig-panel__l"}>
          {l.t}
        </div>
      ))}
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="fig-steps">
      {items.map((t, i) => (
        <li key={i} className="fig-step">
          <span className="fig-step__n">{i + 1}</span>
          <span className="fig-step__t">{t}</span>
        </li>
      ))}
    </ol>
  );
}

function Frame({
  children,
  caption,
  source,
}: {
  children: ReactNode;
  caption?: string;
  source?: string;
}) {
  return (
    <figure className="fig">
      {children}
      {(caption || source) && (
        <figcaption className="fig__cap">
          {caption}
          {source && <span className="fig__src">Source : {source}</span>}
        </figcaption>
      )}
    </figure>
  );
}

const GRAD_INDIGO_CYAN = "linear-gradient(135deg, hsl(var(--fi)), hsl(var(--fc)))";

// ── J0 : la boucle apprendre en faisant ──
function BoucleApprendre() {
  return (
    <Frame caption="Ici, tu n'apprends pas en regardant : chaque jour, tu comprends puis tu agis, et ça débloque la suite.">
      <Flow
        loop="et on recommence, chaque jour"
        nodes={[
          { icon: "video", title: "Vidéo", sub: "tu comprends", color: "indigo" },
          { icon: "action", title: "Quiz", sub: "tu agis sur TON projet", color: "cyan" },
          { icon: "unlock", title: "Jour suivant", sub: "débloqué", color: "green" },
        ]}
      />
    </Frame>
  );
}

// ── J1 : maths du quiz ──
function QuizMaths() {
  return (
    <Frame
      caption="Sur 100 visiteurs, une page de capture en transforme 2 à 3, un bon quiz environ 30."
      source="Repères de la formation ; ex. Beardbrand a capté 150 000 emails avec un quiz."
    >
      <div className="fig__body">
        <div className="fig-bars">
          <div className="fig-barItem">
            <span className="fig-barItem__n" style={{ color: "hsl(var(--fc))" }}>
              2
            </span>
            <span
              className="fig-barItem__v"
              style={{ height: "1.9rem", background: "linear-gradient(hsl(var(--fc)), hsl(var(--fc) / 0.6))" }}
            />
            <span className="fig-barItem__l">Page de capture</span>
          </div>
          <div className="fig-barItem">
            <span className="fig-barItem__n" style={{ color: "hsl(var(--fi))" }}>
              30
            </span>
            <span className="fig-barItem__v" style={{ height: "7rem", background: GRAD_INDIGO_CYAN }} />
            <span className="fig-barItem__l">Quiz</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ── J1 : profil contre score ──
function ProfilVsScore() {
  return (
    <Frame caption="Deux sortes de quiz : le profil révèle une identité et se partage, le score situe un niveau et donne envie de progresser.">
      <div className="fig__body">
        <div className="fig-duo">
          <Panel
            icon="users"
            title="Profil"
            lines={[
              { t: "Range la personne dans un type" },
              { t: "« Le Bâtisseur »", muted: true },
              { t: "Fait pour être partagé" },
            ]}
          />
          <Panel
            icon="trending"
            title="Score"
            color="cyan"
            lines={[
              { t: "Situe sur un niveau" },
              { t: "Débutant, Confirmé, Expert", muted: true },
              { t: "Donne envie de progresser" },
            ]}
          />
        </div>
      </div>
    </Frame>
  );
}

// ── J1 : la trame d'un resultat qui vend (concept phare) ──
function TrameResultat() {
  return (
    <Frame caption="La trame d'un résultat qui vend sans vendre : il retourne le couteau, gentiment.">
      <div className="fig__body">
        <Steps
          items={[
            "Encourage le rêve",
            "Déculpabilise l'échec passé",
            "Apaise la peur",
            "Confirme un soupçon",
            "Désigne le vrai coupable",
          ]}
        />
        <div className="fig-hero">
          Le coupable : une méthode, un mythe. <strong>Jamais ton client.</strong>
        </div>
        <div className="fig-ex">
          Ex : « Tu n'es pas désorganisé. On t'a vendu des méthodes faites pour des robots, pas pour
          toi. »
        </div>
      </div>
    </Frame>
  );
}

// ── J2 : la cle API, pont Tiquiz - Systeme.io ──
function CleApiPont() {
  return (
    <Frame caption="La clé API relie ton quiz à Systeme.io : chaque contact capté arrive rangé, tout seul.">
      <Flow
        nodes={[
          { icon: "sparkle", title: "Tiquiz", color: "indigo" },
          { icon: "key", title: "clé API", color: "amber" },
          { icon: "mail", title: "Systeme.io", color: "cyan" },
        ]}
      />
    </Frame>
  );
}

// ── J2 : la chaine resultat, tag, segment, offre ──
function Chaine() {
  return (
    <Frame caption="La chaîne qui fait qu'un quiz rapporte : chaque résultat mène à une offre.">
      <Flow
        nodes={[
          { icon: "target", title: "Résultat", color: "indigo" },
          { icon: "tag", title: "Tag", color: "cyan" },
          { icon: "users", title: "Segment", color: "indigo" },
          { icon: "euro", title: "Offre", color: "green" },
        ]}
      />
    </Frame>
  );
}

// ── J3 : les 2 moteurs viraux ──
function DeuxMoteursViraux() {
  return (
    <Frame caption="Un bon quiz a deux moteurs : on le finit (tu captes), on le partage (ça t'amène du monde).">
      <div className="fig__body">
        <div className="fig-branch">
          <Node icon="target" title="Ton quiz" color="indigo" />
          <Conn />
          <div className="fig-branch__col">
            <Node icon="mail" title="On le FINIT" sub="tu récupères son email" color="green" />
            <Node icon="share" title="On le PARTAGE" sub="de nouveaux visiteurs arrivent" color="cyan" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ── J4 : publier une v1 imparfaite ──
function V1Imparfaite() {
  return (
    <Frame caption="Un quiz en ligne, même imparfait, bat un quiz parfait resté dans ta tête.">
      <div className="fig__body">
        <div className="fig-duo">
          <Panel
            icon="edit"
            title="Parfait, dans ta tête"
            color="muted"
            lines={[{ t: "0 lead capté", muted: true }, { t: "jamais publié", muted: true }]}
          />
          <Panel
            icon="rocket"
            title="Imparfait, en ligne"
            color="green"
            lines={[{ t: "ça capte déjà" }, { t: "tu l'améliores après", muted: true }]}
          />
        </div>
      </div>
    </Frame>
  );
}

// ── J4 / bonus vendre : page de resultat en 4 temps ──
function PageResultat() {
  return (
    <Frame caption="Ta page de résultat qui convertit, sans forcer : elle diagnostique puis propose.">
      <div className="fig__body">
        <Steps
          items={[
            "Le miroir : voici où tu en es",
            "La cause cachée : pourquoi tu bloques (ce n'est pas ta faute)",
            "Le chemin : ce qu'un profil comme toi doit faire",
            "Le pont vers ton offre",
          ]}
        />
      </div>
    </Frame>
  );
}

// ── J5 : la boucle d'auto-viralite ──
function BoucleViralite() {
  return (
    <Frame caption="La boucle d'auto-viralité : chaque visiteur qui veut le bonus t'en ramène un autre.">
      <Flow
        loop="et ça repart, tout seul"
        nodes={[
          { icon: "action", title: "Il finit le quiz", color: "indigo" },
          { icon: "gift", title: "Il veut le bonus", color: "amber" },
          { icon: "share", title: "Il partage 1 fois", color: "cyan" },
          { icon: "users", title: "Un proche vient", color: "green" },
        ]}
      />
    </Frame>
  );
}

// ── J6 : l'echelle de confiance ──
function EchelleConfiance() {
  const stairs = [
    { label: "Lead", icon: "mail", h: "2.2rem" },
    { label: "Il te voit souvent", icon: "eye", h: "3.6rem" },
    { label: "Confiance", icon: "heart", h: "5rem" },
    { label: "Achat", icon: "cart", h: "6.6rem" },
  ];
  return (
    <Frame
      caption="Plus tes leads te voient, plus ils te font confiance. Et on achète à qui on fait confiance."
      source="Bain & Company : +5% de rétention client = +25 à 95% de profit."
    >
      <div className="fig__body">
        <div className="fig-stairs">
          {stairs.map((s) => (
            <div key={s.label} className="fig-stair">
              <span className="fig-stair__ic">
                <Icon name={s.icon} />
              </span>
              <span className="fig-stair__l">{s.label}</span>
              <span className="fig-stair__v" style={{ height: s.h, background: GRAD_INDIGO_CYAN }} />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ── J7 : le funnel en 5 etapes ──
function Funnel5() {
  const rows = [
    { label: "Vues", w: "100%" },
    { label: "Démarrages", w: "80%" },
    { label: "Finis", w: "62%" },
    { label: "Captures", w: "46%" },
    { label: "Ventes", w: "32%", goal: true },
  ];
  return (
    <Frame caption="À chaque étape, des gens s'arrêtent. Répare d'abord la marche où tu perds le plus de monde.">
      <div className="fig__body">
        <div className="fig-funnel">
          {rows.map((r) => (
            <div
              key={r.label}
              className="fig-funnel__row"
              style={{
                width: r.w,
                background: r.goal
                  ? "linear-gradient(135deg, hsl(var(--fg)), hsl(var(--fc)))"
                  : GRAD_INDIGO_CYAN,
              }}
            >
              {r.label}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ── Bonus trafic payant : l'offre auto-liquidante ──
function OffreAutoLiquidante() {
  return (
    <Frame
      caption="Ses ventes remboursent ta pub, donc tes leads te reviennent gratuits. La pub passe de pari à robinet."
      source="Dropbox : des leads à ~0,25€ avec ce mécanisme."
    >
      <Flow
        nodes={[
          { icon: "euro", title: "Pub", sub: "tu dépenses 10€", color: "amber" },
          { icon: "target", title: "Petite offre", sub: "te rend ~10€", color: "indigo" },
          { icon: "gift", title: "Leads", sub: "gratuits", color: "green" },
        ]}
      />
    </Frame>
  );
}

// ── Bonus sondages : quiz contre sondage ──
function QuizVsSondage() {
  return (
    <Frame
      caption="Le quiz donne un résultat à la personne et capte. Le sondage, lui, te sert : il écoute ta cible."
      source="Méthode ASK (Ryan Levesque) : 100 M$ générés en interrogeant la cible d'abord."
    >
      <div className="fig__body">
        <div className="fig-duo">
          <Panel
            icon="target"
            title="Quiz"
            lines={[{ t: "Donne un résultat à la personne" }, { t: "Attire et capte des leads" }]}
          />
          <Panel
            icon="search"
            title="Sondage"
            color="cyan"
            lines={[{ t: "Te sert TOI" }, { t: "Écoute ta cible, tu ne devines plus" }]}
          />
        </div>
      </div>
    </Frame>
  );
}

// ── Bonus popquiz : capture au pic de curiosite ──
function CapturePic() {
  return (
    <Frame caption="Place la demande d'email juste avant la révélation, quand la curiosité est au sommet.">
      <div className="fig__body">
        <div className="fig-tl">
          <span className="fig-tl__lab" style={{ left: "80%" }}>
            Demande l'email ici
          </span>
          <span className="fig-tl__mark" style={{ left: "80%" }}>
            <Icon name="mail" />
          </span>
        </div>
        <div className="fig-tlends">
          <span>Début de la vidéo</span>
          <span>Révélation</span>
        </div>
      </div>
    </Frame>
  );
}

// ── Bonus reseaux : la regle des 7 contacts ──
function Regle7Contacts() {
  return (
    <Frame caption="La règle des 7 contacts : poste régulièrement, la confiance vient avec la répétition.">
      <div className="fig__body">
        <div className="fig-dots">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className="fig-dot">
              {n}
            </span>
          ))}
          <span className="fig-dot fig-dot--on">
            <Icon name="check" />
          </span>
        </div>
        <div className="fig-note">on doit te voir ~7 fois avant de te faire confiance</div>
      </div>
    </Frame>
  );
}

export function Figure({ name }: { name: string }) {
  switch (name) {
    case "quiz-maths":
      return <QuizMaths />;
    case "chaine-resultat":
      return <Chaine />;
    case "page-resultat":
      return <PageResultat />;
    case "capture-pic":
      return <CapturePic />;
    case "trame-resultat":
      return <TrameResultat />;
    case "profil-vs-score":
      return <ProfilVsScore />;
    case "boucle-apprendre":
      return <BoucleApprendre />;
    case "cle-api-pont":
      return <CleApiPont />;
    case "deux-moteurs-viraux":
      return <DeuxMoteursViraux />;
    case "v1-imparfaite":
      return <V1Imparfaite />;
    case "boucle-viralite":
      return <BoucleViralite />;
    case "echelle-confiance":
      return <EchelleConfiance />;
    case "funnel-5-etapes":
      return <Funnel5 />;
    case "offre-auto-liquidante":
      return <OffreAutoLiquidante />;
    case "quiz-vs-sondage":
      return <QuizVsSondage />;
    case "regle-7-contacts":
      return <Regle7Contacts />;
    default:
      return null;
  }
}
