import { db } from '@/lib/db';

// Task keys the router can route (spec §14 example table). Kept as a plain
// union rather than a DB enum since routing rules are meant to be editable
// by the Super Admin without a migration.
export type AiTaskKey =
  | 'CLASSIFICATION'
  | 'DEDUPLICATION'
  | 'CLAIM_EXTRACTION'
  | 'THESIS_ANTITHESIS'
  | 'SHORT_SYNTHESIS'
  | 'STRATEGIC_ANALYSIS'
  | 'SOCIAL_POST'
  | 'BATCH_PROCESSING'
  | 'SENSITIVE_TOPIC';

// Default routing intent when no ProviderRoutingRule row exists yet — mirrors
// spec §14's example table. `profile` is descriptive only; which actual
// GlobalIntegration serves a profile is configured in the cockpit
// (ProviderRoutingRule), not hardcoded here.
const DEFAULT_PROFILE: Record<AiTaskKey, string> = {
  CLASSIFICATION: 'economique',
  DEDUPLICATION: 'economique',
  CLAIM_EXTRACTION: 'rapide',
  THESIS_ANTITHESIS: 'avance',
  SHORT_SYNTHESIS: 'economique',
  STRATEGIC_ANALYSIS: 'premium',
  SOCIAL_POST: 'equilibre',
  BATCH_PROCESSING: 'batch',
  SENSITIVE_TOPIC: 'avance+validation_humaine',
};

export interface RoutingDecision {
  taskKey: AiTaskKey;
  providerKey: string | null;
  integrationId: string | null;
  isFallback: boolean;
  reason: string;
}

/**
 * Resolves which configured AI provider should serve a given task, per the
 * Super Admin's routing rules (spec §14). Falls back through: configured
 * primary → configured fallback → "no provider configured" (never fabricates
 * a result — callers must fall back to the mock AI adapter honestly, as
 * src/server/adapters/ai/mock.ts already does).
 */
export async function resolveAiRoute(taskKey: AiTaskKey): Promise<RoutingDecision> {
  const rule = await db.providerRoutingRule.findUnique({
    where: { taskKey },
    include: { primary: { include: { provider: true } }, fallback: { include: { provider: true } } },
  });

  if (!rule) {
    return {
      taskKey,
      providerKey: null,
      integrationId: null,
      isFallback: false,
      reason: `Aucune règle de routage configurée pour ${taskKey} (profil recommandé : ${DEFAULT_PROFILE[taskKey]}). Utilisation de l'adaptateur de démonstration.`,
    };
  }

  if (rule.primary && rule.primary.status === 'OPERATIONAL') {
    return {
      taskKey,
      providerKey: rule.primary.provider.key,
      integrationId: rule.primary.id,
      isFallback: false,
      reason: `Fournisseur principal opérationnel (${rule.primary.provider.name}).`,
    };
  }

  if (rule.fallback && rule.fallback.status === 'OPERATIONAL') {
    return {
      taskKey,
      providerKey: rule.fallback.provider.key,
      integrationId: rule.fallback.id,
      isFallback: true,
      reason: `Fournisseur principal indisponible — bascule sur le fournisseur de secours (${rule.fallback.provider.name}).`,
    };
  }

  return {
    taskKey,
    providerKey: null,
    integrationId: null,
    isFallback: false,
    reason: 'Fournisseur principal et de secours indisponibles ou non testés. Utilisation de l’adaptateur de démonstration.',
  };
}

/** Records the cost of an AI-routed operation for the FinOps cockpit (spec §19). */
export async function recordAiCost(integrationId: string, organizationId: string | null, operation: string, costCents: number) {
  await db.costRecord.create({
    data: { globalIntegrationId: integrationId, organizationId, operation, costCents },
  });
}
