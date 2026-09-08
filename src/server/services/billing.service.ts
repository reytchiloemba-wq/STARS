import { db } from '@/lib/db';
import type { TenantContext } from '@/lib/tenant';
import { getBillingProvider } from '@/server/adapters/billing';
import { getPlan, type PlanKey, CREDIT_PACKS } from '@/config/pricing';
import { grantCredits } from '@/server/services/credits.service';
import { CreditReason } from '@prisma/client';

function baseUrl() {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

export async function startPlanCheckout(
  ctx: TenantContext,
  planKey: PlanKey,
  billingCycle: 'MONTHLY' | 'ANNUAL',
  ownerEmail: string,
): Promise<{ url: string }> {
  const plan = getPlan(planKey);
  const existingSub = await db.subscription.findUnique({ where: { organizationId: ctx.organization.id } });

  return getBillingProvider().createCheckoutSession({
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    organizationEmail: ownerEmail,
    existingStripeCustomerId: existingSub?.stripeCustomerId ?? null,
    planKey,
    billingCycle,
    trialDays: plan.trialDays,
    successUrl: `${baseUrl()}/w/${ctx.organization.slug}/settings/billing?checkout=success`,
    cancelUrl: `${baseUrl()}/w/${ctx.organization.slug}/settings/billing?checkout=cancelled`,
  });
}

export async function startCreditPackCheckout(
  ctx: TenantContext,
  packIndex: number,
  ownerEmail: string,
): Promise<{ url: string }> {
  const pack = CREDIT_PACKS[packIndex];
  if (!pack) throw new Error('Unknown credit pack');

  const existingSub = await db.subscription.findUnique({ where: { organizationId: ctx.organization.id } });

  return getBillingProvider().createCreditPackCheckoutSession({
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    organizationEmail: ownerEmail,
    existingStripeCustomerId: existingSub?.stripeCustomerId ?? null,
    credits: pack.credits,
    priceCents: pack.priceCents,
    successUrl: `${baseUrl()}/w/${ctx.organization.slug}/settings/billing?credits=success`,
    cancelUrl: `${baseUrl()}/w/${ctx.organization.slug}/settings/billing?credits=cancelled`,
  });
}

export async function startBillingPortal(ctx: TenantContext): Promise<{ url: string }> {
  const sub = await db.subscription.findUnique({ where: { organizationId: ctx.organization.id } });
  if (!sub?.stripeCustomerId) {
    throw new Error('Aucun client Stripe associé à cette organisation.');
  }
  return getBillingProvider().createPortalSession({
    stripeCustomerId: sub.stripeCustomerId,
    returnUrl: `${baseUrl()}/w/${ctx.organization.slug}/settings/billing`,
  });
}

export async function listOrganizationInvoices(ctx: TenantContext) {
  const sub = await db.subscription.findUnique({ where: { organizationId: ctx.organization.id } });
  if (!sub?.stripeCustomerId) return [];
  return getBillingProvider().listInvoices(sub.stripeCustomerId);
}

/**
 * Applies a completed credit-pack purchase. Idempotency against Stripe event
 * redelivery is enforced by the caller (webhook route) via
 * ProcessedWebhookEvent — this function is safe to call at most once per
 * checkout session.
 */
export async function applyCreditPackPurchase(organizationId: string, credits: number, stripeSessionId: string) {
  await grantCredits(organizationId, credits, CreditReason.CREDIT_PACK_PURCHASE, { stripeSessionId });
}
