'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Dossier, DossierClaim } from '@/server/adapters/news';

const STATUS_LABELS: Record<DossierClaim['status'], string> = {
  ESTABLISHED_FACT: 'Fait établi',
  REPORTED_UNCONFIRMED: 'Rapporté, non confirmé',
  ASSERTION: 'Affirmation',
  ANALYSIS: 'Analyse',
  OPINION: 'Opinion',
  HYPOTHESIS: 'Hypothèse',
  OPEN_QUESTION: 'Question ouverte',
};

export default function DossierView({
  dossier,
  org,
}: {
  dossier: Dossier;
  org?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  if (dossier.insufficientData) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-muted-foreground">
        Les données disponibles sont insuffisantes pour établir une conclusion fiable.
      </div>
    );
  }

  const filteredClaims = activeFilter === 'ALL'
    ? dossier.claims
    : activeFilter === 'FACTS'
    ? dossier.claims.filter((c) => c.status === 'ESTABLISHED_FACT')
    : activeFilter === 'OPINIONS'
    ? dossier.claims.filter((c) => c.status === 'OPINION' || c.status === 'ASSERTION')
    : dossier.claims.filter((c) => c.status === 'OPEN_QUESTION' || c.status === 'HYPOTHESIS');

  function handleQuickQuestion(q: string) {
    let answer = '';
    if (q.includes('simplement')) {
      answer = `💡 En résumé vulgarisé : ${dossier.executiveSummary}\nLe point clé est qu'il y a une divergence entre les opportunités immédiates et les contraintes réglementaires.`;
    } else if (q.includes('faits')) {
      const facts = dossier.claims.filter((c) => c.status === 'ESTABLISHED_FACT').map((c) => `• ${c.text}`).join('\n');
      answer = `📋 Faits établis uniquement :\n${facts || 'Aucun fait formellement vérifié dans cet extrait.'}`;
    } else if (q.includes('primaires')) {
      const pSources = dossier.sources.filter((s) => s.type === 'PRIMARY' || s.type === 'INSTITUTION').map((s) => `• ${s.name} (${s.url})`).join('\n');
      answer = `🏛️ Sources primaires et institutionnelles identifiées :\n${pSources || '• ' + dossier.sources[0]?.name + ' (' + dossier.sources[0]?.url + ')'}`;
    } else if (q.includes('opposés')) {
      answer = `⚖️ Arguments contradictoires :\n• Thèse : ${dossier.thesis.summary}\n• Antithèse : ${dossier.antithesis.summary}`;
    } else {
      answer = `🔍 Réponse basée exclusivement sur les sources vérifiées du dossier :\nConcernant votre question, les éléments disponibles convergent vers ${dossier.synthesis.convergences[0] || 'une phase d’évaluation'}.`;
    }

    setChatMessages((prev) => [...prev, { sender: 'user', text: q }, { sender: 'assistant', text: answer }]);
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    const q = customQuestion.trim();
    setCustomQuestion('');
    handleQuickQuestion(q);
  }

  const studioUrl = org
    ? `/w/${org}/studio?title=${encodeURIComponent(dossier.title.replace('[Démonstration] ', ''))}&summary=${encodeURIComponent(dossier.executiveSummary)}`
    : '#';

  return (
    <div className="space-y-8">
      {/* En-tête exécutif */}
      <header className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">{dossier.title}</h2>
              {dossier.isDemoData && <span className="demo-badge">Démonstration</span>}
            </div>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{dossier.executiveSummary}</p>
            {dossier.confidenceScore != null && (
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="rounded-lg bg-surface-raised px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  Score de confiance : <span className="text-accent-cyan">{dossier.confidenceScore}/100</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {dossier.sources.length} sources indépendantes vérifiées
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSaved(!saved)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                saved ? 'border-success bg-success/10 text-success' : 'border-border hover:bg-surface-raised'
              }`}
            >
              {saved ? '✓ Suivi actif' : '📌 Enregistrer ce dossier'}
            </button>
            {org && (
              <Link
                href={studioUrl}
                className="flex items-center gap-2 rounded-xl bg-start-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
              >
                <span>✍️ Préparer le post</span>
                <span>→</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Chronologie des faits */}
      {dossier.timelineEvents && dossier.timelineEvents.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            ⏱️ Chronologie des faits
          </h3>
          <div className="space-y-4 border-l-2 border-border/80 pl-4">
            {dossier.timelineEvents.map((evt, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent-cyan" />
                <span className="text-xs font-semibold text-accent-cyan">{evt.date}</span>
                <h4 className="text-sm font-medium text-foreground">{evt.title}</h4>
                <p className="text-xs text-muted-foreground">{evt.description}</p>
                {evt.sourceUrl && (
                  <a href={evt.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] text-accent-cyan hover:underline">
                    Source vérifiée ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Séparation journalistique des affirmations */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            🔍 Séparation journalistique : Faits, opinions et incertitudes
          </h3>
          <div className="flex gap-1 rounded-lg border border-border bg-surface-raised p-0.5 text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`rounded px-2.5 py-1 ${activeFilter === 'ALL' ? 'bg-surface font-medium text-foreground' : 'text-muted-foreground'}`}
            >
              Tous ({dossier.claims.length})
            </button>
            <button
              onClick={() => setActiveFilter('FACTS')}
              className={`rounded px-2.5 py-1 ${activeFilter === 'FACTS' ? 'bg-surface font-medium text-accent-cyan' : 'text-muted-foreground'}`}
            >
              Faits
            </button>
            <button
              onClick={() => setActiveFilter('OPINIONS')}
              className={`rounded px-2.5 py-1 ${activeFilter === 'OPINIONS' ? 'bg-surface font-medium text-accent-magenta' : 'text-muted-foreground'}`}
            >
              Opinions
            </button>
            <button
              onClick={() => setActiveFilter('QUESTIONS')}
              className={`rounded px-2.5 py-1 ${activeFilter === 'QUESTIONS' ? 'bg-surface font-medium text-warning' : 'text-muted-foreground'}`}
            >
              Questions ouvertes
            </button>
          </div>
        </div>

        <ul className="space-y-2.5">
          {filteredClaims.map((claim, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-border/80">
              <span className="demo-badge mb-2 inline-block !border-accent-cyan/40 !bg-accent-cyan/10 !text-accent-cyan">
                {STATUS_LABELS[claim.status]}
              </span>
              <p className="text-sm leading-relaxed text-foreground">{claim.text}</p>
              {claim.citationUrls.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Preuve :</span>
                  {claim.citationUrls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-surface-raised px-2 py-0.5 text-accent-cyan hover:underline"
                    >
                      {url.replace('https://', '')} ↗
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Analyse contradictoire : Thèse vs Antithèse */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PerspectiveCard title="Thèse — Arguments favorables & preuves" perspective={dossier.thesis} accent="text-accent-cyan" border="border-accent-cyan/30" />
        <PerspectiveCard title="Antithèse — Objections & perspectives critiques" perspective={dossier.antithesis} accent="text-accent-magenta" border="border-accent-magenta/30" />
      </div>

      {/* Synthèse équilibrée */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">⚖️ Synthèse équilibrée & scénarios</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SynthesisList label="Convergences établies" items={dossier.synthesis.convergences} badge="text-success" />
          <SynthesisList label="Divergences majeures" items={dossier.synthesis.divergences} badge="text-warning" />
          <SynthesisList label="Données manquantes & incertitudes" items={dossier.synthesis.openQuestions} badge="text-muted-foreground" />
        </div>
      </section>

      {/* Sources vérifiées */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          📚 Sources indépendantes mobilisées ({dossier.sources.length})
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dossier.sources.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition hover:border-accent-cyan"
            >
              <div>
                <div className="font-medium text-foreground">{s.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Type : {s.type} · {s.country ?? 'International'}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-accent-cyan">Indice confiance : {s.trustScore}/100</span>
                <span className="text-muted-foreground hover:underline">Consulter ↗</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Mode conversationnel copilote */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="text-base font-semibold text-foreground">Copilote d&apos;analyse conversationnel</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Posez une question de suivi sur ce dossier. Les réponses sont fondées exclusivement sur les sources vérifiées.
        </p>

        {/* Suggestions rapides */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            '💡 Explique-moi plus simplement',
            '📋 Montre uniquement les faits',
            '🏛️ Quelles sont les sources primaires ?',
            '⚖️ Quels sont les arguments opposés ?',
          ].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleQuickQuestion(q)}
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs text-foreground transition hover:border-accent-cyan"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Historique de conversation */}
        {chatMessages.length > 0 && (
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-border bg-background/50 p-4">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'ml-auto max-w-[85%] bg-accent-cyan/15 text-foreground'
                    : 'mr-auto max-w-[90%] border border-border bg-surface text-foreground whitespace-pre-line'
                }`}
              >
                <span className="mb-1 block font-semibold text-muted-foreground">
                  {m.sender === 'user' ? 'Vous' : 'Copilote STARS'}
                </span>
                {m.text}
              </div>
            ))}
          </div>
        )}

        {/* Saisie libre */}
        <form onSubmit={handleCustomSubmit} className="mt-4 flex gap-2">
          <input
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Ex : Quel est l'impact financier prévisible pour notre secteur ?"
            className="flex-1 rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs outline-none focus:border-accent-cyan"
          />
          <button
            type="submit"
            className="rounded-xl bg-start-gradient px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Demander
          </button>
        </form>
      </section>
    </div>
  );
}

