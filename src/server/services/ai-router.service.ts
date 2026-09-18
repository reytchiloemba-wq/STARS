import { db } from '@/lib/db';
import { decryptCredentials } from '@/lib/crypto';

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

export interface RoutedAiExecutionOptions {
  systemPrompt?: string;
  responseJson?: boolean;
  organizationId?: string | null;
  temperature?: number;
}

export interface RoutedAiExecutionResult<T = string> {
  result: T;
  decision: RoutingDecision;
  providerUsed: string;
  isDemoData: boolean;
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
export async function recordAiCost(
  integrationId: string,
  organizationId: string | null,
  operation: string,
  costCents: number,
) {
  await db.costRecord.create({
    data: { globalIntegrationId: integrationId, organizationId, operation, costCents },
  });
}

/**
 * Retrieves the operational API key for an active GlobalIntegration
 */
async function getIntegrationApiKey(integrationId: string): Promise<string | null> {
  const integration = await db.globalIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration?.credentialsEnc) return null;

  try {
    const creds = decryptCredentials<Record<string, string>>(integration.credentialsEnc);
    return creds.apiKey || Object.values(creds)[0] || null;
  } catch {
    return null;
  }
}

/**
 * Executes an AI task routed dynamically by the Super Admin's configuration rules.
 * Dispatches to Anthropic, OpenAI, or Gemini with FinOps cost attribution.
 */
export async function executeRoutedAiTask<T = string>(
  taskKey: AiTaskKey,
  prompt: string,
  options?: RoutedAiExecutionOptions,
): Promise<RoutedAiExecutionResult<T>> {
  const decision = await resolveAiRoute(taskKey);

  if (decision.integrationId && decision.providerKey) {
    const apiKey = await getIntegrationApiKey(decision.integrationId);

    if (apiKey) {
      // 1. Anthropic Claude
      if (decision.providerKey === 'anthropic') {
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1500,
              system: options?.systemPrompt,
              messages: [{ role: 'user', content: prompt }],
              temperature: options?.temperature ?? 0.3,
            }),
            signal: AbortSignal.timeout(15000),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.content?.[0]?.text || '';
            const parsed = options?.responseJson ? JSON.parse(text) : text;

            // Estimated cost: ~1.5 cent per Claude Sonnet query
            await recordAiCost(decision.integrationId, options?.organizationId ?? null, taskKey, 1.5).catch(() => {});

            return {
              result: parsed as T,
              decision,
              providerUsed: 'anthropic',
              isDemoData: false,
            };
          }
        } catch {
          // Fall through on error
        }
      }

      // 2. OpenAI
      if (decision.providerKey === 'openai') {
        try {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                { role: 'user', content: prompt },
              ],
              response_format: options?.responseJson ? { type: 'json_object' } : undefined,
              temperature: options?.temperature ?? 0.3,
            }),
            signal: AbortSignal.timeout(12000),
          });

          if (res.ok) {
            const json = await res.json();
            const text = json.choices?.[0]?.message?.content || '';
            const parsed = options?.responseJson ? JSON.parse(text) : text;

            // Estimated cost: ~0.5 cent per GPT-4o-mini query
            await recordAiCost(decision.integrationId, options?.organizationId ?? null, taskKey, 0.5).catch(() => {});

            return {
              result: parsed as T,
              decision,
              providerUsed: 'openai',
              isDemoData: false,
            };
          }
        } catch {
          // Fall through on error
        }
      }

      // 3. Google Gemini
      if (decision.providerKey === 'gemini') {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${options?.systemPrompt ? `${options.systemPrompt}\n\n` : ''}${prompt}` }] }],
              generationConfig: options?.responseJson ? { responseMimeType: 'application/json' } : undefined,
            }),
            signal: AbortSignal.timeout(12000),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const parsed = options?.responseJson ? JSON.parse(text) : text;

            // Estimated cost: ~0.4 cent per Gemini Flash query
            await recordAiCost(decision.integrationId, options?.organizationId ?? null, taskKey, 0.4).catch(() => {});

            return {
              result: parsed as T,
              decision,
              providerUsed: 'gemini',
              isDemoData: false,
            };
          }
        } catch {
          // Fall through on error
        }
      }
    }
  }

  // Fallback demo simulation
  const mockResult = options?.responseJson
    ? ({
        status: 'ANALYZED',
        task: taskKey,
        summary: `Résultat simulé en mode démonstration pour la tâche ${taskKey}.`,
        confidence: 85,
      } as unknown as T)
    : (`[Mode Démonstration] Exécution de la tâche ${taskKey} pour : ${prompt.slice(0, 80)}…` as unknown as T);

  return {
    result: mockResult,
    decision,
    providerUsed: 'mock-ai-router-fallback',
    isDemoData: true,
  };
}
