import { db } from '@/lib/db';
import { RoleName, CreditReason } from '@prisma/client';
import { getPlan, type PlanKey } from '@/config/pricing';
import bcrypt from 'bcryptjs';

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

export interface CreateTenantByAdminParams {
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  password?: string;
  planKey?: string;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  customCredits?: number;
  adminUserId?: string;
  // B2B KYC & Corporate Details
  registrationNumber?: string; // SIREN / SIRET / N° registre
  vatNumber?: string;
  country?: string;
  city?: string;
  industry?: string;
  website?: string;
  ownerJobTitle?: string;
  ownerPhone?: string;
  poNumber?: string;
  paymentMethod?: string;
  customSlug?: string;
  retentionPolicyDays?: number;
  editorialCharter?: string;
  internalNotes?: string;
}

export async function createTenantByAdmin(params: CreateTenantByAdminParams) {
  const orgName = params.organizationName.trim();
  const ownerName = params.ownerName.trim();
  const ownerEmail = params.ownerEmail.trim().toLowerCase();
  const rawPassword = params.password?.trim() || Math.random().toString(36).slice(-8) + 'St@r1';
  const selectedPlanKey = (params.planKey || 'discovery') as PlanKey;

  if (!orgName) throw new Error("Le nom de l'organisation est obligatoire.");
  if (!ownerEmail) throw new Error("L'adresse e-mail du responsable est obligatoire.");
  if (!ownerName) throw new Error("Le nom du responsable est obligatoire.");

  // Vérifier ou créer l'utilisateur
  let user = await db.user.findUnique({ where: { email: ownerEmail } });
  if (!user) {
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    user = await db.user.create({
      data: {
        email: ownerEmail,
        name: ownerName,
        passwordHash,
      },
    });
  }

  const desiredSlug = params.customSlug?.trim() ? slugify(params.customSlug.trim()) : '';
  const baseSlug = desiredSlug || slugify(orgName) || 'organisation';
  let slug = baseSlug;
  let attempt = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const planRow = (await db.plan.findUnique({ where: { key: selectedPlanKey } })) ?? (await db.plan.findUnique({ where: { key: 'discovery' } }));
  const planConfig = getPlan(selectedPlanKey);
  const initialCredits = params.customCredits !== undefined && params.customCredits >= 0
    ? params.customCredits
    : (planConfig.quotas.creditsPerMonth > 0 ? planConfig.quotas.creditsPerMonth : 100);

  const billingCycle = params.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  const retentionPolicyDays = params.retentionPolicyDays && params.retentionPolicyDays > 0 ? params.retentionPolicyDays : 365;

  const org = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        ownerId: user.id,
        status: 'ACTIVE',
        retentionPolicyDays,
        editorialCharter: params.editorialCharter || null,
      },
    });

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: RoleName.OWNER,
      },
    });

    if (planRow) {
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: planRow.id,
          status: 'ACTIVE',
          billingCycle,
        },
      });
    }

    const wallet = await tx.creditWallet.create({
      data: { organizationId: organization.id, balance: initialCredits },
    });

    await tx.creditTransaction.create({
      data: {
        organizationId: organization.id,
        walletId: wallet.id,
        amount: initialCredits,
        reason: CreditReason.MONTHLY_ALLOWANCE,
        balanceAfter: initialCredits,
        metadata: {
          note: `Initialisation par Super-Admin STARS (Forfait ${planConfig.name})`,
          poNumber: params.poNumber || undefined,
          paymentMethod: params.paymentMethod || undefined,
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        actorUserId: params.adminUserId,
        action: 'organization.registered_by_admin',
        targetType: 'Organization',
        targetId: organization.id,
        metadata: {
          organizationName: orgName,
          ownerEmail,
          ownerName,
          ownerJobTitle: params.ownerJobTitle || null,
          ownerPhone: params.ownerPhone || null,
          registrationNumber: params.registrationNumber || null,
          vatNumber: params.vatNumber || null,
          country: params.country || null,
          city: params.city || null,
          industry: params.industry || null,
          website: params.website || null,
          poNumber: params.poNumber || null,
          paymentMethod: params.paymentMethod || null,
          billingCycle,
          retentionPolicyDays,
          internalNotes: params.internalNotes || null,
          plan: planConfig.name,
          initialCredits,
        },
      },
    });

    return organization;
  });

  return {
    organization: org,
    user,
    plainPassword: rawPassword,
    planName: planConfig.name,
    billingCycle,
    initialCredits,
  };
}

