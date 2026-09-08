import { db } from '@/lib/db';
import { RoleName, CreditReason } from '@prisma/client';
import { getPlan } from '@/config/pricing';

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createOrganizationForUser(userId: string, name: string) {
  const baseSlug = slugify(name) || 'organisation';
  let slug = baseSlug;
  let attempt = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  // Every new tenant starts on the free Discovery plan, active immediately
  // (no card, no trial clock — Discovery is free forever, not a trial of a
  // paid plan). The 14-day trial in src/config/pricing.ts only applies when
  // checking out Professional/Business via Stripe (see billing.service.ts).
  const discoveryPlan = await db.plan.findUnique({ where: { key: 'discovery' } });
  const discoveryConfig = getPlan('discovery');

  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name,
        slug,
        ownerId: userId,
        status: 'ACTIVE',
      },
    });

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId,
        role: RoleName.OWNER,
      },
    });

    if (discoveryPlan) {
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: discoveryPlan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
        },
      });

      const wallet = await tx.creditWallet.create({
        data: { organizationId: organization.id, balance: discoveryConfig.quotas.creditsPerMonth },
      });
      await tx.creditTransaction.create({
        data: {
          organizationId: organization.id,
          walletId: wallet.id,
          amount: discoveryConfig.quotas.creditsPerMonth,
          reason: CreditReason.MONTHLY_ALLOWANCE,
          balanceAfter: wallet.balance,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        actorUserId: userId,
        action: 'organization.created',
        targetType: 'Organization',
        targetId: organization.id,
      },
    });

    return organization;
  });
}

/** Organizations the given user is a verified member of (for the workspace switcher). */
export async function listOrganizationsForUser(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m) => ({ organization: m.organization, role: m.role }));
}
