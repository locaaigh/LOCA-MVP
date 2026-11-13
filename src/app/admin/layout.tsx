import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { Logo } from "@/components/brand";
import { AdminTabs } from "@/components/admin-tabs";

// El backoffice no existe para quien no es admin: notFound() (404, no 403)
// para no confirmar que la ruta está. El middleware ya cortó a los anónimos
// (fail-closed); acá se verifica la membresía real contra admin_users.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) notFound();

  return (
    <div className="min-h-screen bg-surface-subtle">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Logo className="text-xl" />
            </Link>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              Admin
            </span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{session.email}</span>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-3 sm:px-6">
          <AdminTabs />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
