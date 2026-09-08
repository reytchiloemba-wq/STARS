'use server';

import { requireTenantPermission } from '@/lib/tenant';
import { runDirectSearch } from '@/server/services/search.service';
import { InsufficientCreditsError } from '@/server/services/credits.service';
import type { Dossier } from '@/server/adapters/news';

export interface RunSearchResult {
  ok: boolean;
  dossier?: Dossier;
  creditsRemaining?: number;
  error?: { code: 'INSUFFICIENT_CREDITS'; balance: number; required: number } | { code: 'UNKNOWN'; message: string };
}

export async function runSearchAction(
  orgSlug: string,
  query: string,
  depth: 'EXPRESS' | 'DEEP' | 'STRATEGIC',
): Promise<RunSearchResult> {
  const ctx = await requireTenantPermission(orgSlug, 'search.direct.run');

  try {
    const { dossier, creditsRemaining } = await runDirectSearch(ctx, query, { depth });
    return { ok: true, dossier, creditsRemaining };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: { code: 'INSUFFICIENT_CREDITS', balance: err.balance, required: err.required } };
    }
    return { ok: false, error: { code: 'UNKNOWN', message: err instanceof Error ? err.message : 'Unknown error' } };
  }
}
