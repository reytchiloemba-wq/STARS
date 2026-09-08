import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';

// No analytics-provider ingestion exists yet in this codebase (the
// `AnalyticsSnapshot` model is defined but nothing writes to it — reach,
// impressions and engagement all require calling each network's own
// analytics API, which needs a connected account, see
// /w/[org]/settings/social). A prior version of this page fabricated those
// numbers with a formula that scaled with the tenant's real publish count
// (making them *look* derived from real activity) and presented invented,
// hyper-specific "recommendations" ("your Tuesday posts get 35% more
// engagement") as if computed from the tenant's own history. Both were pure
// fiction with no data behind them — fixed below: only genuinely DB-backed
// counts are shown as real numbers; everything illustrative is clearly
// marked "Démonstration", matching the convention used everywhere else in
// the app (see src/server/adapters/news/mock.ts's `isDemoData` flag).
export default async function AnalyticsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const [publishedCount, scheduledCount, failedCount, draftsCount, connectedAccounts] = await Promise.all([
    db.publication.count({ where: { organizationId: ctx.organization.id, status: 'PUBLISHED' } }),
    db.publication.count({ where: { organizationId: ctx.organization.id, status: 'SCHEDULED' } }),
    db.publication.count({ where: { organizationId: ctx.organization.id, status: 'FAILED' } }),
    db.draft.count({ where: { organizationId: ctx.organization.id } }),
    db.socialAccount.count({ where: { organizationId: ctx.organization.id, status: 'ACTIVE' } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics &amp; Mesure d&apos;Impact</h1>
        <p className="text-sm text-muted-foreground">
          Suivi réel de votre activité éditoriale. La portée et l&apos;engagement par réseau nécessitent une
          intégration analytics par plateforme, non encore connectée.
        </p>
      </div>

      {/* KPI réels — comptages en base, jamais estimés */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Publications réussies</div>
          <div className="mt-1 text-2xl font-bold text-success">{publishedCount}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Programmées</div>
          <div className="mt-1 text-2xl font-bold text-accent-violet">{scheduledCount}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Échecs de publication</div>
          <div className="mt-1 text-2xl font-bold text-danger">{failedCount}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="text-xs text-muted-foreground">Comptes sociaux connectés</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{connectedAccounts}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="text-xs text-muted-foreground">Brouillons au total (tous statuts)</div>
        <div className="mt-1 text-2xl font-bold text-foreground">{draftsCount}</div>
      </div>

      {connectedAccounts === 0 && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Aucun compte social connecté. Connectez-en un dans{' '}
          <a href={`/w/${org}/settings/social`} className="underline">
            Paramètres → Réseaux sociaux
          </a>{' '}
          pour commencer à publier et à mesurer votre impact réel.
        </p>
      )}

      {/* Aperçu illustratif — clairement séparé et marqué comme démonstration */}
      <section className="rounded-2xl border border-accent-orange/30 bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground">Aperçu : performance par plateforme</h2>
          <span className="demo-badge">Démonstration</span>
        </div>
        <p className="text-xs text-muted-foreground">
          À quoi ressemblera cette vue une fois les API analytics de chaque réseau connectées. Les chiffres
          ci-dessous sont des exemples fixes, pas vos données.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
              <tr>
                <th className="pb-3">Plateforme</th>
                <th className="pb-3">Portée</th>
                <th className="pb-3">Taux d&apos;engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { network: 'LinkedIn', impressions: '32,4 k', avgEngagement: '8,4 %' },
                { network: 'X / Twitter', impressions: '11,8 k', avgEngagement: '4,2 %' },
                { network: 'Instagram', impressions: '3,2 k', avgEngagement: '6,8 %' },
                { network: 'Facebook', impressions: '800', avgEngagement: '3,1 %' },
              ].map((net) => (
                <tr key={net.network}>
                  <td className="py-3 font-semibold text-foreground">{net.network}</td>
                  <td className="py-3 font-mono">{net.impressions}</td>
                  <td className="py-3 font-bold text-accent-cyan">{net.avgEngagement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
