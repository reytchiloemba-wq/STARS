import { db } from '@/lib/db';
import { FOUNDERS_PROMO } from '@/config/pricing';

const FOUNDERS_KEY = 'founders';

export interface PromoCampaignView {
  enabled: boolean;
  badge: string;
  discountPercent: number;
  durationMonths: number;
  eligiblePlans: string[];
  maxRedemptions: number | null;
  redemptionsUsed: number;
  remainingRedemptions: number | null;
  expiresAt: string | null;
  isExpired: boolean;
}

function toView(row: {
  enabled: boolean;
  badge: string;
  discountPercent: number;
  durationMonths: number;
  eligiblePlans: string[];
  maxRedemptions: number | null;
  redemptionsUsed: number;
  expiresAt: Date | null;
}): PromoCampaignView {
  const isExpired = row.expiresAt ? row.expiresAt.getTime() < Date.now() : false;
  const remainingRedemptions =
    row.maxRedemptions !== null ? Math.max(0, row.maxRedemptions - row.redemptionsUsed) : null;

  return {
    enabled: row.enabled && !isExpired && (remainingRedemptions === null || remainingRedemptions > 0),
    badge: row.badge,
    discountPercent: row.discountPercent,
    durationMonths: row.durationMonths,
    eligiblePlans: row.eligiblePlans,
    maxRedemptions: row.maxRedemptions,
    redemptionsUsed: row.redemptionsUsed,
    remainingRedemptions,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    isExpired,
  };
}

/**
 * Reads the administrable Founders promo, seeding it from the historical
 * hardcoded config on first call so existing behavior doesn't change until a
 * Super Admin actually edits it. Any real cap (`maxRedemptions`/`expiresAt`)
 * is enforced here — the landing page never invents a countdown on its own.
 */
export async function getFoundersPromo(): Promise<PromoCampaignView> {
  const row = await db.promoCampaign.upsert({
    where: { key: FOUNDERS_KEY },
    update: {},
    create: {
      key: FOUNDERS_KEY,
      enabled: FOUNDERS_PROMO.enabled,
      badge: FOUNDERS_PROMO.badge,
      discountPercent: FOUNDERS_PROMO.discountPercent,
      durationMonths: FOUNDERS_PROMO.durationMonths,
      eligiblePlans: FOUNDERS_PROMO.eligiblePlans,
    },
  });

  return toView(row);
}

export async function updateFoundersPromo(data: {
  enabled: boolean;
  badge: string;
  discountPercent: number;
  durationMonths: number;
  eligiblePlans: string[];
  maxRedemptions: number | null;
  expiresAt: Date | null;
}): Promise<PromoCampaignView> {
  const row = await db.promoCampaign.upsert({
    where: { key: FOUNDERS_KEY },
    update: data,
    create: { key: FOUNDERS_KEY, ...data },
  });

  return toView(row);
}

/**
 * Called only from the real checkout path once a subscription genuinely
 * applies the Founders discount — never from the landing page — so
 * `redemptionsUsed` stays a true count, not a display estimate.
 */
export async function recordFoundersRedemption(): Promise<void> {
  await db.promoCampaign.updateMany({
    where: { key: FOUNDERS_KEY },
    data: { redemptionsUsed: { increment: 1 } },
  });
}
