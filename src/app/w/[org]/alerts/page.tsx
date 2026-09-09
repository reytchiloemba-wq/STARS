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
          Configurez les entreprises, personnalités, mots-clés et territoires que vous souhaitez suivre.
        </p>
        <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          Ces alertes sont enregistrées mais le déclenchement automatique (notification dès qu&apos;un fait est
          détecté) nécessite un pipeline de veille continu — non encore connecté (voir{' '}
          <a href="/admin/infrastructure" className="underline">
            Infrastructure &amp; Connexions
          </a>
          ). Activer une alerte ici ne déclenche aucune notification pour le moment.
        </p>
      </div>

      <AlertsClient org={org} alerts={alerts} watchlists={watchlists} />
    </div>
  );
}
