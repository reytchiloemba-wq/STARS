'use server';

import { requireTenantPermission } from '@/lib/tenant';
import { db } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto';
import type { SocialNetwork } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function disconnectSocialAccountAction(orgSlug: string, accountId: string) {
  const ctx = await requireTenantPermission(orgSlug, 'social.connect');

  // Tenant-scoped delete guard: the WHERE clause requires organizationId to
  // match the verified tenant, so this can never touch another org's row
  // even if accountId were guessed or tampered with.
  await db.socialAccount.updateMany({
    where: { id: accountId, organizationId: ctx.organization.id },
    data: { status: 'REVOKED' },
  });

  revalidatePath(`/w/${orgSlug}/settings/social`);
}

const SANDBOX_NAMES: Record<SocialNetwork, string> = {
  LINKEDIN: 'HORUS Business Automation Engineered (Page LinkedIn)',
  X: 'Profil Officiel X / Twitter (@stars_media)',
  INSTAGRAM: 'Compte Instagram Professionnel (@stars_intelligence)',
  FACEBOOK: 'HORUS Business Automation Engineered (Page Facebook)',
  TIKTOK: 'Compte Officiel TikTok (@stars_creators)',
};

export async function connectSandboxAccountAction(orgSlug: string, network: SocialNetwork) {
  const ctx = await requireTenantPermission(orgSlug, 'social.connect');

  const externalId = `sandbox_${network.toLowerCase()}_${ctx.organization.id.slice(-6)}`;
  const displayName = SANDBOX_NAMES[network] || `${network} Démo`;
  const accessTokenEnc = encryptSecret(`sandbox_access_token_${network.toLowerCase()}_2026`);

  await db.socialAccount.upsert({
    where: {
      organizationId_network_externalId: {
        organizationId: ctx.organization.id,
        network,
        externalId,
      },
    },
    create: {
      organizationId: ctx.organization.id,
      network,
      externalId,
      displayName,
      scopes: ['openid', 'profile', 'publish_content', 'pages_manage_posts'],
      accessTokenEnc,
      connectedById: ctx.userId,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an
    },
    update: {
      displayName,
      status: 'ACTIVE',
      accessTokenEnc,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath(`/w/${orgSlug}/settings/social`);
  revalidatePath(`/w/${orgSlug}/studio`);
}

export async function linkLinkedInCompanyPageAction(
  orgSlug: string,
  pageIdentifier: string,
  customDisplayName?: string,
) {
  const ctx = await requireTenantPermission(orgSlug, 'social.connect');

  const linkedInUserAccount = await db.socialAccount.findFirst({
    where: {
      organizationId: ctx.organization.id,
      network: 'LINKEDIN',
      status: 'ACTIVE',
      NOT: { externalId: { startsWith: 'sandbox_' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const cleanId = pageIdentifier
    .replace(/^urn:li:organization:/, '')
    .replace(/^https:\/\/.*linkedin\.com\/company\//, '')
    .replace(/\/.*$/, '')
    .trim();

  const orgUrn = `urn:li:organization:${cleanId}`;
  const displayName = customDisplayName?.trim() || `HORUS Business Automation Engineered (Page LinkedIn)`;
  const accessTokenEnc = linkedInUserAccount?.accessTokenEnc || encryptSecret('sandbox_access_token_linkedin_2026');

  await db.socialAccount.upsert({
    where: {
      organizationId_network_externalId: {
        organizationId: ctx.organization.id,
        network: 'LINKEDIN',
        externalId: orgUrn,
      },
    },
    create: {
      organizationId: ctx.organization.id,
      network: 'LINKEDIN',
      externalId: orgUrn,
      displayName,
      scopes: ['openid', 'profile', 'w_member_social', 'w_organization_social', 'r_organization_social'],
      accessTokenEnc,
      connectedById: ctx.userId,
      status: 'ACTIVE',
      expiresAt: linkedInUserAccount?.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    update: {
      displayName,
      status: 'ACTIVE',
      accessTokenEnc,
      expiresAt: linkedInUserAccount?.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath(`/w/${orgSlug}/settings/social`);
  revalidatePath(`/w/${orgSlug}/studio`);
  revalidatePath(`/w/${orgSlug}/drafts`);
}
