import { db } from '@/lib/db';
import { CreditReason } from '@prisma/client';
import type { TenantContext } from '@/lib/tenant';
import { getNewsSearchAdapter, type SearchFilters, type Dossier } from '@/server/adapters/news';
import { debitCredits } from '@/server/services/credits.service';
import { CREDIT_COSTS } from '@/config/pricing';

const DEPTH_CREDIT_COST: Record<NonNullable<SearchFilters['depth']>, { cost: number; reason: CreditReason }> = {
  EXPRESS: { cost: CREDIT_COSTS.ANALYSIS_EXPRESS, reason: CreditReason.ANALYSIS_EXPRESS },
  DEEP: { cost: CREDIT_COSTS.ANALYSIS_DEEP, reason: CreditReason.ANALYSIS_DEEP },
  STRATEGIC: { cost: CREDIT_COSTS.ANALYSIS_STRATEGIC, reason: CreditReason.ANALYSIS_STRATEGIC },
};

/**
 * STARS Direct: run a free-text query for the ACTIVE tenant only.
 * `ctx` must come from `resolveTenant`/`requireTenantPermission` — never
 * accept a bare organizationId here.
 *
 * Spends STARS Credits BEFORE calling the (potentially costly) adapter —
 * see credits.service.ts for the atomic debit that makes this race-safe.
 * Throws InsufficientCreditsError if the tenant's wallet can't cover it;
 * the caller is responsible for surfacing an upgrade/buy-credits prompt.
 * Content already created earlier is never affected by a depleted balance.
 */
export async function runDirectSearch(
  ctx: TenantContext,
  rawQuery: string,
  filters: SearchFilters,
): Promise<{ requestId: string; dossier: Dossier; creditsRemaining: number }> {
  const depth = filters.depth ?? 'EXPRESS';
  const { cost, reason } = DEPTH_CREDIT_COST[depth];

  const creditsRemaining = await debitCredits(ctx, cost, reason, { rawQuery, depth });

  const searchRequest = await db.searchRequest.create({
    data: {
      organizationId: ctx.organization.id,
      userId: ctx.userId,
      rawQuery,
      depth,
      filters: filters as object,
    },
  });

  await db.searchSession.create({
    data: {
      organizationId: ctx.organization.id,
      userId: ctx.userId,
      searchRequestId: searchRequest.id,
    },
  });

  const dossier = await getNewsSearchAdapter().search(rawQuery, filters);

  return { requestId: searchRequest.id, dossier, creditsRemaining };
}

/** STARS Explore: list topics for a domain, scoped to the active tenant's own follow/save state. */
export async function listDomainTopics(ctx: TenantContext, categoryKey: string) {
  const category = await db.category.findUnique({ where: { key: categoryKey } });
  const demoTopics = await getNewsSearchAdapter().listDomainTopics(categoryKey);

  const followedTopics = category
    ? await db.topic.findMany({
        where: { organizationId: ctx.organization.id, categoryId: category.id },
      })
    : [];

  return demoTopics.map((t) => ({
    ...t,
    followed: followedTopics.some((f) => f.title === t.title),
  }));
}
