import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { getPlan, type PlanKey } from '@/config/pricing';
import { applyCreditPackPurchase } from '@/server/services/billing.service';
import { SubStatus, BillingCycle } from '@prisma/client';

// Stripe requires the raw, unparsed request body to verify the webhook
// signature — do not let Next.js body-parse this route.
export const runtime = 'nodejs';

function mapStripeStatus(status: Stripe.Subscription.Status): SubStatus {
  switch (status) {
    case 'trialing':
      return SubStatus.TRIALING;
    case 'active':
      return SubStatus.ACTIVE;
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return SubStatus.PAST_DUE;
    case 'canceled':
    case 'incomplete_expired':
    default:
      return SubStatus.CANCELLED;
  }
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const item = subscription.items.data[0];
  return item ? new Date(item.current_period_end * 1000) : null;
}

export async function POST(req: Request): Promise<Response> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe is not configured on this deployment.' }, { status: 501 });
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error('Missing stripe-signature header');
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  // Idempotency: Stripe retries deliveries, so the same event id can arrive
  // more than once. Recording it first (and short-circuiting on conflict)
  // means every side effect below runs at most once per event.
  try {
    await db.processedWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId ?? session.client_reference_id;
      if (!organizationId) break;

      if (session.mode === 'payment' && session.metadata?.creditPackCredits) {
        await applyCreditPackPurchase(organizationId, Number(session.metadata.creditPackCredits), session.id);
        break;
      }

      if (session.mode === 'subscription' && session.subscription) {
        const planKey = session.metadata?.planKey as PlanKey | undefined;
        const billingCycle = (session.metadata?.billingCycle as 'MONTHLY' | 'ANNUAL' | undefined) ?? 'MONTHLY';
        if (!planKey) break;

        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const plan = getPlan(planKey);
        const dbPlan = await db.plan.findUnique({ where: { key: plan.key } });
        if (!dbPlan) break;

        await db.subscription.upsert({
          where: { organizationId },
          create: {
            organizationId,
            planId: dbPlan.id,
            status: mapStripeStatus(stripeSubscription.status),
            billingCycle: billingCycle === 'ANNUAL' ? BillingCycle.ANNUAL : BillingCycle.MONTHLY,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId: stripeSubscription.id,
            trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
            currentPeriodEnd: getCurrentPeriodEnd(stripeSubscription),
          },
          update: {
            planId: dbPlan.id,
            status: mapStripeStatus(stripeSubscription.status),
            billingCycle: billingCycle === 'ANNUAL' ? BillingCycle.ANNUAL : BillingCycle.MONTHLY,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripeSubscriptionId: stripeSubscription.id,
            trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
            currentPeriodEnd: getCurrentPeriodEnd(stripeSubscription),
          },
        });
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const existing = await db.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubscription.id } });
      if (!existing) break;

      await db.subscription.update({
        where: { id: existing.id },
        data: {
          status: mapStripeStatus(stripeSubscription.status),
          currentPeriodEnd: getCurrentPeriodEnd(stripeSubscription),
        },
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      if (!subscriptionId) break;
      const existing = await db.subscription.findFirst({
        where: { stripeSubscriptionId: typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id },
      });
      if (!existing) break;
      await db.subscription.update({ where: { id: existing.id }, data: { status: SubStatus.PAST_DUE } });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
