'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PLANS,
  FOUNDERS_PROMO,
  CREDIT_COSTS,
  CREDIT_PACKS,
  formatPriceCents,
  ANNUAL_MONTHS_FREE,
  VAT_NOTE,
  type PlanKey,
} from '@/config/pricing';

export default function LandingPricing() {
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [seatsByPlan, setSeatsByPlan] = useState<Record<PlanKey, number>>({
    discovery: 1,
    creator: 1,
    professional: 3,
    business: 10,
    enterprise: 1,
  });

  // Interactive SIC simulator state
  const [expressCount, setExpressCount] = useState(10);
  const [deepCount, setDeepCount] = useState(5);
  const [strategicCount, setStrategicCount] = useState(2);
  const [imagesCount, setImagesCount] = useState(8);

  const simulatedSicTotal =
    expressCount * CREDIT_COSTS.ANALYSIS_EXPRESS +
    deepCount * CREDIT_COSTS.ANALYSIS_DEEP +
    strategicCount * CREDIT_COSTS.ANALYSIS_STRATEGIC +
    imagesCount * CREDIT_COSTS.AI_ILLUSTRATION;

  const recommendedPlan =
    simulatedSicTotal <= 10
      ? 'discovery'
      : simulatedSicTotal <= 100
        ? 'creator'
        : simulatedSicTotal <= 350
          ? 'professional'
          : simulatedSicTotal <= 1200
            ? 'business'
            : 'enterprise';

  return (
    <section id="tarifs" className="relative mx-auto max-w-7xl px-6 py-24 sm:px-8">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-violet/10 blur-[120px]" />

      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-accent-cyan">
          Tarification &amp; Valeur
        </span>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Une intelligence éditoriale adaptée à votre ambition.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base leading-relaxed">
          Commencez gratuitement. Évoluez à mesure que votre veille, votre audience et votre équipe grandissent.
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

      {/* 5 Plans Grid */}
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
                      Le plus populaire
                    </span>
                  )}
                  {foundersEligible && (
                    <span className="demo-badge text-[10px]">{FOUNDERS_PROMO.badge}</span>
                  )}
                </div>

                <h3 className="mt-3 font-display text-lg font-bold text-white">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{plan.tagline}</p>

                {/* Price Display */}
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
                  {cycle === 'ANNUAL' && plan.annualPriceCents !== null && plan.annualPriceCents > 0 && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Facturé annuellement {formatPriceCents(plan.annualPriceCents)} HT
                    </p>
                  )}
                </div>

                {/* Additional Seats Selector */}
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

                {/* Features */}
                <ul className="mt-6 space-y-2.5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
                  {plan.features.slice(0, 8).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-accent-cyan font-bold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
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

      {/* SIC Educational Banner */}
      <div className="mt-20 rounded-3xl border border-border/80 bg-gradient-to-br from-surface to-surface-raised p-8 shadow-xl sm:p-10">
        <div className="max-w-3xl">
          <span className="rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-1 text-[11px] font-bold text-accent-cyan">
            Unité Commerciale Simplifiée
          </span>
          <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
            Comprendre les STARS Intelligence Credits (SIC)
          </h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Un <strong>STARS Intelligence Credit (SIC)</strong> regroupe les ressources nécessaires à la recherche, l’analyse et la création. Vous maîtrisez votre consommation sans gérer les coûts techniques de plusieurs fournisseurs d&apos;intelligence artificielle ou de moteurs de données.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5 text-xs">
          <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5">
            <div className="font-bold text-white">Analyse express</div>
            <div className="mt-1 text-accent-cyan font-mono font-bold">1 SIC</div>
            <div className="text-[10px] text-muted-foreground">Synthèse rapide</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5">
            <div className="font-bold text-white">Analyse approfondie</div>
            <div className="mt-1 text-accent-cyan font-mono font-bold">3 SIC</div>
            <div className="text-[10px] text-muted-foreground">Faits &amp; thèses</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5">
            <div className="font-bold text-white">Analyse stratégique</div>
            <div className="mt-1 text-accent-cyan font-mono font-bold">6 SIC</div>
            <div className="text-[10px] text-muted-foreground">Signaux faibles &amp; radar</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5">
            <div className="font-bold text-white">Illustration IA</div>
            <div className="mt-1 text-accent-cyan font-mono font-bold">2 SIC</div>
            <div className="text-[10px] text-muted-foreground">Formats 16:9, 1:1, 4:5</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface/80 p-3.5">
            <div className="font-bold text-white">Rapport exécutif</div>
            <div className="mt-1 text-accent-cyan font-mono font-bold">5 SIC</div>
            <div className="text-[10px] text-muted-foreground">Export PDF certifié</div>
          </div>
        </div>

        {/* Interactive SIC Simulator */}
        <div className="mt-10 rounded-2xl border border-border/60 bg-surface-raised p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white">Calculateur de Consommation Mensuelle</h4>
              <p className="text-xs text-muted-foreground">Estimez vos besoins et découvrez le forfait le plus économique pour votre équipe.</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Consommation estimée : </span>
              <span className="font-display text-xl font-black text-accent-cyan">{simulatedSicTotal} SIC/mois</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground">Analyses express : <strong className="text-white">{expressCount}</strong></label>
              <input
                type="range"
                min="0"
                max="50"
                value={expressCount}
                onChange={(e) => setExpressCount(Number(e.target.value))}
                className="mt-2 w-full accent-accent-cyan"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Analyses approfondies : <strong className="text-white">{deepCount}</strong></label>
              <input
                type="range"
                min="0"
                max="30"
                value={deepCount}
                onChange={(e) => setDeepCount(Number(e.target.value))}
                className="mt-2 w-full accent-accent-cyan"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Analyses stratégiques : <strong className="text-white">{strategicCount}</strong></label>
              <input
                type="range"
                min="0"
                max="20"
                value={strategicCount}
                onChange={(e) => setStrategicCount(Number(e.target.value))}
                className="mt-2 w-full accent-accent-cyan"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Illustrations IA : <strong className="text-white">{imagesCount}</strong></label>
              <input
                type="range"
                min="0"
                max="50"
                value={imagesCount}
                onChange={(e) => setImagesCount(Number(e.target.value))}
                className="mt-2 w-full accent-accent-cyan"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 p-4 text-xs">
            <span className="text-white">
              Forfait recommandé pour votre profil : <strong className="uppercase text-accent-cyan">{recommendedPlan}</strong>
            </span>
            <Link
              href="/register"
              className="rounded-lg bg-start-gradient px-4 py-2 font-bold text-white shadow hover:scale-[1.02] transition-transform"
            >
              Choisir {recommendedPlan} →
            </Link>
          </div>
        </div>
      </div>

      {/* Credit Packs Section */}
      <div className="mt-16 text-center">
        <h3 className="text-lg font-bold text-white">Besoin de crédits supplémentaires ?</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Packs rechargeables sans engagement, valables 12 mois et consommés après votre quota mensuel inclus.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.credits} className="rounded-xl border border-border bg-surface px-5 py-3 text-xs">
              <div className="font-bold text-white">{pack.credits} SIC</div>
              <div className="mt-0.5 text-accent-cyan font-mono font-bold">{formatPriceCents(pack.priceCents)} HT</div>
            </div>
          ))}
          <div className="rounded-xl border border-border bg-surface px-5 py-3 text-xs">
            <div className="font-bold text-white">Volumes supérieurs</div>
            <div className="mt-0.5 text-muted-foreground">Sur devis</div>
          </div>
        </div>
      </div>
    </section>
  );
}
