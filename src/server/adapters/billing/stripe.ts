import Stripe from 'stripe';
import { getPlan, CURRENCY } from '@/config/pricing';
import type {
  BillingProvider,
  CheckoutSessionRequest,
  CreditPackCheckoutRequest,
  InvoiceSummary,
  PortalSessionRequest,
} from './types';

// Prices are created inline via Checkout's `price_data` rather than requiring
// pre-created Stripe Product/Price objects — src/config/pricing.ts stays the
// single source of truth for amounts, and there is no separate Stripe
// dashboard config to keep in sync. (A production deployment MAY switch to
// pre-created Prices for cleaner Stripe-side reporting; not required to work.)
export class StripeBillingProvider implements BillingProvider {
  private readonly stripe: Stripe | null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new Stripe(key) : null;
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  private requireClient(): Stripe {
    if (!this.stripe) {
      throw new Error("La facturation n'est pas configurée (STRIPE_SECRET_KEY absent).");
    }
    return this.stripe;
  }

  async createCheckoutSession(req: CheckoutSessionRequest): Promise<{ url: string }> {
    const stripe = this.requireClient();
    const plan = getPlan(req.planKey);

    const amount = req.billingCycle === 'ANNUAL' ? plan.annualPriceCents : plan.monthlyPriceCents;
    if (amount === null || amount === 0) {
      throw new Error(`Le plan ${plan.name} n'a pas de paiement en libre-service (offre gratuite ou sur devis).`);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: req.existingStripeCustomerId ?? undefined,
      customer_email: req.existingStripeCustomerId ? undefined : req.organizationEmail,
      client_reference_id: req.organizationId,
      allow_promotion_codes: true,
      // "Essai de 14 jours sans carte bancaire" (spec §10) — without this,
      // Stripe Checkout collects a payment method up front even in trial.
      payment_method_collection: req.trialDays ? 'if_required' : 'always',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY.toLowerCase(),
            unit_amount: amount,
            recurring: { interval: req.billingCycle === 'ANNUAL' ? 'year' : 'month' },
            product_data: {
              name: `STARS ${plan.name} (${req.billingCycle === 'ANNUAL' ? 'Annuel' : 'Mensuel'})`,
            },
          },
        },
      ],
      subscription_data: {
        trial_period_days: req.trialDays ?? undefined,
        metadata: { organizationId: req.organizationId, planKey: req.planKey, billingCycle: req.billingCycle },
      },
      metadata: { organizationId: req.organizationId, planKey: req.planKey, billingCycle: req.billingCycle },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return { url: session.url };
  }

  async createCreditPackCheckoutSession(req: CreditPackCheckoutRequest): Promise<{ url: string }> {
    const stripe = this.requireClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: req.existingStripeCustomerId ?? undefined,
      customer_email: req.existingStripeCustomerId ? undefined : req.organizationEmail,
      client_reference_id: req.organizationId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY.toLowerCase(),
            unit_amount: req.priceCents,
            product_data: { name: `${req.credits} STARS Credits` },
          },
        },
      ],
      metadata: { organizationId: req.organizationId, creditPackCredits: String(req.credits) },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return { url: session.url };
  }

  async createPortalSession(req: PortalSessionRequest): Promise<{ url: string }> {
    const stripe = this.requireClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: req.stripeCustomerId,
      return_url: req.returnUrl,
    });
    return { url: session.url };
  }

  async listInvoices(stripeCustomerId: string): Promise<InvoiceSummary[]> {
    const stripe = this.requireClient();
    const invoices = await stripe.invoices.list({ customer: stripeCustomerId, limit: 24 });
    return invoices.data.map((inv) => ({
      id: inv.id ?? '',
      number: inv.number,
      amountDueCents: inv.amount_due,
      status: inv.status ?? 'unknown',
      createdAt: new Date(inv.created * 1000),
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    }));
  }
}
