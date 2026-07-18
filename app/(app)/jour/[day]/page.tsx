import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, LinkIcon } from "lucide-react";
import { getViewer, getDayDetail, getDaysWithProgress } from "@/lib/parcours";
import { isAdminEmail } from "@/lib/adminEmails";
import { resolveDayVideos } from "@/lib/video/playback";
import { personalizeContent } from "@/lib/personalize";
import { resolvePersona, personaTailoredHeading } from "@/lib/personas";
import { getPersonaVocab, getDayPersonaExample } from "@/lib/personaContent";
import { Sparkles, Gem } from "lucide-react";
import { VideoBlock } from "@/components/VideoBlock";
import { RichContent } from "@/components/RichContent";
import { NoAccess } from "@/components/NoAccess";
import { BlockerButton } from "@/components/BlockerButton";
import { Card, CardContent } from "@/components/ui/card";
import { QuizRunner } from "./QuizRunner";

export const dynamic = "force-dynamic";

// Shortcodes [[video:1]] / [[video:2]] insérés depuis l'éditeur admin :
// ils placent les vidéos du jour DANS le contenu riche (texte avant et
// après). Même mécanique que [[figure:...]] dans RichContent : on
// dédouble le HTML autour des tokens et on intercale les lecteurs.
// L'éditeur enveloppe le shortcode dans un <p> (parfois avec un <br>),
// qu'on retire avant le split.
const VIDEO_UNWRAP = /<(p|div)>\s*(\[\[video:\d+\]\])\s*(?:<br\s*\/?>\s*)?<\/\1>/gi;
const VIDEO_SPLIT = /(\[\[video:\d+\]\])/i;
const VIDEO_ONE = /^\[\[video:(\d+)\]\]$/i;

