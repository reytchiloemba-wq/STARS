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
    <div className="space-y-6">
      {/* En-tête exécutif du Studio */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-cyan shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-pulse"></span>
              STARS AI Studio
            </span>
            <span className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              Workspace : <strong className="text-foreground">{ctx.organization.name}</strong>
            </span>
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">
              {socialAccounts.filter(a => a.status === 'ACTIVE').length} canal(aux) actif(s)
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
            Studio Éditorial & Diffusion
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Concevez, affinez et diffusez des prises de parole à fort impact, calibrées pour chaque réseau et conformes à votre charte.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/w/${org}/calendar`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised/80 px-3.5 py-2 text-xs font-semibold text-muted-foreground shadow-sm transition hover:border-border/80 hover:text-white"
          >
            <span>📅</span>
            <span>Calendrier</span>
          </a>
          <a
            href={`/w/${org}/drafts`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent-cyan/40 bg-accent-cyan/10 px-3.5 py-2 text-xs font-semibold text-accent-cyan shadow-sm transition hover:bg-accent-cyan/20"
          >
            <span>📂</span>
            <span>Brouillons & Archives</span>
          </a>
        </div>
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
