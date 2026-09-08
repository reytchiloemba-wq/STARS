import type {
  BillingProvider,
  CheckoutSessionRequest,
  CreditPackCheckoutRequest,
  InvoiceSummary,
  PortalSessionRequest,
} from './types';

const NOT_CONFIGURED_MESSAGE =
  'La facturation n\'est pas configurée (STRIPE_SECRET_KEY absent). Voir README.md > Intégration Stripe.';

// No STRIPE_SECRET_KEY configured. Organizations stay on the Discovery plan
// (see prisma/seed.ts) until a real StripeBillingProvider is active.
export class MockBillingProvider implements BillingProvider {
  isConfigured(): boolean {
    return false;
  }

  async createCheckoutSession(_req: CheckoutSessionRequest): Promise<{ url: string }> {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  async createCreditPackCheckoutSession(_req: CreditPackCheckoutRequest): Promise<{ url: string }> {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  async createPortalSession(_req: PortalSessionRequest): Promise<{ url: string }> {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  async listInvoices(_stripeCustomerId: string): Promise<InvoiceSummary[]> {
    return [];
  }
}
