import { requireSuperAdmin } from '@/lib/super-admin';
import { getMakeAdminOverview } from '@/server/services/make/admin.service';
import MakeClient from './make-client';
import Link from 'next/link';

export const metadata = {
  title: 'Make & FinOps | STARS Super Admin',
};

export default async function MakeAdminPage() {
  await requireSuperAdmin();
  const overview = await getMakeAdminOverview();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin" className="hover:text-accent-cyan transition-colors">
              Super Admin
            </Link>
            <span>/</span>
            <Link href="/admin/infrastructure" className="hover:text-accent-cyan transition-colors">
              Infrastructure
            </Link>
            <span>/</span>
            <span className="text-white">Make &amp; FinOps</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Passerelle d’Orchestration Make &amp; FinOps
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Supervision de la couche d’automatisation Make, des signatures HMAC, des scénarios et de la marge brute unitaire.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/infrastructure"
            className="rounded-xl border border-border/80 bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:border-accent-cyan transition-colors"
          >
            ← Tous les connecteurs
          </Link>
        </div>
      </div>

      <MakeClient overview={overview} />
    </div>
  );
}
