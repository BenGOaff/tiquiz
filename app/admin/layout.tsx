import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminGuard";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Défense en profondeur : le middleware garde déjà /admin, on revérifie ici.
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo className="text-xl" />
            <Badge variant="muted">Admin</Badge>
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
