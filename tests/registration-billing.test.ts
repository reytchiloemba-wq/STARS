import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSchema, registerUserWithOrganizationAndPlan } from '@/server/services/registration.service';
import { getPlan } from '@/config/pricing';

// Mocks
let users: any[] = [];
let orgs: any[] = [];
let memberships: any[] = [];
let subscriptions: any[] = [];
let wallets: any[] = [];
let creditTxs: any[] = [];
let auditLogs: any[] = [];
let mockStripeCheckoutSession: any = null;
let isStripeConfiguredMock = false;

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) =>
        users.find((u) => u.email === where.email) ?? null
      ),
      create: vi.fn(async ({ data }: any) => {
        const user = { id: `user-${users.length + 1}`, ...data };
        users.push(user);
        return user;
      }),
    },
    organization: {
      findUnique: vi.fn(async ({ where }: { where: { slug: string } }) =>
        orgs.find((o) => o.slug === where.slug) ?? null
      ),
      create: vi.fn(async ({ data }: any) => {
        const org = { id: `org-${orgs.length + 1}`, ...data };
        orgs.push(org);
        return org;
      }),
    },
    membership: {
      create: vi.fn(async ({ data }: any) => {
        const m = { id: `mem-${memberships.length + 1}`, ...data };
        memberships.push(m);
        return m;
      }),
    },
    plan: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => ({
        id: `plan-${where.key}`,
        key: where.key,
        name: where.key.toUpperCase(),
      })),
    },
    subscription: {
      create: vi.fn(async ({ data }: any) => {
        const s = { id: `sub-${subscriptions.length + 1}`, ...data };
        subscriptions.push(s);
        return s;
      }),
    },
    creditWallet: {
      create: vi.fn(async ({ data }: any) => {
        const w = { id: `wallet-${wallets.length + 1}`, ...data };
        wallets.push(w);
        return w;
      }),
    },
    creditTransaction: {
      create: vi.fn(async ({ data }: any) => {
        const tx = { id: `tx-${creditTxs.length + 1}`, ...data };
        creditTxs.push(tx);
        return tx;
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: any) => {
        const log = { id: `log-${auditLogs.length + 1}`, ...data };
        auditLogs.push(log);
        return log;
      }),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      // Pour les tests, le tx est simplement l'objet db mocké
      const { db } = await import('@/lib/db');
      return cb(db);
    }),
  },
}));

vi.mock('@/server/adapters/billing', () => ({
  getBillingProvider: vi.fn(() => ({
    isConfigured: vi.fn(() => isStripeConfiguredMock),
    createCheckoutSession: vi.fn(async (req: any) => {
      mockStripeCheckoutSession = req;
      return { url: `https://checkout.stripe.com/c/pay/cs_test_${req.planKey}` };
    }),
  })),
}));

