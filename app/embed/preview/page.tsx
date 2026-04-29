// app/embed/preview/page.tsx
// Public, embeddable preview of the Tiquiz editor.
//
// Loaded inside an <iframe> on third-party landing pages (systeme.io,
// Carrd…). The page renders the same UI primitives as the rest of
// Tiquiz so what the visitor sees here is what they'll get post-
// checkout in their dashboard, minus the systeme.io-specific knobs
// (tags, course id, community id) which are configured later.
//
// All state is anonymous: the embed_quiz_session uuid is the only
// identity. The page reads ?session=… on first load to rehydrate a
// saved draft; otherwise it shows the "describe your quiz" form.

import EmbedPreviewClient from "@/components/embed/EmbedPreviewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmbedPreviewPage(props: {
  searchParams: Promise<{
    session?: string;
    locale?: string;
    source?: string;
    checkout?: string;
  }>;
}) {
  const sp = await props.searchParams;
  const locale = sp.locale === "en" ? "en" : "fr";
  return (
    <EmbedPreviewClient
      initialSessionToken={sp.session ?? ""}
      locale={locale}
      source={sp.source ?? "embed"}
      checkoutUrl={sp.checkout ?? "https://www.tipote.fr/tiquiz"}
    />
  );
}
