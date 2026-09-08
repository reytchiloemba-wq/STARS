import { db } from '@/lib/db';
import { type SocialNetwork, SocialAccountStatus } from '@prisma/client';

export interface ConnectSocialAccountInput {
  organizationId: string;
  brandId?: string;
  network: SocialNetwork;
  displayName: string;
  externalId: string;
  scopes?: string[];
  connectedById: string;
}

export class SocialService {
  static async listAccounts(organizationId: string) {
    return db.socialAccount.findMany({
      where: { organizationId },
      include: { brand: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async connectAccount(input: ConnectSocialAccountInput) {
    // Chiffrement symbolique en sandbox / mock (dans un environnement de prod, utilise un vrai chiffrement AES-256)
    const tokenDummyEnc = `enc_${Buffer.from(`tok-${Date.now()}-${input.externalId}`).toString('base64')}`;

    return db.socialAccount.upsert({
      where: {
        organizationId_network_externalId: {
          organizationId: input.organizationId,
          network: input.network,
          externalId: input.externalId,
        },
      },
      create: {
        organizationId: input.organizationId,
        brandId: input.brandId,
        network: input.network,
        displayName: input.displayName,
        externalId: input.externalId,
        scopes: input.scopes || ['r_liteprofile', 'w_member_social'],
        accessTokenEnc: tokenDummyEnc,
        connectedById: input.connectedById,
        status: SocialAccountStatus.ACTIVE,
      },
      update: {
        displayName: input.displayName,
        status: SocialAccountStatus.ACTIVE,
        accessTokenEnc: tokenDummyEnc,
        lastUsedAt: new Date(),
      },
    });
  }

  static async disconnectAccount(organizationId: string, id: string) {
    const account = await db.socialAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new Error('Compte introuvable ou accès refusé');

    return db.socialAccount.update({
      where: { id },
      data: { status: SocialAccountStatus.REVOKED },
    });
  }
}
