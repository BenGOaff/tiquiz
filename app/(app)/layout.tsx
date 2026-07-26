import { AppHeader } from "@/components/AppHeader";
import { CoachBubble } from "@/components/CoachBubble";
import { getViewer } from "@/lib/parcours";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  const isAdmin = isAdminEmail(viewer?.email);
  const enrolled = viewer?.enrolled ?? false;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <AppHeader
        isAdmin={isAdmin}
        name={viewer?.profile?.full_name ?? null}
        email={viewer?.email ?? null}
        avatarUrl={viewer?.profile?.avatar_url ?? null}
      />
      <main className="container flex-1 py-8">{children}</main>
      {/* Coach dispo pour les eleves avec acces (et pour l'admin pour tester). */}
      {(enrolled || isAdmin) && <CoachBubble />}
    </div>
  );
}
