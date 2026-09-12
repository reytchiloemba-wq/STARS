import { db } from '@/lib/db';
import { getPlan, type PlanKey } from '@/config/pricing';

function currentPeriod(): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { periodStart, periodEnd };
}

async function getPlanKey(organizationId: string): Promise<PlanKey> {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });
  return (sub?.plan.key as PlanKey | undefined) ?? 'discovery';
}

/**
 * Rolls the Usage row over to the current calendar month on first read of a
 * new period — counters reset, but `extraCommentsBalance` (paid packs)
 * survives the rollover since packs are sold with a 12-month validity, not a
 * monthly one (see COMMENT_PACKS in config/pricing.ts).
 */
async function getOrCreateCurrentUsage(organizationId: string) {
  const { periodStart, periodEnd } = currentPeriod();
  const existing = await db.usage.findUnique({ where: { organizationId } });

  if (existing && existing.periodStart.getTime() === periodStart.getTime()) {
    return existing;
  }

  return db.usage.upsert({
    where: { organizationId },
    create: { organizationId, periodStart, periodEnd },
    update: {
      periodStart,
      periodEnd,
      directSearches: 0,
      topicsAnalyzed: 0,
      aiImagesGenerated: 0,
      publications: 0,
      commentsIngested: 0,
      aiSuggestionsGenerated: 0,
      // extraCommentsBalance intentionally NOT reset — packs are pre-paid,
      // real consent already given, and carry their own validity window.
    },
  });
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Called once per genuinely NEW (non-duplicate) inbound comment. Real
 * webhook data from a social platform is never dropped — an over-quota
 * comment is still stored (see ingestComment), just without the paid AI
 * enrichment pass, until the tenant buys a comment pack or upgrades.
 */
export async function checkAndConsumeCommentQuota(organizationId: string): Promise<QuotaCheckResult> {
  const [planKey, usage] = await Promise.all([getPlanKey(organizationId), getOrCreateCurrentUsage(organizationId)]);
  const plan = getPlan(planKey);
  const limit = plan.quotas.commentsPerMonth;

  if (limit < 0 || usage.commentsIngested < limit) {
    await db.usage.update({ where: { organizationId }, data: { commentsIngested: { increment: 1 } } });
    return { allowed: true };
  }

  if (usage.extraCommentsBalance > 0) {
    await db.usage.update({
      where: { organizationId },
      data: { commentsIngested: { increment: 1 }, extraCommentsBalance: { decrement: 1 } },
    });
    return { allowed: true };
  }

  await db.usage.update({ where: { organizationId }, data: { commentsIngested: { increment: 1 } } });
  return {
    allowed: false,
    reason: `Quota de ${limit} commentaires/mois atteint pour le forfait ${plan.name}. Achetez un pack ou passez à un forfait supérieur pour réactiver l'analyse IA.`,
  };
}

/**
 * Called before generating (or regenerating) Response Copilot suggestions
 * for one comment — each call proposes several variants at once but only
 * counts as a single "suggestion batch" against the monthly allowance,
 * matching the plan's advertised "N suggestions IA / mois".
 */
export async function checkAndConsumeSuggestionQuota(organizationId: string): Promise<QuotaCheckResult> {
  const [planKey, usage] = await Promise.all([getPlanKey(organizationId), getOrCreateCurrentUsage(organizationId)]);
  const plan = getPlan(planKey);
  const limit = plan.quotas.commentAiSuggestionsPerMonth;

  if (limit < 0 || usage.aiSuggestionsGenerated < limit) {
    await db.usage.update({ where: { organizationId }, data: { aiSuggestionsGenerated: { increment: 1 } } });
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Quota de ${limit} suggestions IA/mois atteint pour le forfait ${plan.name}. Passez à un forfait supérieur pour continuer à utiliser le Response Copilot ce mois-ci.`,
  };
}

export async function grantExtraComments(organizationId: string, amount: number): Promise<void> {
  await getOrCreateCurrentUsage(organizationId);
  await db.usage.update({
    where: { organizationId },
    data: { extraCommentsBalance: { increment: amount } },
  });
}
