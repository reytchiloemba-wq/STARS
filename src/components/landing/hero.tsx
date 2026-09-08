'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STEPS = [
  { label: 'Sujet détecté', content: '« Révolution des modèles d’IA & impact sur l’emploi qualifié »', badge: 'Radar Mondial' },
  { label: 'Fact-checking', content: '14 sources certifiées · 6 pays · 2 études académiques', badge: 'OSINT' },
  { label: 'Thèse', content: 'Gains de productivité record (+38%) et émergence de nouveaux métiers à haute valeur ajoutée.', badge: 'Analyse' },
  { label: 'Antithèse', content: 'Tension sur les transitions professionnelles et nécessité d’un cadre d’audit éthique.', badge: 'Contradictoire' },
  { label: 'Studio Brand Voice', content: '5 variantes générées avec le ton exécutif de votre marque.', badge: 'IA Éditoriale' },
  { label: 'Canaux connectés', content: 'LinkedIn (★), X/Twitter, Instagram Pro & Facebook Pages prêts.', badge: 'Multi-réseaux' },
  { label: 'Statut de validation', content: '✓ Revue humaine validée · Prêt à publier ou programmer', badge: 'Gouvernance' },
];

const TRUSTED_SOURCES = [
  'Le Monde',
  'Reuters',
  'Financial Times',
  'Agence France-Presse',
  'Bloomberg',
  'Les Échos',
  'TechCrunch',
  'Nature',
];

export default function LandingHero() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="top" className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-start-gradient opacity-15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 -z-10 h-[400px] w-[500px] rounded-full bg-accent-cyan/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-[400px] w-[500px] rounded-full bg-accent-magenta/10 blur-[100px]" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Colonne de gauche : Titre & Propositions de valeur */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3.5 py-1 text-xs font-semibold text-accent-cyan shadow-sm backdrop-blur-md">
              <span className="h-2 w-2 animate-ping rounded-full bg-accent-cyan" />
              <span>STARS 2.0 — Intelligence Éditoriale Mondiale</span>
            </div>

            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl sm:leading-[1.12]">
              De l&apos;actualité mondiale à une prise de parole{' '}
              <span className="bg-start-gradient bg-clip-text text-transparent">
                qui fait autorité.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg sm:leading-relaxed">
              STARS surveille les sources mondiales, confronte rigoureusement les faits et les points de vue contradictoires, applique votre identité éditoriale et diffuse des analyses d&apos;impact sur LinkedIn, Instagram, Facebook et X.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-start-gradient px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent-blue/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-glow-cyan"
              >
                <span>Démarrer l&apos;essai gratuit 14 jours</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>

              <a
                href="#parcours"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-surface/60 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur-md transition hover:border-accent-cyan hover:bg-surface"
              >
                <span>Explorer les fonctionnalités</span>
              </a>
            </div>

            {/* Micro-preuves de réassurance */}
            <div className="mt-6 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-success">✓</span>
                <span>Sans carte bancaire</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-success">✓</span>
                <span>Validation humaine obligatoire</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-success">✓</span>
                <span>Conforme RGPD & Fact-checking OSINT</span>
              </div>
            </div>
          </div>

          {/* Colonne de droite : Carte interactive Glassmorphism */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-white/[0.12] bg-surface/80 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-accent-cyan/40 hover:shadow-glow-cyan">
              {/* Header fenêtre macOS stylisée */}
              <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-danger/80" />
                  <span className="h-3 w-3 rounded-full bg-warning/80" />
                  <span className="h-3 w-3 rounded-full bg-success/80" />
                  <span className="ml-2 font-mono text-[11px] font-semibold text-muted-foreground">
                    pipeline.stars.ai
                  </span>
                </div>
                <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                  En direct
                </span>
              </div>

              {/* Étapes du pipeline avec transition */}
              <div className="mt-4 space-y-2.5" aria-live="polite">
                {STEPS.map((s, i) => {
                  const isActive = i === step;
                  return (
                    <div
                      key={s.label}
                      className={`rounded-xl border p-3 transition-all duration-500 ${
                        isActive
                          ? 'border-accent-cyan/60 bg-surface-raised/90 shadow-md shadow-accent-cyan/10 scale-[1.01]'
                          : 'border-border/40 bg-surface/40 opacity-45'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold uppercase tracking-wider text-muted-foreground">
                          {s.label}
                        </span>
                        <span className="rounded bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-accent-cyan">
                          {s.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-foreground">
                        {s.content}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Barre de progression des étapes */}
              <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      i === step ? 'bg-start-gradient' : 'bg-surface-raised hover:bg-border'
                    }`}
                    aria-label={`Étape ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bandeau de sources de référence */}
        <div className="mt-20 border-t border-white/[0.08] pt-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Sources mondiales analysées, recoupées et certifiées en continu
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {TRUSTED_SOURCES.map((source) => (
              <span
                key={source}
                className="font-display text-sm font-bold tracking-wider text-muted-foreground/70 transition hover:text-foreground"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
