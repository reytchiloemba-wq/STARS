'use client';

import { useState, useTransition } from 'react';
import { ingestSourceAction, ingestArticleUrlAction, ingestAllMonitoredSourcesAction } from './actions';

interface SourceItem {
  id: string;
  name: string;
  url: string;
  country: string | null;
  language: string | null;
  type: string;
  transparencyLevel: number;
  correctionsPolicyUrl: string | null;
  lastVerifiedAt: string | null;
  articlesCount: number;
  rating: number;
}

export default function SourcesClient({
  orgSlug,
  sources,
}: {
  orgSlug: string;
  sources: SourceItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function handleIngestSource(sourceId: string) {
    setActiveSourceId(sourceId);
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await ingestSourceAction(orgSlug, sourceId);
        setFeedback({ message: res.message, type: 'success' });
      } catch (err) {
        setFeedback({ message: (err as Error).message, type: 'error' });
      } finally {
        setActiveSourceId(null);
      }
    });
  }

  function handleIngestUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        const res = await ingestArticleUrlAction(orgSlug, urlInput.trim());
        setFeedback({ message: res.message, type: 'success' });
        setUrlInput('');
      } catch (err) {
        setFeedback({ message: (err as Error).message, type: 'error' });
      }
    });
  }

  function handleBatchIngest() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await ingestAllMonitoredSourcesAction(orgSlug);
        setFeedback({ message: res.message, type: 'success' });
      } catch (err) {
        setFeedback({ message: (err as Error).message, type: 'error' });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Barre d'actions rapides Firecrawl */}
      <div className="rounded-2xl border border-accent-cyan/30 bg-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <h2 className="text-sm font-bold text-foreground">Moteur d&apos;Ingestion Web Firecrawl</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Extrayez en temps réel le contenu d&apos;articles ou déclenchez la veille automatique sur vos sources.
            </p>
          </div>
          <button
            onClick={handleBatchIngest}
            disabled={isPending}
            className="rounded-lg bg-accent-cyan/15 border border-accent-cyan/40 px-3 py-1.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/25 transition disabled:opacity-50"
          >
            {isPending && !activeSourceId ? 'Ingestion globale en cours…' : 'Ingérer toutes les sources (Batch)'}
          </button>
        </div>

        {/* Ingestion ciblée par URL */}
        <form onSubmit={handleIngestUrl} className="flex gap-2">
          <input
            type="url"
            placeholder="Collez l'URL d'un article à ingérer (ex: https://lemonde.fr/...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent-cyan focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending || !urlInput.trim()}
            className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/90 transition disabled:opacity-50"
          >
            {isPending && urlInput ? 'Extraction…' : 'Ingérer l’URL'}
          </button>
        </form>

        {feedback && (
          <div
            className={`rounded-lg px-3 py-2 text-xs ${
              feedback.type === 'success'
                ? 'border border-success/30 bg-success/10 text-success'
                : 'border border-danger/30 bg-danger/10 text-danger'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Grille des sources */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((s) => (
          <div
            key={s.id}
            className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4 transition hover:border-border/80"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{s.name}</h3>
                  <div className="text-xs text-muted-foreground">
                    {s.country ?? 'International'} · {s.language?.toUpperCase() ?? 'FR'}
                  </div>
                </div>
                <span className="rounded-full bg-accent-cyan/10 px-2 py-0.5 text-xs font-bold text-accent-cyan">
                  {s.rating}/100
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                <span className="rounded bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-foreground">
                  Type : {s.type}
                </span>
                <span className="rounded bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground">
                  Transparence : {s.transparencyLevel}%
                </span>
                {s.articlesCount > 0 && (
                  <span className="rounded bg-accent-cyan/10 px-2 py-0.5 text-[10px] font-semibold text-accent-cyan">
                    {s.articlesCount} article(s)
                  </span>
                )}
              </div>

              {s.correctionsPolicyUrl && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Charte éditoriale :{' '}
                  <a href={s.correctionsPolicyUrl} target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">
                    Politique vérifiée ↗
                  </a>
                </div>
              )}

              {s.lastVerifiedAt && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Dernière ingestion : {new Date(s.lastVerifiedAt).toLocaleString('fr-FR')}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 flex items-center justify-between text-xs">
              <button
                onClick={() => handleIngestSource(s.id)}
                disabled={isPending}
                className="font-medium text-accent-cyan hover:underline disabled:opacity-50"
              >
                {isPending && activeSourceId === s.id ? 'Ingestion Firecrawl…' : 'Actualiser le flux ⚡'}
              </button>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                Visiter ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
