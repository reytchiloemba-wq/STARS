'use client';

import { useState } from 'react';
import { PLANS, formatPriceCents, ANNUAL_MONTHS_FREE, type PlanKey } from '@/config/pricing';
import { checkoutPlanAction } from '@/app/w/[org]/settings/billing/actions';

export default function BillingPlans({ org, currentPlanKey }: { org: string; currentPlanKey: PlanKey }) {
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const boundAction = checkoutPlanAction.bind(null, org);

  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <span className={cycle === 'MONTHLY' ? 'font-medium' : 'text-muted-foreground'}>Mensuel</span>
        <button
          type="button"
          onClick={() => setCycle(cycle === 'MONTHLY' ? 'ANNUAL' : 'MONTHLY')}
          className="relative h-7 w-14 rounded-full bg-surface-raised transition"
          aria-label="Basculer facturation mensuelle / annuelle"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-start-gradient transition-all ${
              cycle === 'ANNUAL' ? 'left-8' : 'left-1'
            }`}
          />
        </button>
        <span className={cycle === 'ANNUAL' ? 'font-medium' : 'text-muted-foreground'}>
          Annuel <span className="demo-badge !border-success/40 !bg-success/10 !text-success">{ANNUAL_MONTHS_FREE} mois offerts</span>
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlanKey;
          const price = cycle === 'ANNUAL' ? plan.annualPriceCents : plan.monthlyPriceCents;
          const canCheckout = !plan.isCustomPricing && price !== null && price > 0;

          return (
            <div
              key={plan.key}
              className={`flex flex-col rounded-2xl border p-5 ${
                plan.highlight === 'most-popular' ? 'border-accent-cyan bg-surface-raised' : 'border-border bg-surface'
              }`}
            >
              {plan.highlight === 'most-popular' && (
                <span className="mb-2 self-start rounded-full bg-start-gradient px-2 py-0.5 text-xs font-medium text-white">
                  Le plus populaire
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
              <p className="mt-3 text-2xl font-bold">
                {plan.isCustomPricing ? (
                  <>
                    <span className="text-sm font-normal text-muted-foreground">À partir de </span>
                    {formatPriceCents(plan.monthlyPriceCents)}
                    <span className="text-sm font-normal text-muted-foreground">/mois</span>
                  </>
                ) : (
                  <>
                    {formatPriceCents(price)}
                    {price !== null && price > 0 && <span className="text-sm font-normal text-muted-foreground">/mois</span>}
                  </>
                )}
              </p>
              {plan.isCustomPricing && <p className="text-xs text-muted-foreground">Sur devis</p>}

              {isCurrent ? (
                <span className="mt-4 rounded-lg border border-accent-cyan px-3 py-2 text-center text-sm font-medium text-accent-cyan">
                  Plan actuel
                </span>
              ) : canCheckout ? (
                <form action={boundAction} className="mt-4">
                  <input type="hidden" name="planKey" value={plan.key} />
                  <input type="hidden" name="billingCycle" value={cycle} />
                  <button type="submit" className="w-full rounded-lg bg-start-gradient px-3 py-2 text-sm font-medium text-white">
                    {plan.cta}
                  </button>
                </form>
              ) : (
                <a
                  href="/register?enterprise=1"
                  className="mt-4 block rounded-lg border border-border px-3 py-2 text-center text-sm font-medium hover:border-accent-cyan"
                >
                  {plan.cta}
                </a>
              )}

              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {plan.features.slice(0, 6).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
