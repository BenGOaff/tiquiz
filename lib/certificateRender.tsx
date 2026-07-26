// lib/certificateRender.tsx
//
// Rendu du certificat de reussite en PNG, cote serveur (next/og + Satori).
// On part du VRAI template Canva de Bene (public/certificat/) comme fond
// fixe, et on ne superpose QUE deux choses dynamiques :
//   - le NOM choisi par l'eleve, en Parisienne, centre et pose juste sur
//     la ligne bleue (comme un soulignement),
//   - le NUMERO de certificat (format AAAAMMJJ + rang du jour), a droite
//     du libelle "...sous le numero" deja imprime dans le template.
//
// Les coordonnees sont calees dans l'espace 2000x1414 (le template natif
// 3750x2652 y est reduit a l'identique) et mises a l'echelle selon la
// largeur demandee. Ces valeurs ont ete validees visuellement avec Bene.
//
// Runtime Node obligatoire (lecture des fichiers police + image via fs).
import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";

// ── Reperes geometriques (base 2000x1414) ──
const BASE_W = 2000;
const BASE_H = 1414;
const NAME_LEFT = 773;
const NAME_WIDTH = 1165;
const NAME_BASELINE = 772; // y de la ligne bleue : le nom se pose dessus
const NAME_MAX_FONT = 104;
const NAME_MIN_FONT = 52;
const NAME_COLOR = "#0f1836";
const NUM_LEFT = 840;
const NUM_TOP = 56;
const NUM_FONT = 27;
const NUM_COLOR = "#2b3560";
// Emprise du QR code du template (releve pixel). On y superpose le vrai QR,
// centre, avec une pastille de fond legerement plus grande pour masquer
// proprement le QR decoratif d'origine.
const QR_CENTER_X = 475;
const QR_CENTER_Y = 1195;
const QR_BOX = 214; // > emprise d'origine (~200) pour la recouvrir
const QR_LIGHT = "#f0f0ff"; // fond local du template (quiet zone fondue)
const QR_DARK = "#101a3a"; // navy fonce, fort contraste + raccord design

// ── Chargement paresseux + cache des assets (template + polices) ──
type Assets = {
  templateDataUri: string;
  parisienne: Buffer;
  poppins: Buffer;
};
let cached: Assets | null = null;

function loadAssets(): Assets {
  if (cached) return cached;
  const dir = path.join(process.cwd(), "public", "certificat");
  const png = readFileSync(path.join(dir, "template-2000.png"));
  cached = {
    templateDataUri: `data:image/png;base64,${png.toString("base64")}`,
    parisienne: readFileSync(path.join(dir, "Parisienne-Regular.ttf")),
    poppins: readFileSync(path.join(dir, "Poppins-SemiBold.ttf")),
  };
  return cached;
}

/** Nettoie le nom affiche : une seule ligne, espaces normalises, borne. */
export function cleanCertName(raw: string | null | undefined): string {
  const s = (raw ?? "").replace(/\s+/g, " ").trim();
  // On borne pour eviter un nom absurde qui rendrait le certificat illisible.
  return s.slice(0, 48);
}

// Taille de police du nom : on part de NAME_MAX_FONT et on reduit pour que
// le nom tienne dans la largeur de la ligne. Facteur d'avance moyen calibre
// sur la Parisienne (~0.46 * fontSize par glyphe).
function nameFontSize(name: string): number {
  const fit = NAME_WIDTH / (Math.max(1, name.length) * 0.46);
  return Math.max(NAME_MIN_FONT, Math.min(NAME_MAX_FONT, Math.round(fit)));
}

/**
 * Construit l'ImageResponse (PNG) du certificat.
 * @param name   nom deja nettoye (cf. cleanCertName)
 * @param number numero de certificat (ex. "2026072501")
 * @param qrUrl  URL encodee dans le QR (lien affilie tracke ou lien de vente)
 * @param width  largeur de rendu (defaut 2000). La hauteur suit le ratio.
 */
export async function renderCertificate({
  name,
  number,
  qrUrl,
  width = BASE_W,
}: {
  name: string;
  number: string;
  qrUrl?: string | null;
  width?: number;
}): Promise<ImageResponse> {
  const { templateDataUri, parisienne, poppins } = loadAssets();
  const scale = width / BASE_W;
  const height = Math.round(BASE_H * scale);

  const baseFont = nameFontSize(name);
  const nameFont = baseFont * scale;
  const nameTop = Math.round((NAME_BASELINE - 0.8 * baseFont) * scale);

  // Vrai QR code (recouvre celui, decoratif, du template) si on a une URL.
  // ECC "M" : bon compromis robustesse / densite. Marge = quiet zone.
  let qrDataUri: string | null = null;
  if (qrUrl && qrUrl.trim()) {
    qrDataUri = await QRCode.toDataURL(qrUrl.trim(), {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 440,
      color: { dark: QR_DARK, light: QR_LIGHT },
    });
  }
  const qrSize = QR_BOX * scale;
  const qrLeft = (QR_CENTER_X - QR_BOX / 2) * scale;
  const qrTop = (QR_CENTER_Y - QR_BOX / 2) * scale;

  return new ImageResponse(
    (
      <div style={{ position: "relative", width, height, display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={templateDataUri}
          width={width}
          height={height}
          style={{ position: "absolute", top: 0, left: 0 }}
          alt=""
        />
        <div
          style={{
            position: "absolute",
            left: NUM_LEFT * scale,
            top: NUM_TOP * scale,
            display: "flex",
            fontFamily: "Poppins",
            fontWeight: 600,
            fontSize: NUM_FONT * scale,
            color: NUM_COLOR,
            letterSpacing: 0.3 * scale,
          }}
        >
          {number}
        </div>
        <div
          style={{
            position: "absolute",
            left: NAME_LEFT * scale,
            top: nameTop,
            width: NAME_WIDTH * scale,
            display: "flex",
            justifyContent: "center",
            fontFamily: "Parisienne",
            fontSize: nameFont,
            lineHeight: 1,
            color: NAME_COLOR,
          }}
        >
          {name}
        </div>
        {qrDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUri}
            width={qrSize}
            height={qrSize}
            alt=""
            style={{ position: "absolute", left: qrLeft, top: qrTop }}
          />
        ) : null}
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Parisienne", data: parisienne, weight: 400, style: "normal" },
        { name: "Poppins", data: poppins, weight: 600, style: "normal" },
      ],
    },
  );
}