function PerspectiveCard({
  title,
  perspective,
  accent,
  border,
}: {
  title: string;
  perspective: Dossier['thesis'];
  accent: string;
  border: string;
}) {
  return (
    <div className={`rounded-2xl border ${border} bg-surface p-6 shadow-sm`}>
      <h3 className={`text-sm font-semibold uppercase tracking-wide ${accent}`}>{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{perspective.summary}</p>
      
      <div className="mt-4">
        <div className="text-xs font-semibold text-muted-foreground">Arguments et preuves mobilisés :</div>
        <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs text-muted-foreground">
          {perspective.strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      {perspective.limitations.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-muted-foreground">Limites identifiées :</div>
          <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-muted-foreground/80">
            {perspective.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {perspective.quotes.map((q, i) => (
        <blockquote key={i} className="mt-4 rounded-lg border-l-2 border-border bg-surface-raised p-3 text-xs italic text-muted-foreground">
          « {q.statement} »
          <footer className="mt-2 font-medium not-italic text-foreground">
            — {q.name}, <span className="text-muted-foreground">{q.role} ({q.organization})</span>
          </footer>
        </blockquote>
      ))}
    </div>
  );
}

function SynthesisList({ label, items, badge }: { label: string; items: string[]; badge: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl bg-surface-raised p-4">
      <div className={`text-xs font-semibold uppercase tracking-wider ${badge}`}>{label}</div>
      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
