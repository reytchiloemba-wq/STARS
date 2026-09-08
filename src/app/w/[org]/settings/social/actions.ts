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
  LINKEDIN: 'Page Entreprise LinkedIn (Compte Vérifié)',
  X: 'Profil Officiel X / Twitter (@stars_media)',
  INSTAGRAM: 'Compte Instagram Professionnel (@stars_intelligence)',
  FACEBOOK: 'Page Facebook Professionnelle (STARS Média)',
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
