import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveAiRoute, executeRoutedAiTask } from '@/server/services/ai-router.service';

describe('Agent 4 : Dynamic AI Router & Task Execution Engine', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves routing decision gracefully when no DB rule exists', async () => {
    const decision = await resolveAiRoute('STRATEGIC_ANALYSIS');
    expect(decision).toBeDefined();
    expect(decision.taskKey).toBe('STRATEGIC_ANALYSIS');
    expect(decision.reason).toBeDefined();
  });

  it('falls back to demo simulation when providers are not configured', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const execution = await executeRoutedAiTask('CLASSIFICATION', 'Analyse du sentiment de marque', {
      responseJson: true,
    });

    expect(execution).toBeDefined();
    expect(execution.isDemoData).toBe(true);
    expect(execution.result).toHaveProperty('task', 'CLASSIFICATION');
    expect(execution.providerUsed).toBe('mock-ai-router-fallback');
  });

  it('executes text generation with proper format', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const execution = await executeRoutedAiTask('SHORT_SYNTHESIS', 'Synthèse rapide des résultats T3', {
      responseJson: false,
    });

    expect(execution).toBeDefined();
    expect(typeof execution.result).toBe('string');
    expect(execution.result).toContain('SHORT_SYNTHESIS');
  });
});
