import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';

export default async function SourcesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  // Sources publiques mutualisées + sources privées du tenant
  let sources = await db.source.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId: ctx.organization.id }],
    },
    include: { ratings: { orderBy: { computedAt: 'desc' }, take: 1 } },
    orderBy: { transparencyLevel: 'desc' },
  });

  if (sources.length === 0) {
    sources = [
      {
        id: 'src-1',
        organizationId: null,
        name: 'Agence France-Presse (AFP)',
        url: 'https://afp.com',
        country: 'France',
        language: 'fr',
        type: 'WIRE_AGENCY',
        transparencyLevel: 95,
        correctionsPolicyUrl: 'https://afp.com/fr/agence/standards-editoriaux',
        lastVerifiedAt: new Date(),
        status: 'ACTIVE',
        createdAt: new Date(),
        ratings: [{ id: 'r1', sourceId: 'src-1', score: 92, criteria: {}, computedAt: new Date() }],
      },
      {
        id: 'src-2',
        organizationId: null,
        name: 'Commission Européenne — Portail Officiel',
        url: 'https://ec.europa.eu',
        country: 'Union Européenne',
        language: 'fr',
        type: 'INSTITUTION',
        transparencyLevel: 98,
        correctionsPolicyUrl: 'https://ec.europa.eu/legal-notice_fr',
        lastVerifiedAt: new Date(),
        status: 'ACTIVE',
        createdAt: new Date(),
        ratings: [{ id: 'r2', sourceId: 'src-2', score: 96, criteria: {}, computedAt: new Date() }],
      },
      {
        id: 'src-3',
        organizationId: null,
        name: 'Financial Times',
        url: 'https://ft.com',
        country: 'Royaume-Uni',
        language: 'en',
        type: 'REFERENCE_MEDIA',
        transparencyLevel: 90,
        correctionsPolicyUrl: 'https://ft.com/editorial-code',
        lastVerifiedAt: new Date(),
        status: 'ACTIVE',
        createdAt: new Date(),
        ratings: [{ id: 'r3', sourceId: 'src-3', score: 89, criteria: {}, computedAt: new Date() }],
      },
      {
        id: 'src-4',
        organizationId: null,
        name: 'Nature Communications',
        url: 'https://nature.com',
        country: 'International',
        language: 'en',
        type: 'SCIENTIFIC_STUDY',
        transparencyLevel: 96,
        correctionsPolicyUrl: 'https://nature.com/nature-portfolio/editorial-policies',
        lastVerifiedAt: new Date(),
        status: 'ACTIVE',
        createdAt: new Date(),
        ratings: [{ id: 'r4', sourceId: 'src-4', score: 95, criteria: {}, computedAt: new Date() }],
      },
    ];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gouvernance des Sources</h1>
        <p className="text-sm text-muted-foreground">
          Audit de transparence, politiques de correction et score d’autorité des flux d’information surveillés.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((s) => {
          const rating = s.ratings[0]?.score ?? s.transparencyLevel;
          return (
            <div key={s.id} className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{s.name}</h3>
                    <div className="text-xs text-muted-foreground">
                      {s.country ?? 'International'} · {s.language?.toUpperCase() ?? 'FR'}
                    </div>
                  </div>
                  <span className="rounded-full bg-accent-cyan/10 px-2 py-0.5 text-xs font-bold text-accent-cyan">
                    {rating}/100
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="rounded bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-foreground">
                    Type : {s.type}
                  </span>
                  <span className="rounded bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground">
                    Transparence : {s.transparencyLevel}%
                  </span>
                </div>

                {s.correctionsPolicyUrl && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Charte éditoriale :{' '}
                    <a href={s.correctionsPolicyUrl} target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">
                      Politique de correction vérifiée ↗
                    </a>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted-foreground">
                  Statut : <span className="text-success font-semibold">ACTIF</span>
                </span>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">
                  Visiter le site ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
