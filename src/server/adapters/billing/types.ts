import type { PlanKey } from '@/config/pricing';

export interface CheckoutSessionRequest {
  organizationId: string;
  organizationName: string;
  organizationEmail: string;
  existingStripeCustomerId?: string | null;
  planKey: PlanKey;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  trialDays: number | null;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalSessionRequest {
  stripeCustomerId: string;
  returnUrl: string;
}

export interface CreditPackCheckoutRequest {
  organizationId: string;
  organizationName: string;
  organizationEmail: string;
  existingStripeCustomerId?: string | null;
  credits: number;
  priceCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface InvoiceSummary {
  id: string;
  number: string | null;
  amountDueCents: number;
  status: string;
  createdAt: Date;
  hostedInvoiceUrl: string | null;
}

export interface BillingProvider {
  isConfigured(): boolean;
  createCheckoutSession(req: CheckoutSessionRequest): Promise<{ url: string }>;
  createCreditPackCheckoutSession(req: CreditPackCheckoutRequest): Promise<{ url: string }>;
  createPortalSession(req: PortalSessionRequest): Promise<{ url: string }>;
  listInvoices(stripeCustomerId: string): Promise<InvoiceSummary[]>;
}
