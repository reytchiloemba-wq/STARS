import { resolveTenant } from '@/lib/tenant';
import BriefingsClient from './briefings-client';

export default async function BriefingsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  await resolveTenant(org);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Briefings Exécutifs Stratégiques</h1>
        <p className="text-sm text-muted-foreground">
          Synthèses décisionnelles automatisées : faits essentiels, risques, opportunités et axes de communication recommandés.
        </p>
      </div>

      <BriefingsClient org={org} />
    </div>
  );
}
