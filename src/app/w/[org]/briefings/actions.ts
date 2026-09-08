'use server';

import { requireTenantPermission } from '@/lib/tenant';
import { RadarService, type ExecutiveBriefingContent } from '@/server/services/radar.service';

export async function generateBriefingAction(
  orgSlug: string,
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
): Promise<{ ok: boolean; briefing?: ExecutiveBriefingContent; error?: string }> {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'analysis.create');
    const briefing = await RadarService.generateBriefing(ctx.organization.id, period);
    return { ok: true, briefing };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur lors de la génération du briefing' };
  }
}
