import { describe, it, expect } from 'vitest';
import { PLANS, CREDIT_PACKS } from '@/config/pricing';

describe('FinOps Unit Economics & Target Gross Margin (> 70%)', () => {
  // Conservative estimate of technical costs per SIC:
  // - Make operation: ~0.009 €
  // - AI prompt/completion tokens (Claude 3.5 Sonnet / GPT-4o blend): ~0.018 €
  // - Real-time web search / scraping: ~0.006 €
  // Total technical cost per SIC = 0.033 € HT (worst case scenario)
  const MAX_TECHNICAL_COST_PER_SIC_EUR = 0.033;
  const MIN_TARGET_GROSS_MARGIN = 0.70; // 70% minimum target

  it('guarantees gross margin strictly above 70% across all self-serve paid tiers', () => {
    const paidPlans = PLANS.filter((p) => !p.isCustomPricing && p.monthlyPriceCents && p.monthlyPriceCents > 0);

    for (const plan of paidPlans) {
      const monthlyRevenueEur = (plan.monthlyPriceCents ?? 0) / 100;
      const maxSicMonthly = plan.quotas.creditsPerMonth;
      const maxMonthlyCostEur = maxSicMonthly * MAX_TECHNICAL_COST_PER_SIC_EUR;

      const grossProfitEur = monthlyRevenueEur - maxMonthlyCostEur;
      const grossMargin = grossProfitEur / monthlyRevenueEur;

      expect(grossMargin).toBeGreaterThan(MIN_TARGET_GROSS_MARGIN);
    }
  });

  it('guarantees gross margin strictly above 70% across all SIC Credit Packs', () => {
    for (const pack of CREDIT_PACKS) {
      const packRevenueEur = pack.priceCents / 100;
      const maxPackCostEur = pack.credits * MAX_TECHNICAL_COST_PER_SIC_EUR;

      const grossProfitEur = packRevenueEur - maxPackCostEur;
      const grossMargin = grossProfitEur / packRevenueEur;

      expect(grossMargin).toBeGreaterThan(MIN_TARGET_GROSS_MARGIN);
    }
  });

  it('maintains positive profitability even with the 30% Founders discount applied', () => {
    const discountedPlans = PLANS.filter((p) => ['creator', 'professional', 'business'].includes(p.key));

    for (const plan of discountedPlans) {
      const fullRevenueEur = (plan.monthlyPriceCents ?? 0) / 100;
      const discountedRevenueEur = fullRevenueEur * 0.70; // -30%
      const maxMonthlyCostEur = plan.quotas.creditsPerMonth * MAX_TECHNICAL_COST_PER_SIC_EUR;

      const grossProfitEur = discountedRevenueEur - maxMonthlyCostEur;
      const grossMargin = grossProfitEur / discountedRevenueEur;

      // Even with 30% off, gross margin must comfortably exceed 65%
      expect(grossMargin).toBeGreaterThan(0.65);
    }
  });
});
