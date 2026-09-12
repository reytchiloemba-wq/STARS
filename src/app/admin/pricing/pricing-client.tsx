'use client';

import { useState, useTransition } from 'react';
import type { PromoCampaignView } from '@/server/services/promo.service';
import { updateFoundersPromoAction } from './actions';

export default function PricingClient({
  promo,
  eligiblePlanKeys,
}: {
  promo: PromoCampaignView;
  eligiblePlanKeys: Array<{ key: string; name: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<string[]>(promo.eligiblePlans);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateFoundersPromoAction(formData);
      setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-6 rounded-2xl border border-border/80 bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-white">Programme Fondateurs</h2>
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <input type="checkbox" name="enabled" defaultChecked={promo.enabled} className="h-4 w-4 accent-accent-cyan" />
          Actif sur la landing page
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Libellé du badge</label>
          <input
            name="badge"
            defaultValue={promo.badge}
            className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Réduction (%)</label>
          <input
            type="number"
            name="discountPercent"
            min={0}
            max={100}
            defaultValue={promo.discountPercent}
            className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Durée (mois)</label>
          <input
            type="number"
            name="durationMonths"
            min={1}
            defaultValue={promo.durationMonths}
            className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Places limitées (vide = illimité)</label>
          <input
            type="number"
            name="maxRedemptions"
            min={0}
            defaultValue={promo.maxRedemptions ?? ''}
            className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Utilisées à ce jour : <strong className="text-foreground">{promo.redemptionsUsed}</strong> (compteur réel, jamais affiché s&apos;il n&apos;y a pas de plafond)
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Date d&apos;expiration (vide = pas de date limite)</label>
        <input
          type="date"
          name="expiresAt"
          defaultValue={promo.expiresAt ? promo.expiresAt.slice(0, 10) : ''}
          className="mt-1 w-full max-w-xs rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Offres éligibles</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {eligiblePlanKeys.map((plan) => (
            <label key={plan.key} className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs text-foreground">
              <input
                type="checkbox"
                name="eligiblePlans"
                value={plan.key}
                checked={selectedPlans.includes(plan.key)}
                onChange={(e) =>
                  setSelectedPlans((prev) =>
                    e.target.checked ? [...prev, plan.key] : prev.filter((k) => k !== plan.key),
                  )
                }
                className="h-3.5 w-3.5 accent-accent-cyan"
              />
              {plan.name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-start-gradient px-4 py-2 text-xs font-bold text-white shadow hover:scale-[1.02] transition-transform disabled:opacity-60"
        >
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && !isPending && <span className="text-xs font-semibold text-success">Enregistré ✓</span>}
      </div>
    </form>
  );
}
