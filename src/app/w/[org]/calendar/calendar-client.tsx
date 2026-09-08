'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Schedule, Publication, Draft, PublicationTarget, SocialAccount, SocialNetwork } from '@prisma/client';

type EnrichedSchedule = Schedule & {
  publication: Publication & {
    draft: Draft;
    targets: (PublicationTarget & { socialAccount: SocialAccount })[];
  };
};

type EnrichedPublication = Publication & {
  draft: Draft;
  targets: (PublicationTarget & { socialAccount: SocialAccount })[];
};

export default function CalendarClient({
  org,
  schedules,
  publications,
  drafts,
}: {
  org: string;
  schedules: EnrichedSchedule[];
  publications: EnrichedPublication[];
  drafts: Draft[];
}) {
  const [filterNetwork, setFilterNetwork] = useState<string>('ALL');

  const filteredSchedules = filterNetwork === 'ALL'
    ? schedules
    : schedules.filter((s) => s.publication.draft.network === filterNetwork);

  const filteredPublications = filterNetwork === 'ALL'
    ? publications
    : publications.filter((p) => p.draft.network === filterNetwork);

  return (
    <div className="space-y-8">
      {/* Filtres par réseau */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Filtrer par réseau :</span>
          <div className="flex gap-1">
            {['ALL', 'LINKEDIN', 'X', 'INSTAGRAM', 'FACEBOOK'].map((net) => (
              <button
                key={net}
                type="button"
                onClick={() => setFilterNetwork(net)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filterNetwork === net
                    ? 'bg-start-gradient text-white'
                    : 'border border-border bg-surface-raised text-muted-foreground hover:text-foreground'
                }`}
              >
                {net === 'ALL' ? 'Tous les réseaux' : net}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          {schedules.length} publication(s) programmée(s) · {publications.length} diffusée(s)
        </span>
      </div>

      {/* Publications à venir / Programmées */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-bold text-foreground">📅 Publications programmées</h2>
        {filteredSchedules.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Aucune publication programmée pour le moment. Utilisez le Studio Éditorial pour planifier votre prochaine prise de parole.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredSchedules.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-raised p-4 transition hover:border-accent-cyan sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-accent-cyan/15 px-2 py-0.5 text-xs font-bold text-accent-cyan">
                      {s.publication.draft.network}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      ⏰ Prévu le {new Date(s.runAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {s.publication.draft.currentContent}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/w/${org}/studio?draftId=${s.publication.draft.id}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface"
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Publications récentes publiées */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-bold text-foreground">🚀 Récemment diffusées</h2>
        {filteredPublications.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Aucune diffusion historique enregistrée.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredPublications.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface-raised p-4 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                      ✓ Publié sur {p.draft.network}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      le {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{p.draft.currentContent}</p>
                </div>
                <Link
                  href={`/w/${org}/publications`}
                  className="text-xs font-medium text-accent-cyan hover:underline"
                >
                  Voir dans le journal →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Brouillons prêts à planifier */}
      {drafts.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground">💡 Contenus prêts à être planifiés</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {drafts.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-surface-raised p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-bold text-accent-cyan">
                    {d.network}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{d.status}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{d.currentContent}</p>
                <Link
                  href={`/w/${org}/studio?draftId=${d.id}`}
                  className="mt-3 inline-block text-xs font-semibold text-accent-cyan hover:underline"
                >
                  Planifier dans le studio →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
