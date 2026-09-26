import { db } from '@/lib/db';
import { RoleName, CreditReason, SubStatus, BillingCycle } from '@prisma/client';
import { getPlan, type PlanKey } from '@/config/pricing';
import { getBillingProvider } from '@/server/adapters/billing';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit comporter au moins 2 caractères.'),
  email: z.string().trim().email('Adresse e-mail invalide.').toLowerCase(),
  password: z.string().min(8, 'Le mot de passe doit comporter au moins 8 caractères.'),
  organizationName: z.string().trim().min(2, "Le nom de l'organisation doit comporter au moins 2 caractères."),
  planKey: z.enum(['discovery', 'creator', 'professional', 'business']),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export interface RegisterResult {
  userId: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  email: string;
  planKey: PlanKey;
  redirectUrl: string;
}

export async function registerUserWithOrganizationAndPlan(
  input: RegisterInput
): Promise<RegisterResult> {
  const validated = registerSchema.parse(input);

  // 1. Unicité de l'e-mail
  const existingUser = await db.user.findUnique({
    where: { email: validated.email },
  });
  if (existingUser) {
    throw new Error('Un compte est déjà associé à cette adresse e-mail. Veuillez vous connecter.');
  }

  // 2. Génération du slug unique
  const baseSlug = slugify(validated.organizationName) || 'organisation';
  let slug = baseSlug;
  let attempt = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  // 3. Hachage du mot de passe
  const passwordHash = await bcrypt.hash(validated.password, 12);

  // 4. Configuration du plan
  const planConfig = getPlan(validated.planKey);
  const planRow =
    (await db.plan.findUnique({ where: { key: validated.planKey } })) ??
    (await db.plan.findUnique({ where: { key: 'discovery' } }));

  const isFreePlan = validated.planKey === 'discovery';
  const initialCredits = planConfig.quotas.creditsPerMonth > 0 ? planConfig.quotas.creditsPerMonth : 10;
  const billingProvider = getBillingProvider();
  const isStripeActive = billingProvider.isConfigured();

  // 5. Transaction de création de compte
  const { user, organization } = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        passwordHash,
      },
    });

    const newOrg = await tx.organization.create({
      data: {
        name: validated.organizationName,
        slug,
        ownerId: newUser.id,
        status: 'ACTIVE',
      },
    });

    await tx.membership.create({
      data: {
        organizationId: newOrg.id,
        userId: newUser.id,
        role: RoleName.OWNER,
      },
    });

    if (planRow) {
      await tx.subscription.create({
        data: {
          organizationId: newOrg.id,
          planId: planRow.id,
          status: isFreePlan
            ? SubStatus.ACTIVE
            : planConfig.trialDays
              ? SubStatus.TRIALING
              : SubStatus.ACTIVE,
          billingCycle:
            validated.billingCycle === 'ANNUAL' ? BillingCycle.ANNUAL : BillingCycle.MONTHLY,
          trialEndsAt:
            !isFreePlan && planConfig.trialDays
              ? new Date(Date.now() + planConfig.trialDays * 86400000)
              : null,
        },
      });
    }

    const wallet = await tx.creditWallet.create({
      data: {
        organizationId: newOrg.id,
        balance: initialCredits,
      },
    });

    await tx.creditTransaction.create({
      data: {
        organizationId: newOrg.id,
        walletId: wallet.id,
        amount: initialCredits,
        reason: CreditReason.MONTHLY_ALLOWANCE,
        balanceAfter: initialCredits,
        metadata: {
          note: `Initialisation à l'inscription (Forfait ${planConfig.name})`,
          planKey: validated.planKey,
          billingCycle: validated.billingCycle,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: newOrg.id,
        actorUserId: newUser.id,
        action: 'user.registered_self_serve',
        targetType: 'Organization',
        targetId: newOrg.id,
        metadata: {
          userEmail: validated.email,
          userName: validated.name,
          planKey: validated.planKey,
          billingCycle: validated.billingCycle,
        },
      },
    });

    return { user: newUser, organization: newOrg };
  });

  const baseUrl = getBaseUrl();

  // 6. Détermination de la redirection (Stripe Checkout ou Dashboard direct)
  let redirectUrl: string;

  if (isFreePlan) {
    redirectUrl = `${baseUrl}/w/${organization.slug}/dashboard?welcome=1`;
  } else if (isStripeActive) {
    // Forfait payant avec Stripe configuré -> session Stripe Checkout
    const checkoutSession = await billingProvider.createCheckoutSession({
      organizationId: organization.id,
      organizationName: organization.name,
      organizationEmail: user.email,
      existingStripeCustomerId: null,
      planKey: validated.planKey,
      billingCycle: validated.billingCycle,
      trialDays: planConfig.trialDays,
      successUrl: `${baseUrl}/w/${organization.slug}/dashboard?checkout=success`,
      cancelUrl: `${baseUrl}/w/${organization.slug}/settings/billing?checkout=cancelled`,
    });
    redirectUrl = checkoutSession.url;
  } else {
    // Mode démo/développement sans clés Stripe en local
    redirectUrl = `${baseUrl}/w/${organization.slug}/dashboard?welcome=1&plan=${validated.planKey}&demo=billing`;
  }

  return {
    userId: user.id,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    email: user.email,
    planKey: validated.planKey,
    redirectUrl,
  };
}
