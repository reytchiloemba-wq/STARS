import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import DomainsClient from './domains-client';

export default async function DomainsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const [categories, followedDomains] = await Promise.all([
    db.category.findMany({ orderBy: { label: 'asc' } }),
    db.organizationDomain.findMany({ where: { organizationId: ctx.organization.id } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Taxonomie des Domaines Suivis</h1>
        <p className="text-sm text-muted-foreground">
          Sélectionnez les domaines d&apos;activité prioritaires pour votre veille et affinez vos mots-clés, exclusions et territoires.
        </p>
      </div>

      <DomainsClient org={org} categories={categories} followedDomains={followedDomains} />
    </div>
  );
}
