'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { runSearchAction } from '@/app/w/[org]/direct/actions';
import type { Dossier } from '@/server/adapters/news';
import DossierView from '@/components/dossier-view';
import { CREDIT_COSTS } from '@/config/pricing';

type Depth = 'EXPRESS' | 'DEEP' | 'STRATEGIC';

const DEPTH_OPTIONS: { value: Depth; label: string; cost: number }[] = [
  { value: 'EXPRESS', label: 'Analyse express', cost: CREDIT_COSTS.ANALYSIS_EXPRESS },
  { value: 'DEEP', label: 'Analyse approfondie', cost: CREDIT_COSTS.ANALYSIS_DEEP },
  { value: 'STRATEGIC', label: 'Analyse stratégique', cost: CREDIT_COSTS.ANALYSIS_STRATEGIC },
];

export default function DirectSearchForm({ org, initialQuery }: { org: string; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [depth, setDepth] = useState<Depth>('EXPRESS');
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState<{ balance: number; required: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCost = DEPTH_OPTIONS.find((o) => o.value === depth)!.cost;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setInsufficientCredits(null);
    startTransition(async () => {
      const result = await runSearchAction(org, query.trim(), depth);
      if (result.ok && result.dossier) {
        setDossier(result.dossier);
        setCreditsRemaining(result.creditsRemaining ?? null);
      } else if (result.error?.code === 'INSUFFICIENT_CREDITS') {
        setInsufficientCredits({ balance: result.error.balance, required: result.error.required });
      } else {
        setError(result.error && 'message' in result.error ? result.error.message : 'Une erreur est survenue.');
      }
    });
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Saisissez un sujet, une question, une URL, une entreprise…"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent-cyan"
        />
        <select
          value={depth}
          onChange={(e) => setDepth(e.target.value as Depth)}
          className="rounded-xl border border-border bg-surface px-3 py-3 text-sm"
        >
          {DEPTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} · {o.cost} crédit{o.cost > 1 ? 's' : ''}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-start-gradient px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Analyse en cours…' : `Analyser (${selectedCost} crédit${selectedCost > 1 ? 's' : ''})`}
        </button>
      </form>

      {creditsRemaining !== null && (
        <p className="mt-2 text-xs text-muted-foreground">Crédits STARS restants : {creditsRemaining}</p>
      )}

      {insufficientCredits && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <p className="text-warning">
            Crédits insuffisants : {insufficientCredits.balance} disponible(s), {insufficientCredits.required} requis pour cette
            analyse.
          </p>
          <div className="mt-2 flex gap-3">
            <Link href={`/w/${org}/settings/billing`} className="font-medium text-accent-cyan hover:underline">
              Passer à un forfait supérieur
            </Link>
            <Link href={`/w/${org}/settings/billing#credits`} className="font-medium text-accent-cyan hover:underline">
              Acheter des crédits
            </Link>
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {dossier && (
        <div className="mt-8">
          <DossierView dossier={dossier} org={org} />
        </div>
      )}
    </div>
  );
}
