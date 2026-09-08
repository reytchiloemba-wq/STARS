import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import CalendarClient from './calendar-client';

export default async function CalendarPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const [schedules, publications, drafts] = await Promise.all([
    db.schedule.findMany({
      where: { organizationId: ctx.organization.id },
      include: {
        publication: {
          include: {
            draft: true,
            targets: { include: { socialAccount: true } },
          },
        },
      },
      orderBy: { runAt: 'asc' },
    }),
    db.publication.findMany({
      where: { organizationId: ctx.organization.id, status: 'PUBLISHED' },
      include: {
        draft: true,
        targets: { include: { socialAccount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.draft.findMany({
      where: { organizationId: ctx.organization.id, status: { in: ['APPROVED', 'DRAFT'] } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendrier Éditorial</h1>
          <p className="text-sm text-muted-foreground">
            Visualisez et planifiez vos diffusions sur LinkedIn, Instagram, X et Facebook.
          </p>
        </div>
        <a
          href={`/w/${org}/studio`}
          className="rounded-xl bg-start-gradient px-4 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90"
        >
          + Programmer un post
        </a>
      </div>

      <CalendarClient org={org} schedules={schedules} publications={publications} drafts={drafts} />
    </div>
  );
}
