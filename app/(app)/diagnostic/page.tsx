import { redirect } from "next/navigation";
import { getViewer } from "@/lib/parcours";
import { NoAccess } from "@/components/NoAccess";
import { Diagnostic } from "./Diagnostic";

export const dynamic = "force-dynamic";

export default async function DiagnosticPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;
  // Deja fait : on ne represente pas le diagnostic.
  if (viewer.profile?.diagnostic_completed_at) redirect("/dashboard");

  const firstName = viewer.profile?.full_name?.split(" ")[0] ?? null;
  return <Diagnostic firstName={firstName} />;
}
