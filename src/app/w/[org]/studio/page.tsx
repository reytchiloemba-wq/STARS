import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import StudioClient from './studio-client';

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ title?: string; summary?: string; draftId?: string }>;
}) {
  const { org } = await params;
  const { title, summary, draftId } = await searchParams;
  const ctx = await resolveTenant(org);

  const [brandVoices, socialAccounts, initialDraft] = await Promise.all([
    db.brandVoice.findMany({
      where: { organizationId: ctx.organization.id, isActive: true },
    }),
    db.socialAccount.findMany({
      where: { organizationId: ctx.organization.id },
    }),
    draftId
      ? db.draft.findFirst({
          where: { id: draftId, organizationId: ctx.organization.id },
          include: { versions: { orderBy: { createdAt: 'desc' }, take: 5 } },
        })
      : null,
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Studio Éditorial STARS</h1>
          <p className="text-sm text-muted-foreground">
            Transformez votre analyse en une prise de parole percutante, adaptée à votre audience et à chaque réseau.
          </p>
        </div>
        <a
          href={`/w/${org}/drafts`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent-cyan hover:underline"
        >
          📂 Voir tous mes brouillons & approbations →
        </a>
      </div>

      <StudioClient
        org={org}
        brandVoices={brandVoices}
        socialAccounts={socialAccounts}
        initialDraft={initialDraft}
        initialTitle={title}
        initialSummary={summary}
      />
    </div>
  );
}
