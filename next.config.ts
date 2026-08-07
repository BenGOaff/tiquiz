import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // `pdf-parse` charge son worker par un import DYNAMIQUE calculé à
  // l'exécution (`pdf.worker.mjs`). Bundlé, le code part bien mais le
  // fichier worker ne suit pas, et l'import PDF échoue en prod avec
  // "Setting up fake worker failed" alors que tout est vert en local et
  // que le build ne dit rien. Le laisser EXTERNE le fait charger depuis
  // node_modules, où son worker est à côté de lui.
  //
  // Vérifié le 7 août 2026 en envoyant un vrai PDF au serveur de
  // production : cassé sans cette ligne, correct avec.
  serverExternalPackages: ["pdf-parse"],
  // Et le worker doit être COPIÉ dans la sortie standalone. Next trace
  // les fichiers en suivant les imports qu'il voit ; celui-ci est
  // construit à l'exécution, donc il ne le voit pas et ne le copie pas.
  // Les deux réglages sont nécessaires : sans le premier le worker est
  // cherché au mauvais endroit, sans le second il n'existe pas du tout.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default withNextIntl(nextConfig);
