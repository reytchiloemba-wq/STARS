'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/super-admin';
import { updateFoundersPromo } from '@/server/services/promo.service';
import { PLANS } from '@/config/pricing';

const ELIGIBLE_KEYS = new Set(PLANS.map((p) => p.key));

export async function updateFoundersPromoAction(formData: FormData) {
  await requireSuperAdmin();

  const enabled = formData.get('enabled') === 'on';
  const badge = String(formData.get('badge') ?? 'Programme Fondateurs').trim();
  const discountPercent = Math.min(100, Math.max(0, Number(formData.get('discountPercent') ?? 0)));
  const durationMonths = Math.max(1, Number(formData.get('durationMonths') ?? 1));
  const eligiblePlans = formData.getAll('eligiblePlans').map(String).filter((k) => ELIGIBLE_KEYS.has(k as never));
  const maxRedemptionsRaw = String(formData.get('maxRedemptions') ?? '').trim();
  const maxRedemptions = maxRedemptionsRaw ? Math.max(0, Number(maxRedemptionsRaw)) : null;
  const expiresAtRaw = String(formData.get('expiresAt') ?? '').trim();
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  await updateFoundersPromo({
    enabled,
    badge,
    discountPercent,
    durationMonths,
    eligiblePlans,
    maxRedemptions,
    expiresAt,
  });

  revalidatePath('/admin/pricing');
  revalidatePath('/');
  return { success: true };
}
