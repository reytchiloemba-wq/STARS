import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import Link from 'next/link';

export default async function PublicationsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const publications = await db.publication.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: 'desc' },
    include: {
      draft: true,
      targets: { include: { socialAccount: true } },
      schedule: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal des Publications</h1>
          <p className="text-sm text-muted-foreground">
            Suivi en temps réel de l’état d’envoi de vos contenus vers LinkedIn, Instagram, X et Facebook.
          </p>
        </div>
        <Link
          href={`/w/${org}/studio`}
          className="rounded-xl bg-start-gradient px-4 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90"
        >
          + Nouvelle publication
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-base font-semibold text-foreground">Historique d&apos;envois & Statuts d&apos;API</h2>
          <span className="text-xs text-muted-foreground">{publications.length} opération(s) enregistrée(s)</span>
        </div>

        {publications.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Aucune publication envoyée pour le moment.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {publications.map((p) => {
              const isSuccess = p.status === 'PUBLISHED';
              const isScheduled = p.status === 'SCHEDULED';
              const isFailed = p.status === 'FAILED';
              return (
                <div key={p.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-surface-raised px-2 py-0.5 text-xs font-bold text-accent-cyan">
                          {p.draft.network}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isSuccess
                              ? 'bg-success/15 text-success'
                              : isScheduled
                              ? 'bg-accent-violet/15 text-accent-violet'
                              : isFailed
                              ? 'bg-danger/15 text-danger'
                              : 'bg-warning/15 text-warning'
                          }`}
                        >
                          {p.status}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          Clé d&apos;idempotence : {p.idempotencyKey.slice(0, 18)}...
                        </span>
                      </div>

                      <p className="line-clamp-1 text-xs text-foreground">{p.draft.currentContent}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Créé le {new Date(p.createdAt).toLocaleString('fr-FR')}</span>
                        {p.targets.map((t) => (
                          <span
                            key={t.id}
                            className={`rounded px-1.5 py-0.5 ${t.status === 'FAILED' ? 'bg-danger/10 text-danger' : 'bg-surface-raised'}`}
                            title={t.errorMessage ?? undefined}
                          >
                            {t.socialAccount.displayName} :{' '}
                            {t.status === 'PUBLISHED'
                              ? `Post ID ${t.externalPostId}`
                              : t.status === 'FAILED'
                              ? `Échec — ${t.errorMessage ?? 'raison inconnue'}`
                              : t.status}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/w/${org}/studio?draftId=${p.draft.id}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-raised"
                      >
                        Voir le post
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
