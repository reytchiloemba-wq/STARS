import type { BillingProvider } from './types';
import { MockBillingProvider } from './mock';
import { StripeBillingProvider } from './stripe';

export * from './types';

export function getBillingProvider(): BillingProvider {
  if (process.env.STRIPE_SECRET_KEY) return new StripeBillingProvider();
  return new MockBillingProvider();
}
