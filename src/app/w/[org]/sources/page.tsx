import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import SourcesClient from './sources-client';

export default async function SourcesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  // Sources publiques mutualisées + sources privées du tenant avec comptage d'articles
  let sources = await db.source.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId: ctx.organization.id }],
    },
    include: {
      ratings: { orderBy: { computedAt: 'desc' }, take: 1 },
      _count: { select: { articles: true } },
    },
    orderBy: { transparencyLevel: 'desc' },
  });

  if (sources.length === 0) {
    // Initial fallback if table is empty
    const defaultSources = [
      {
        organizationId: null,
        name: 'Agence France-Presse (AFP)',
        url: 'https://afp.com',
        country: 'France',
        language: 'fr',
        type: 'WIRE_AGENCY' as const,
        transparencyLevel: 95,
        correctionsPolicyUrl: 'https://afp.com/fr/agence/standards-editoriaux',
        status: 'ACTIVE' as const,
      },
      {
        organizationId: null,
        name: 'Commission Européenne — Portail Officiel',
        url: 'https://ec.europa.eu',
        country: 'Union Européenne',
        language: 'fr',
        type: 'INSTITUTION' as const,
        transparencyLevel: 98,
        correctionsPolicyUrl: 'https://ec.europa.eu/legal-notice_fr',
        status: 'ACTIVE' as const,
      },
      {
        organizationId: null,
        name: 'Financial Times',
        url: 'https://ft.com',
        country: 'Royaume-Uni',
        language: 'en',
        type: 'REFERENCE_MEDIA' as const,
        transparencyLevel: 90,
        correctionsPolicyUrl: 'https://ft.com/editorial-code',
        status: 'ACTIVE' as const,
      },
      {
        organizationId: null,
        name: 'Nature Communications',
        url: 'https://nature.com',
        country: 'International',
        language: 'en',
        type: 'SCIENTIFIC_STUDY' as const,
        transparencyLevel: 96,
        correctionsPolicyUrl: 'https://nature.com/nature-portfolio/editorial-policies',
        status: 'ACTIVE' as const,
      },
    ];

    for (const ds of defaultSources) {
      await db.source.create({ data: ds }).catch(() => {});
    }

    sources = await db.source.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId: ctx.organization.id }],
      },
      include: {
        ratings: { orderBy: { computedAt: 'desc' }, take: 1 },
        _count: { select: { articles: true } },
      },
      orderBy: { transparencyLevel: 'desc' },
    });
  }

  const clientSources = sources.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    country: s.country,
    language: s.language,
    type: s.type,
    transparencyLevel: s.transparencyLevel,
    correctionsPolicyUrl: s.correctionsPolicyUrl,
    lastVerifiedAt: s.lastVerifiedAt?.toISOString() ?? null,
    articlesCount: s._count?.articles ?? 0,
    rating: s.ratings[0]?.score ?? s.transparencyLevel,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gouvernance des Sources & Ingestion</h1>
        <p className="text-sm text-muted-foreground">
          Surveillance, audit de transparence et extraction automatisée d&apos;articles via le moteur Firecrawl.
        </p>
      </div>

      <SourcesClient orgSlug={org} sources={clientSources} />
    </div>
  );
}
