import { describe, it, expect } from 'vitest';
import { PLANS, CREDIT_COSTS, CREDIT_PACKS, FOUNDERS_PROMO, ANNUAL_MONTHS_FREE, getPlan } from '@/config/pricing';

describe('pricing config — single source of truth invariants', () => {
  it('has exactly the five documented plans, in order', () => {
    expect(PLANS.map((p) => p.key)).toEqual(['discovery', 'creator', 'professional', 'business', 'enterprise']);
  });

  it('prices annual plans at exactly 10x monthly (2 months free) wherever both are fixed prices', () => {
    for (const plan of PLANS) {
      if (plan.monthlyPriceCents !== null && plan.annualPriceCents !== null && plan.monthlyPriceCents > 0) {
        expect(plan.annualPriceCents).toBe(plan.monthlyPriceCents * (12 - ANNUAL_MONTHS_FREE));
      }
    }
  });

  it('marks exactly one plan as most-popular (Professional)', () => {
    const highlighted = PLANS.filter((p) => p.highlight === 'most-popular');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]?.key).toBe('professional');
  });

  it('never advertises a fixed self-serve price for Enterprise (it is qualification-gated)', () => {
    const enterprise = getPlan('enterprise');
    expect(enterprise.isCustomPricing).toBe(true);
  });

  it('gives every non-custom plan a non-negative credits allowance', () => {
    for (const plan of PLANS) {
      if (!plan.isCustomPricing) {
        expect(plan.quotas.creditsPerMonth).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("sizes Discovery's credit pool to exactly cover its advertised free allowance (3 express + 1 deep + 2 illustrations)", () => {
    const discovery = getPlan('discovery');
    const expected = 3 * CREDIT_COSTS.ANALYSIS_EXPRESS + 1 * CREDIT_COSTS.ANALYSIS_DEEP + 2 * CREDIT_COSTS.AI_ILLUSTRATION;
    expect(discovery.quotas.creditsPerMonth).toBe(expected);
  });

  it('throws for an unknown plan key', () => {
    // @ts-expect-error deliberately invalid key
    expect(() => getPlan('not-a-plan')).toThrow(/Unknown plan key/);
  });

  it('gives every credit cost a positive value', () => {
    for (const cost of Object.values(CREDIT_COSTS)) {
      expect(cost).toBeGreaterThan(0);
    }
  });

  it('orders credit packs from smallest to largest with a strictly increasing price', () => {
    for (let i = 1; i < CREDIT_PACKS.length; i++) {
      expect(CREDIT_PACKS[i]!.credits).toBeGreaterThan(CREDIT_PACKS[i - 1]!.credits);
      expect(CREDIT_PACKS[i]!.priceCents).toBeGreaterThan(CREDIT_PACKS[i - 1]!.priceCents);
    }
  });

  it('only offers the Founders promo on plans that actually exist', () => {
    const planKeys = new Set(PLANS.map((p) => p.key));
    for (const key of FOUNDERS_PROMO.eligiblePlans) {
      expect(planKeys.has(key)).toBe(true);
    }
  });
});
