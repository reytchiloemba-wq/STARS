import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect('/login');

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-danger/30 bg-surface p-8 shadow-xl">
          <span className="text-3xl">🛡️</span>
          <h1 className="mt-3 text-lg font-bold text-foreground">Accès Super Administrateur Requis</h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Cet espace est strictement réservé aux administrateurs de l&apos;infrastructure globale STARS.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-start-gradient px-4 py-2 text-xs font-semibold text-white shadow"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-start-gradient bg-clip-text text-xl font-extrabold text-transparent">
              STARS SuperAdmin
            </span>
            <span className="rounded bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">
              Zone Globale
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground">
              Supervision
            </Link>
            <Link href="/admin/infrastructure" className="hover:text-foreground">
              Infrastructure &amp; Connexions
            </Link>
          </nav>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">{user.email}</span>
            <Link href="/" className="font-semibold text-accent-cyan hover:underline">
              Quitter vers le site →
            </Link>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
