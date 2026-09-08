'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANS, FOUNDERS_PROMO, formatPriceCents, ANNUAL_MONTHS_FREE, VAT_NOTE, type PlanKey } from '@/config/pricing';

export default function LandingPricing() {
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [seatsByPlan, setSeatsByPlan] = useState<Record<PlanKey, number>>({
    discovery: 1,
    creator: 1,
    professional: 3,
    business: 10,
    enterprise: 1,
  });

  return (
    <section id="tarifs" className="relative mx-auto max-w-7xl px-6 py-24 sm:px-8">
      {/* Ambient background blur */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-violet/10 blur-[120px]" />

      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-cyan">
          Tarification Transparente
        </span>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Une intelligence éditoriale adaptée à votre ambition.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Commencez gratuitement sans engagement. Évoluez au rythme de vos thématiques, de vos publications et de vos équipes.
        </p>
      </div>

      {/* Switcher Mensuel / Annuel */}
      <div className="mt-10 flex items-center justify-center gap-4">
        <span className={`text-xs font-semibold ${cycle === 'MONTHLY' ? 'text-white' : 'text-muted-foreground'}`}>
          Facturation mensuelle
        </span>
        <button
          type="button"
          onClick={() => setCycle(cycle === 'MONTHLY' ? 'ANNUAL' : 'MONTHLY')}
          className="relative flex h-8 w-16 items-center rounded-full border border-border/80 bg-surface-raised p-1 transition-colors hover:border-accent-cyan"
          aria-label="Basculer facturation mensuelle / annuelle"
        >
          <span
            className={`h-6 w-6 rounded-full bg-start-gradient shadow-md transition-all duration-300 ${
              cycle === 'ANNUAL' ? 'translate-x-8' : 'translate-x-0'
            }`}
          />
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${cycle === 'ANNUAL' ? 'text-white' : 'text-muted-foreground'}`}>
            Facturation annuelle
          </span>
          <span className="rounded-full border border-success/40 bg-success/15 px-2.5 py-0.5 text-[10px] font-extrabold text-success shadow-sm">
            {ANNUAL_MONTHS_FREE} mois offerts
          </span>
        </div>
      </div>

      {/* Grille des plans */}
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        {PLANS.map((plan) => {
          const isPopular = plan.highlight === 'most-popular';
          const price = cycle === 'ANNUAL' ? plan.annualPriceCents : plan.monthlyPriceCents;
          const foundersEligible = FOUNDERS_PROMO.enabled && FOUNDERS_PROMO.eligiblePlans.includes(plan.key);
          const seats = seatsByPlan[plan.key];
          const extraSeats = Math.max(0, seats - plan.quotas.seatsIncluded);
          const extraSeatsCost =
            plan.quotas.extraSeatMonthlyCents && cycle === 'MONTHLY' ? extraSeats * plan.quotas.extraSeatMonthlyCents : 0;
          const totalCents = price !== null ? price + extraSeatsCost : null;

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-300 ${
                isPopular
                  ? 'border-2 border-accent-cyan/80 bg-surface-raised/95 shadow-xl shadow-accent-cyan/15 ring-1 ring-accent-cyan/40 scale-[1.03] z-10'
                  : 'glass-card hover:border-accent-cyan/30'
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {isPopular && (
                    <span className="rounded-full bg-start-gradient px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                      Recommandé
                    </span>
                  )}
                  {foundersEligible && (
                    <span className="demo-badge text-[10px]">{FOUNDERS_PROMO.badge}</span>
                  )}
                </div>

                <h3 className="mt-3 font-display text-lg font-bold text-white">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{plan.tagline}</p>

                {/* Prix */}
                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="flex items-baseline gap-1">
                    {plan.isCustomPricing ? (
                      <>
                        <span className="text-xs font-medium text-muted-foreground">À partir de </span>
                        <span className="font-display text-2xl font-black text-white">{formatPriceCents(plan.monthlyPriceCents)}</span>
                        <span className="text-xs text-muted-foreground">/mois HT</span>
                      </>
                    ) : (
                      <>
                        <span className="font-display text-2xl font-black text-white">{formatPriceCents(totalCents)}</span>
                        {totalCents !== null && totalCents > 0 && (
                          <span className="text-xs text-muted-foreground">/mois HT</span>
                        )}
                      </>
                    )}
                  </div>
                  {foundersEligible && totalCents !== null && totalCents > 0 && (
                    <p className="mt-1 text-[11px] font-medium text-success">
                      -{FOUNDERS_PROMO.discountPercent}% pdt {FOUNDERS_PROMO.durationMonths} mois
                    </p>
                  )}
                </div>

                {/* Sélecteur de sièges additionnels */}
                {plan.quotas.extraSeatMonthlyCents !== null && plan.quotas.seatsIncluded > 0 && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 bg-surface/50 px-2.5 py-1.5 text-xs">
                    <span className="text-muted-foreground">Sièges :</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSeatsByPlan((s) => ({ ...s, [plan.key]: Math.max(plan.quotas.seatsIncluded, s[plan.key] - 1) }))}
                        className="flex h-5 w-5 items-center justify-center rounded border border-border text-xs hover:border-accent-cyan"
                      >
                        −
                      </button>
                      <span className="font-bold text-foreground">{seats}</span>
                      <button
                        type="button"
                        onClick={() => setSeatsByPlan((s) => ({ ...s, [plan.key]: s[plan.key] + 1 }))}
                        className="flex h-5 w-5 items-center justify-center rounded border border-border text-xs hover:border-accent-cyan"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Liste des fonctionnalités */}
                <ul className="mt-6 space-y-2.5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
                  {plan.features.slice(0, 7).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-accent-cyan font-bold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bouton CTA */}
              <Link
                href={plan.key === 'enterprise' ? '/contact-sales' : '/register'}
                className={`mt-8 block rounded-xl py-2.5 text-center text-xs font-bold transition-all duration-300 ${
                  isPopular
                    ? 'bg-start-gradient text-white shadow-md shadow-accent-blue/20 hover:scale-[1.02] hover:shadow-glow-cyan'
                    : 'border border-border/80 bg-surface-raised/60 text-foreground hover:border-accent-cyan hover:bg-surface-raised'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">{VAT_NOTE}</p>
    </section>
  );
}
