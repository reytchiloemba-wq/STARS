import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import AlertsClient from './alerts-client';

export default async function AlertsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const [alerts, watchlists] = await Promise.all([
    db.alert.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: 'desc' },
    }),
    db.watchlist.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Alertes & Watchlists</h1>
        <p className="text-sm text-muted-foreground">
          Surveillez en temps réel vos concurrents, personnalités clés, technologies critiques et réglementations.
        </p>
      </div>

      <AlertsClient org={org} alerts={alerts} watchlists={watchlists} />
    </div>
  );
}
