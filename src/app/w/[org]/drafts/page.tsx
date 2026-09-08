import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import DraftsClient from './drafts-client';

export default async function DraftsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const drafts = await db.draft.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      brandVoice: true,
      versions: { orderBy: { createdAt: 'desc' }, take: 5 },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
      approvals: { orderBy: { decidedAt: 'desc' } },
      mediaAssets: true,
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brouillons & Bibliothèque Éditoriale</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos contenus en cours de rédaction, l’historique des versions et le circuit de validation d’équipe.
          </p>
        </div>
        <a
          href={`/w/${org}/studio`}
          className="rounded-xl bg-start-gradient px-4 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90"
        >
          + Nouveau post dans le Studio
        </a>
      </div>

      <DraftsClient org={org} drafts={drafts} userRole={ctx.membership.role} />
    </div>
  );
}