export default async function DayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  const dayNumber = Number.parseInt(day, 10);
  if (!Number.isFinite(dayNumber)) notFound();

  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const detail = await getDayDetail(viewer.userId, dayNumber, {
    bypassLock: isAdminEmail(viewer.email),
  });
  // Jour inexistant, non publié, ou pas encore débloqué : on renvoie au
  // tableau de bord plutôt que d'exposer un 404 sec.
  if (!detail) redirect("/dashboard");

  const { day: d, questions, answers } = detail;

  // Jour suivant (pour le bouton de déblocage en fin de quiz). On chaine
  // uniquement dans le parcours ; les bonus ne s'enchainent pas.
  const allDays = await getDaysWithProgress(viewer.userId);
  const parcoursDays = allDays.filter((x) => !x.is_bonus);
  let nextDayNumber: number | null = null;
  if (!d.is_bonus) {
    const idx = parcoursDays.findIndex((x) => x.day_number === d.day_number);
    nextDayNumber =
      idx >= 0 && idx + 1 < parcoursDays.length ? parcoursDays[idx + 1].day_number : null;
  }

  const resources = d.resources ?? [];
  // Personnalisation : {prenom} + vocabulaire du persona ({offre}, {client}
  // ...), plus un encart d'exemples concrets dans le metier de l'eleve.
  const firstName = viewer.profile?.full_name?.split(" ")[0] ?? null;
  const persona = resolvePersona(viewer.profile?.activity_type);
  const vocab = await getPersonaVocab(persona);
  const introHtml = personalizeContent(d.intro_html, { firstName, vocab });
  const resultHtml = personalizeContent(d.result_html, { firstName, vocab });
  const pepiteHtml = personalizeContent(d.pepite_html, { firstName, vocab });

  // Vidéos du jour : liste ordonnée unique (module multi-vidéos si
  // days.videos non vide, sinon le couple video/video2). Le titre de
  // chacune est personnalisé comme le reste du contenu. L'index dans
  // cette liste = le N des shortcodes [[video:N]] (1-indexé).
  const dayVideos = (await resolveDayVideos(d)).map((v) => ({
    ...v,
    title: personalizeContent(v.title, { firstName, vocab }),
  }));

  // Découpe le contenu autour des shortcodes vidéo. Une vidéo PLACÉE dans
  // le texte n'apparaît plus en haut de page ; une vidéo non placée garde
  // sa position historique au-dessus du contenu.
  const introParts = (introHtml ?? "").replace(VIDEO_UNWRAP, "$2").split(VIDEO_SPLIT);
  const placedSlots = new Set(
    introParts.map((p) => p.match(VIDEO_ONE)?.[1]).filter(Boolean) as string[],
  );
  const personaExample = personalizeContent(await getDayPersonaExample(d.id, persona), {
    firstName,
    vocab,
  });

  return (
    // max-w-5xl (au lieu de 3xl) : l'élève doit voir les détails des
    // vidéos. Presque la largeur du dashboard (qui occupe tout le
    // container), sans y coller pour garder le texte lisible.
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Mon parcours
      </Link>

      <header className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-primary">
          {d.is_bonus ? "Bonus" : `Jour ${d.day_number}`}
        </span>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{d.title}</h1>
        {d.subtitle && <p className="text-muted-foreground">{d.subtitle}</p>}
      </header>

      {/* Vidéos non placées dans le texte : rendues en haut de page, dans
          l'ordre. La 1re s'affiche même vide (placeholder), les suivantes
          seulement si configurées. Une vidéo placée via [[video:N]] quitte
          le haut de page. */}
      {dayVideos.map((v, idx) => {
        const slot = String(idx + 1);
        if (placedSlots.has(slot)) return null;
        if (idx > 0 && !v.configured) return null;
        return <VideoBlock key={slot} src={v.src} title={v.title} />;
      })}

      {introParts.map((part, i) => {
        if (!part || !part.trim()) return null;
        const token = part.match(VIDEO_ONE);
        // Chunk sans contenu réel (ex. <p><br></p> résiduel autour d'une
        // vidéo) : pas de Card vide. Les [[figure:...]] comptent comme du
        // contenu (pas de texte mais un schéma à rendre).
        if (
          !token &&
          !/\[\[figure:/i.test(part) &&
          part.replace(/<[^>]*>|&nbsp;|\s/g, "") === ""
        ) {
          return null;
        }
        if (token) {
          const v = dayVideos[Number(token[1]) - 1];
          // Shortcode qui pointe une vidéo inexistante ou non configurée :
          // on l'ignore silencieusement (pas de cadre vide chez l'élève).
          if (!v || !v.configured) return null;
          return <VideoBlock key={i} src={v.src} title={v.title} />;
        }
        return (
          <Card key={i}>
            <CardContent className="py-5">
              <RichContent html={part} />
            </CardContent>
          </Card>
        );
      })}

      {/* La pepite : nugget avance et actionnable (persuasion, growth). */}
      {pepiteHtml && (
        <Card className="border-l-4 border-l-amber-400 bg-amber-50/60">
          <CardContent className="flex flex-col gap-2 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <Gem className="size-4" />
              La pépite
            </span>
            <RichContent html={pepiteHtml} />
          </CardContent>
        </Card>
      )}

      {/* Encart "Pour toi" : exemples concrets dans le metier de l'eleve. */}
      {personaExample && (
        <Card className="border-primary/30 bg-surface-soft">
          <CardContent className="flex flex-col gap-2 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="size-4" />
              {personaTailoredHeading(persona)}
            </span>
            <RichContent html={personaExample} />
          </CardContent>
        </Card>
      )}

      {resources.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-5">
            <h2 className="text-sm font-semibold">Ressources du jour</h2>
            <ul className="flex flex-col gap-1.5">
              {resources.map((r, i) => (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {r.type === "download" ? (
                      <Download className="size-4" />
                    ) : (
                      <LinkIcon className="size-4" />
                    )}
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <QuizRunner
        dayNumber={d.day_number}
        questions={questions}
        initialAnswers={answers}
        alreadyCompleted={d.progress === "completed"}
        resultHtml={resultHtml}
        nextDayNumber={nextDayNumber}
        isBonus={d.is_bonus}
      />

      <BlockerButton dayNumber={d.day_number} />
    </div>
  );
}
