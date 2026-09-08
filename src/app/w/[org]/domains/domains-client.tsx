'use client';

import { useState, useTransition } from 'react';
import type { Category, OrganizationDomain } from '@prisma/client';
import { toggleFollowDomainAction, updateDomainFiltersAction } from './actions';
import Link from 'next/link';

export default function DomainsClient({
  org,
  categories,
  followedDomains: initialFollowed,
}: {
  org: string;
  categories: Category[];
  followedDomains: OrganizationDomain[];
}) {
  const [followed, setFollowed] = useState<OrganizationDomain[]>(initialFollowed);
  const [editingDomain, setEditingDomain] = useState<Category | null>(null);
  const [keywords, setKeywords] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [territories, setTerritories] = useState('');
  const [isPending, startTransition] = useTransition();

  const followedCategoryIds = new Set(followed.map((f) => f.categoryId));

  function handleToggle(cat: Category) {
    const isNowFollowed = !followedCategoryIds.has(cat.id);
    startTransition(async () => {
      const res = await toggleFollowDomainAction(org, cat.id, isNowFollowed);
      if (res.ok) {
        if (isNowFollowed) {
          setFollowed([
            ...followed,
            {
              id: `tmp-${Date.now()}`,
              organizationId: 'current',
              categoryId: cat.id,
              keywords: [],
              exclusions: [],
              territories: [],
              languages: [],
              createdAt: new Date(),
            },
          ]);
        } else {
          setFollowed(followed.filter((f) => f.categoryId !== cat.id));
        }
      }
    });
  }

  function openEditModal(cat: Category) {
    const match = followed.find((f) => f.categoryId === cat.id);
    setEditingDomain(cat);
    setKeywords(match?.keywords?.join(', ') || '');
    setExclusions(match?.exclusions?.join(', ') || '');
    setTerritories(match?.territories?.join(', ') || '');
  }

  function handleSaveFilters(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDomain) return;
    startTransition(async () => {
      const kwList = keywords.split(',').map((s) => s.trim()).filter(Boolean);
      const exList = exclusions.split(',').map((s) => s.trim()).filter(Boolean);
      const terList = territories.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await updateDomainFiltersAction(org, editingDomain.id, {
        keywords: kwList,
        exclusions: exList,
        territories: terList,
      });

      if (res.ok) {
        setFollowed((prev) =>
          prev.map((f) =>
            f.categoryId === editingDomain.id
              ? { ...f, keywords: kwList, exclusions: exList, territories: terList }
              : f,
          ),
        );
        setEditingDomain(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-xs">
        <span className="text-muted-foreground">
          {followed.length} domaine(s) actif(s) sur {categories.length} disponibles dans la taxonomie globale.
        </span>
        <Link href={`/w/${org}/explore`} className="font-semibold text-accent-cyan hover:underline">
          Accéder à STARS Explore →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const isF = followedCategoryIds.has(cat.id);
          const domainConfig = followed.find((f) => f.categoryId === cat.id);
          return (
            <div
              key={cat.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition ${
                isF ? 'border-accent-cyan/40 bg-surface' : 'border-border bg-surface-raised opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-bold text-foreground">{cat.label}</h3>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggle(cat)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      isF
                        ? 'bg-accent-cyan/15 text-accent-cyan'
                        : 'border border-border bg-surface text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isF ? '✓ Suivi' : '+ Suivre'}
                  </button>
                </div>

                {isF && domainConfig && (
                  <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                    {domainConfig.keywords.length > 0 && (
                      <p className="line-clamp-1">
                        <span className="font-semibold text-foreground">Mots-clés :</span> {domainConfig.keywords.join(', ')}
                      </p>
                    )}
                    {domainConfig.exclusions.length > 0 && (
                      <p className="line-clamp-1 text-danger/80">
                        <span className="font-semibold text-danger">Exclusions :</span> {domainConfig.exclusions.join(', ')}
                      </p>
                    )}
                    {domainConfig.territories.length > 0 && (
                      <p className="line-clamp-1">
                        <span className="font-semibold text-foreground">Territoires :</span> {domainConfig.territories.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isF && (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="text-muted-foreground hover:text-accent-cyan"
                  >
                    ⚙️ Filtres avancés
                  </button>
                  <Link
                    href={`/w/${org}/explore/${cat.key}`}
                    className="font-semibold text-accent-cyan hover:underline"
                  >
                    Explorer →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal filtres de domaine */}
      {editingDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Filtres personnalisés — {editingDomain.label}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Affinez la sélection des actualités pour ce domaine spécifique au sein de votre organisation.
            </p>

            <form onSubmit={handleSaveFilters} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Mots-clés prioritaires (séparés par virgules)</label>
                <input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Ex : souveraineté, brevets, puces"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Exclusions (séparées par virgules)</label>
                <input
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  placeholder="Ex : rumeur, people, insolite"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Territoires surveillés (séparés par virgules)</label>
                <input
                  value={territories}
                  onChange={(e) => setTerritories(e.target.value)}
                  placeholder="Ex : France, Union Européenne, Afrique de l'Ouest"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDomain(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-surface-raised"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-start-gradient px-5 py-2 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement…' : 'Appliquer les filtres'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
