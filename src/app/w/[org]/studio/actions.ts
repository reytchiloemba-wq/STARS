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

export interface PublishTargetResult {
  network: SocialNetwork;
  accountName: string;
  success: boolean;
  externalPostId: string | null;
  errorMessage: string | null;
}

export interface PublishOrScheduleResult {
  ok: boolean;
  publicationId?: string;
  scheduled?: boolean;
  /** One entry per selected account, whatever the outcome — always populated so the UI can show a precise per-network breakdown instead of one generic line. */
  results?: PublishTargetResult[];
  error?: string;
}

export async function publishOrScheduleAction(
  orgSlug: string,
  params: {
    draftId: string;
    socialAccountIds: string[];
    scheduledAt?: string;
    timezone?: string;
  },
): Promise<PublishOrScheduleResult> {
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

    const targets = await db.publicationTarget.findMany({
      where: { publicationId: pub.id },
      include: { socialAccount: { select: { network: true, displayName: true } } },
    });

    const results: PublishTargetResult[] = targets.map((t) => ({
      network: t.socialAccount.network,
      accountName: t.socialAccount.displayName,
      success: t.status === 'PUBLISHED' || t.status === 'SCHEDULED',
      externalPostId: t.externalPostId,
      errorMessage: t.errorMessage,
    }));

    if (pub.status === 'SCHEDULED') {
      return { ok: true, publicationId: pub.id, scheduled: true, results };
    }

    // publishOrSchedule can resolve without throwing even when every (or
    // some) target failed — each connector call is caught individually so
    // one account's failure doesn't abort the others. Report the real,
    // per-account outcome rather than collapsing it into one generic
    // success/failure line: a 2-out-of-3 partial success must never read
    // as either "all published" or "all failed."
    const anyFailed = results.some((r) => !r.success);
    if (anyFailed) {
      const reasons = results.filter((r) => !r.success).map((r) => `${r.accountName} : ${r.errorMessage ?? 'échec inconnu'}`);
      return {
        ok: results.some((r) => r.success), // true = at least a partial success, still worth surfacing as such
        publicationId: pub.id,
        results,
        error: reasons.join(' · '),
      };
    }

    return { ok: true, publicationId: pub.id, results };
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
