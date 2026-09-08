'use server';

import { redirect } from 'next/navigation';
import { requireTenantPermission } from '@/lib/tenant';
import { db } from '@/lib/db';
import type { PlanKey } from '@/config/pricing';
import { startPlanCheckout, startCreditPackCheckout, startBillingPortal } from '@/server/services/billing.service';

async function ownerEmail(userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return user.email;
}

function billingErrorRedirect(orgSlug: string, err: unknown): never {
  const message = err instanceof Error ? err.message : 'Une erreur est survenue.';
  redirect(`/w/${orgSlug}/settings/billing?error=${encodeURIComponent(message)}`);
}

export async function checkoutPlanAction(orgSlug: string, formData: FormData) {
  const ctx = await requireTenantPermission(orgSlug, 'billing.manage');
  const planKey = String(formData.get('planKey')) as PlanKey;
  const billingCycle = String(formData.get('billingCycle') ?? 'MONTHLY') as 'MONTHLY' | 'ANNUAL';

  let url: string;
  try {
    const email = await ownerEmail(ctx.userId);
    ({ url } = await startPlanCheckout(ctx, planKey, billingCycle, email));
  } catch (err) {
    billingErrorRedirect(orgSlug, err);
  }
  redirect(url);
}

export async function checkoutCreditPackAction(orgSlug: string, packIndex: number) {
  const ctx = await requireTenantPermission(orgSlug, 'billing.manage');
  let url: string;
  try {
    const email = await ownerEmail(ctx.userId);
    ({ url } = await startCreditPackCheckout(ctx, packIndex, email));
  } catch (err) {
    billingErrorRedirect(orgSlug, err);
  }
  redirect(url);
}

export async function openBillingPortalAction(orgSlug: string) {
  const ctx = await requireTenantPermission(orgSlug, 'billing.manage');
  let url: string;
  try {
    ({ url } = await startBillingPortal(ctx));
  } catch (err) {
    billingErrorRedirect(orgSlug, err);
  }
  redirect(url);
}