describe('Self-Serve Registration & Subscription Billing', () => {
  beforeEach(() => {
    users = [];
    orgs = [];
    memberships = [];
    subscriptions = [];
    wallets = [];
    creditTxs = [];
    auditLogs = [];
    mockStripeCheckoutSession = null;
    isStripeConfiguredMock = false;
  });

  describe('Validation du schéma registerSchema', () => {
    it('valide une saisie complète et correcte pour Discovery', () => {
      const parsed = registerSchema.safeParse({
        name: 'Jean Dupont',
        email: 'jean.dupont@stars.media',
        password: 'Password123!',
        organizationName: 'Stars Media',
        planKey: 'discovery',
        billingCycle: 'MONTHLY',
      });
      expect(parsed.success).toBe(true);
    });

    it('valide une saisie annuelle pour Professional', () => {
      const parsed = registerSchema.safeParse({
        name: 'Sophie Martin',
        email: 'sophie@agency.com',
        password: 'SecurePassword2026',
        organizationName: 'Agence Stratégie',
        planKey: 'professional',
        billingCycle: 'ANNUAL',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.billingCycle).toBe('ANNUAL');
      }
    });

    it('rejette un mot de passe trop court (< 8 caractères)', () => {
      const parsed = registerSchema.safeParse({
        name: 'Test',
        email: 'test@example.com',
        password: 'short',
        organizationName: 'Test Org',
        planKey: 'discovery',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejette un format d e-mail invalide', () => {
      const parsed = registerSchema.safeParse({
        name: 'Test',
        email: 'not-an-email',
        password: 'Password123!',
        organizationName: 'Test Org',
        planKey: 'discovery',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('registerUserWithOrganizationAndPlan workflow', () => {
    it('crée un compte Discovery et redirige vers le dashboard', async () => {
      const result = await registerUserWithOrganizationAndPlan({
        name: 'Alice Roy',
        email: 'alice@stars.dev',
        password: 'PasswordSuperSecure1',
        organizationName: 'Roy Agency',
        planKey: 'discovery',
        billingCycle: 'MONTHLY',
      });

      expect(result.email).toBe('alice@stars.dev');
      expect(result.organizationSlug).toBe('roy-agency');
      expect(result.redirectUrl).toContain('/w/roy-agency/dashboard?welcome=1');

      // Vérifier les créations en DB
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Alice Roy');
      expect(orgs).toHaveLength(1);
      expect(memberships).toHaveLength(1);
      expect(memberships[0].role).toBe('OWNER');
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].status).toBe('ACTIVE');

      // Crédits Discovery
      const discoveryConfig = getPlan('discovery');
      expect(wallets).toHaveLength(1);
      expect(wallets[0].balance).toBe(discoveryConfig.quotas.creditsPerMonth);
    });

    it('refuse l inscription si l email existe déjà', async () => {
      users.push({ id: 'u1', email: 'already@taken.com', passwordHash: 'hash' });

      await expect(
        registerUserWithOrganizationAndPlan({
          name: 'Bob',
          email: 'already@taken.com',
          password: 'PasswordSuperSecure1',
          organizationName: 'Bob Corp',
          planKey: 'creator',
          billingCycle: 'MONTHLY',
        })
      ).rejects.toThrow(/Un compte est déjà associé à cette adresse e-mail/);
    });

    it('démarre une session Stripe Checkout pour un plan payant (Professional)', async () => {
      isStripeConfiguredMock = true;

      const result = await registerUserWithOrganizationAndPlan({
        name: 'Marc Vasseur',
        email: 'marc@vasseur-consulting.fr',
        password: 'PasswordSuperSecure1',
        organizationName: 'Vasseur Consulting',
        planKey: 'professional',
        billingCycle: 'ANNUAL',
      });

      expect(result.redirectUrl).toContain('https://checkout.stripe.com');
      expect(mockStripeCheckoutSession).not.toBeNull();
      expect(mockStripeCheckoutSession.planKey).toBe('professional');
      expect(mockStripeCheckoutSession.billingCycle).toBe('ANNUAL');
      expect(mockStripeCheckoutSession.trialDays).toBe(14);
      expect(mockStripeCheckoutSession.organizationEmail).toBe('marc@vasseur-consulting.fr');
      expect(mockStripeCheckoutSession.successUrl).toContain('/dashboard?checkout=success');
      expect(mockStripeCheckoutSession.cancelUrl).toContain('/settings/billing?checkout=cancelled');
    });

    it('gère gracieusement le mode démo/test lorsque Stripe n est pas configuré', async () => {
      isStripeConfiguredMock = false;

      const result = await registerUserWithOrganizationAndPlan({
        name: 'Claire Moreau',
        email: 'claire@tech-press.com',
        password: 'PasswordSuperSecure1',
        organizationName: 'Tech Press',
        planKey: 'creator',
        billingCycle: 'MONTHLY',
      });

      expect(result.redirectUrl).toContain('/w/tech-press/dashboard?welcome=1&plan=creator&demo=billing');
      expect(subscriptions[0].status).toBe('ACTIVE');
      expect(wallets[0].balance).toBe(getPlan('creator').quotas.creditsPerMonth);
    });
  });
});
