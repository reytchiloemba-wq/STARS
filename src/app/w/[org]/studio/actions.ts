'use server';

import { resolveTenant, requireTenantPermission } from '@/lib/tenant';
import { db } from '@/lib/db';
import { EditorialService, type PostVariantItem } from '@/server/services/editorial.service';
import { type SocialNetwork, type MediaKind } from '@prisma/client';

export async function generateVariantsAction(
  orgSlug: string,
  params: {
    topicTitle: string;
    summary: string;
    network: SocialNetwork;
    objective?: string;
    tone?: string;
    brandVoiceId?: string;
    includeSources?: boolean;
    sourceUrls?: string[];
  },
): Promise<{ ok: boolean; variants?: PostVariantItem[]; error?: string }> {
  try {
    const ctx = await resolveTenant(orgSlug);
    const variants = await EditorialService.generateVariants({
      organizationId: ctx.organization.id,
      userId: ctx.userId,
      ...params,
    });
    return { ok: true, variants };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

export async function saveDraftAction(
  orgSlug: string,
  params: {
    draftId?: string;
    topicId?: string;
    brandVoiceId?: string;
    network: SocialNetwork;
    objective?: string;
    tone?: string;
    content: string;
    variantLabel?: string;
  },
): Promise<{ ok: boolean; draftId?: string; error?: string }> {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'draft.create');
    const draft = await EditorialService.saveDraft({
      organizationId: ctx.organization.id,
      userId: ctx.userId,
      ...params,
    });
    return { ok: true, draftId: draft.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de sauvegarde' };
  }
}

export async function publishOrScheduleAction(
  orgSlug: string,
  params: {
    draftId: string;
    socialAccountIds: string[];
    scheduledAt?: string;
    timezone?: string;
  },
): Promise<{ ok: boolean; publicationId?: string; error?: string }> {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'social.publish');
    const pub = await EditorialService.publishOrSchedule({
      organizationId: ctx.organization.id,
      userId: ctx.userId,
      draftId: params.draftId,
      socialAccountIds: params.socialAccountIds,
      scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : undefined,
      timezone: params.timezone,
    });

    // publishOrSchedule can resolve without throwing even when every target
    // failed (each connector call is caught individually so one account's
    // failure doesn't abort the others) — inspect the real outcome here
    // rather than assuming success whenever nothing threw.
    if (pub.status === 'FAILED') {
      const targets = await db.publicationTarget.findMany({
        where: { publicationId: pub.id },
        select: { status: true, errorMessage: true },
      });
      const reasons = targets
        .filter((t) => t.status === 'FAILED')
        .map((t) => t.errorMessage)
        .filter((msg): msg is string => Boolean(msg));
      return {
        ok: false,
        publicationId: pub.id,
        error: reasons.length > 0 ? reasons.join(' · ') : 'La publication a échoué sur tous les comptes sélectionnés.',
      };
    }

    return { ok: true, publicationId: pub.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de publication' };
  }
}

export async function attachIllustrationAction(
  orgSlug: string,
  params: {
    draftId?: string;
    kind: MediaKind;
    url: string;
    altText?: string;
    aiPrompt?: string;
    aiGenerated?: boolean;
    licenseNote?: string;
  },
): Promise<{ ok: boolean; assetId?: string; error?: string }> {
  try {
    const ctx = await resolveTenant(orgSlug);
    const asset = await EditorialService.attachIllustration({
      organizationId: ctx.organization.id,
      userId: ctx.userId,
      ...params,
    });
    return { ok: true, assetId: asset.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur illustration' };
  }
}
