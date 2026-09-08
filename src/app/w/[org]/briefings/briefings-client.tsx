'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { generateBriefingAction } from './actions';
import type { ExecutiveBriefingContent } from '@/server/services/radar.service';

export default function BriefingsClient({ org }: { org: string }) {
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [briefing, setBriefing] = useState<ExecutiveBriefingContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateBriefingAction(org, period);
      if (res.ok && res.briefing) {
        setBriefing(res.briefing);
      } else {
        setError(res.error || 'Erreur lors de la génération');
      }
    });
  }

  function handleCopy() {
    if (!briefing) return;
    const text = `${briefing.title}\n\n${briefing.executiveSummary}\n\nFaits clés :\n${briefing.keyFacts
      .map((f) => `• ${f.fact} (Impact : ${f.whyItMatters})`)
      .join('\n')}\n\nRecommandations :\n${briefing.recommendedActions.join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Contrôle de génération */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Générer un nouveau briefing</h2>
              <span className="demo-badge">Démonstration</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Aucun pipeline de veille réel n&apos;est encore connecté — ceci génère un exemple illustratif du format,
              pour 2 STARS Credits (le coût réel du mécanisme, même en démonstration).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
              className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-medium outline-none focus:border-accent-cyan"
            >
              <option value="DAILY">Quotidien (dernières 24h)</option>
              <option value="WEEKLY">Hebdomadaire (7 derniers jours)</option>
              <option value="MONTHLY">Stratégique (30 derniers jours)</option>
            </select>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              className="rounded-xl bg-start-gradient px-5 py-2 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Synthèse en cours…' : 'Générer le briefing (2 crédits)'}
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{error}</p>}
      </div>

      {/* Affichage du Briefing */}
      {briefing ? (
        <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
            <div>
              <span className="rounded bg-accent-cyan/15 px-2 py-0.5 text-xs font-bold text-accent-cyan">
                {briefing.period}
              </span>
              <h3 className="mt-1 text-xl font-bold text-foreground">{briefing.title}</h3>
              <div className="text-xs text-muted-foreground">
                Généré le {new Date(briefing.generatedAt).toLocaleString('fr-FR')} · Sources certifiées
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-surface-raised"
            >
              {copied ? '✓ Copié !' : '📋 Copier le briefing'}
            </button>
          </div>

          {/* Synthèse générale */}
          <div className="rounded-xl bg-surface-raised p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Synthèse de direction</h4>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{briefing.executiveSummary}</p>
          </div>

          {/* Faits essentiels */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              1. Faits essentiels & Raisons de leur importance
            </h4>
            <div className="space-y-3">
              {briefing.keyFacts.map((f, i) => (
                <div key={i} className="rounded-xl border border-border p-4 space-y-1">
                  <div className="text-sm font-semibold text-foreground">{f.fact}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Pourquoi ce sujet compte :</span> {f.whyItMatters}
                  </div>
                  <div className="text-[11px] text-accent-cyan">Source : {f.source}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risques vs Opportunités */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-danger">⚠️ Risques identifiés</h4>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs text-foreground">
                {briefing.strategicRisks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-success/20 bg-success/5 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-success">✨ Opportunités stratégiques</h4>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs text-foreground">
                {briefing.opportunities.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Décisions & Prises de parole */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-border pt-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                📋 Décisions à envisager
              </h4>
              <ul className="list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                {briefing.recommendedActions.map((act, i) => (
                  <li key={i} className="text-foreground">{act}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                🎙️ Sujets sur lesquels communiquer
              </h4>
              <div className="space-y-2">
                {briefing.suggestedCommunications.map((comm, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-surface-raised p-2 text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{comm.topic}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{comm.recommendedAngle}</div>
                    </div>
                    <Link
                      href={`/w/${org}/studio?title=${encodeURIComponent(comm.topic)}&summary=${encodeURIComponent(comm.recommendedAngle)}`}
                      className="text-xs font-bold text-accent-cyan hover:underline shrink-0 ml-2"
                    >
                      Post →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center text-xs text-muted-foreground">
          Sélectionnez une périodicité ci-dessus pour lancer la génération de votre briefing exécutif personnalisé.
        </div>
      )}
    </div>
  );
}
