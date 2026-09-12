import { requireSuperAdmin } from '@/lib/super-admin';
import { getFoundersPromo } from '@/server/services/promo.service';
import { PLANS } from '@/config/pricing';
import Link from 'next/link';
import PricingClient from './pricing-client';

export const metadata = {
  title: 'Tarification & Promotions | STARS Super Admin',
};

export default async function PricingAdminPage() {
  await requireSuperAdmin();
  const foundersPromo = await getFoundersPromo();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin" className="hover:text-accent-cyan transition-colors">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-white">Tarification &amp; Promotions</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Tarification &amp; Promotions
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Les 5 offres et le barème SIC restent définis dans <code>src/config/pricing.ts</code> (nécessite un déploiement).
            Le programme Fondateurs, lui, est administrable ici sans redéploiement.
          </p>
        </div>
      </div>

      <PricingClient promo={foundersPromo} eligiblePlanKeys={PLANS.filter((p) => p.key !== 'discovery' && p.key !== 'enterprise').map((p) => ({ key: p.key, name: p.name }))} />
    </div>
  );
}
