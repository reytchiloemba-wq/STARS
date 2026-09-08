import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import BrandVoiceClient from './brand-voice-client';

export default async function BrandVoicePage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const brandVoices = await db.brandVoice.findMany({
    where: { organizationId: ctx.organization.id },
    include: { brand: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Brand Voice Studio</h1>
        <p className="text-sm text-muted-foreground">
          Définissez la mémoire éditoriale de vos marques : valeurs, ton, vocabulaire de prédilection, termes proscrits et signatures.
        </p>
      </div>

      <BrandVoiceClient org={org} brandVoices={brandVoices} />
    </div>
  );
}
