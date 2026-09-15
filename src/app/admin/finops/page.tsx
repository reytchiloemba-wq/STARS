import { requireSuperAdmin } from '@/lib/super-admin';
import { getFinOpsOverview } from '@/server/services/finops.service';
import Link from 'next/link';
import FinOpsClient from './finops-client';

export const metadata = {
  title: 'FinOps & Marge Brute IA | STARS Super Admin',
};

export default async function FinOpsAdminPage() {
  await requireSuperAdmin();
  const overview = await getFinOpsOverview();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin" className="hover:text-accent-cyan transition-colors">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-white">FinOps &amp; Marge Brute</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Télémétrie FinOps &amp; Marge Brute IA Native
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Supervision en temps réel des coûts techniques unitaires (tokens LLM, DALL·E 3, requêtes de recherche) et garantie d’une marge brute unitaire supérieure à 70%.
          </p>
        </div>
      </div>

      <FinOpsClient overview={overview} />
    </div>
  );
}
