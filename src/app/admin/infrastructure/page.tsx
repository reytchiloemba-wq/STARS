import { db } from '@/lib/db';
import { PROVIDERS, CATEGORY_LABELS, type ProviderCategory } from '@/config/providers';
import InfrastructureClient from './infrastructure-client';

export const dynamic = 'force-dynamic';

export default async function InfrastructurePage() {
  const [integrations, incidents, recentAudit, costByProvider] = await Promise.all([
    db.globalIntegration.findMany({ include: { provider: true } }),
    db.integrationIncident.findMany({
      where: { resolvedAt: null },
      include: { globalIntegration: { include: { provider: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.auditLog.findMany({
      where: { action: { startsWith: 'infrastructure.' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { actor: { select: { email: true } } },
    }),
    db.costRecord.groupBy({
      by: ['globalIntegrationId'],
      _sum: { costCents: true },
    }),
  ]);

  const integrationsByProvider = new Map(integrations.map((i) => [i.provider.key, i]));
  const costByIntegrationId = new Map(costByProvider.map((c) => [c.globalIntegrationId, c._sum.costCents ?? 0]));

  const categories = Array.from(new Set(PROVIDERS.map((p) => p.category))) as ProviderCategory[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Infrastructure &amp; Connexions</h1>
        <p className="text-xs text-muted-foreground">
          Configuration globale des fournisseurs STARS — invisible pour les tenants (spec §4-5).
        </p>
      </div>

      <InfrastructureClient
        categories={categories}
        categoryLabels={CATEGORY_LABELS}
        providers={PROVIDERS}
        integrationsByProviderKey={Object.fromEntries(
          PROVIDERS.map((p) => {
            const integration = integrationsByProvider.get(p.key);
            if (!integration) return [p.key, null];
            return [
              p.key,
              {
                id: integration.id,
                environment: integration.environment,
                status: integration.status,
                isPrimary: integration.isPrimary,
                credentialsFingerprint: integration.credentialsFingerprint,
                lastTestedAt: integration.lastTestedAt?.toISOString() ?? null,
                lastTestResult: integration.lastTestResult,
                lastTestMessage: integration.lastTestMessage,
                totalCostCents: costByIntegrationId.get(integration.id) ?? 0,
              },
            ];
          }),
        )}
        incidents={incidents.map((i) => ({
          id: i.id,
          providerName: i.globalIntegration.provider.name,
          severity: i.severity,
          message: i.message,
          createdAt: i.createdAt.toISOString(),
        }))}
        auditLog={recentAudit.map((a) => ({
          id: a.id,
          action: a.action,
          actorEmail: a.actor?.email ?? '—',
          createdAt: a.createdAt.toISOString(),
          metadata: a.metadata,
        }))}
      />
    </div>
  );
}
