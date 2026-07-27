// app/visual-test/page.tsx — harness de tests visuels (Playwright).
// Rend le quiz public avec un quiz de DEMO en dur (aucune base requise),
// piloté par query params : ?layout=centered|left|split & intro=card|cover
// & bg=solid|gradient|image. Sert de sujet aux captures d'écran comparées
// aux références (tests/visual). JAMAIS accessible en prod : la page 404
// sauf si VISUAL_TEST=1 (env posée uniquement par le runner Playwright).
import { notFound } from "next/navigation";
import VisualTestClient from "./VisualTestClient";

export const dynamic = "force-dynamic";

export default async function VisualTestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.VISUAL_TEST !== "1") notFound();
  const sp = await searchParams;
  const pick = (k: string): string => {
    const v = sp[k];
    return typeof v === "string" ? v : "";
  };
  return (
    <VisualTestClient
      layout={pick("layout")}
      intro={pick("intro")}
      bg={pick("bg")}
    />
  );
}
