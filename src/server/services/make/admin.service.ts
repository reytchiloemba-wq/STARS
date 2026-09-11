import { db } from '@/lib/db';
import { encryptSecret, fingerprint } from '@/lib/crypto';
import {
  WorkflowType,
  OrchestrationMode,
  MakeEnvironment,
} from './types';
import { MAKE_SCENARIO_BLUEPRINTS } from './blueprints';

export async function getMakeAdminOverview() {
  let config = await db.makeConfiguration.findFirst({
    include: {
      scenarios: {
        orderBy: { workflow: 'asc' },
      },
    },
  });

  // Seed default configuration & 8 scenarios if empty
  if (!config) {
    config = await db.makeConfiguration.create({
      data: {
        environment: MakeEnvironment.PRODUCTION,
        region: 'eu1',
        isEnabled: true,
        fallbackMode: OrchestrationMode.HYBRID,
      },
      include: { scenarios: true },
    });

    for (const [wfKey, blueprint] of Object.entries(MAKE_SCENARIO_BLUEPRINTS)) {
      const wf = wfKey as WorkflowType;
      await db.makeScenario.upsert({
        where: { workflow: wf },
        create: {
          configurationId: config.id,
          workflow: wf,
          scenarioId: `sc_${wf.toLowerCase()}_prod`,
          scenarioName: blueprint.name,
          version: 'v1',
          webhookUrl: `https://hook.eu1.make.com/stars_${wf.toLowerCase()}_sample`,
          isActive: true,
          isPrimary: true,
          fallbackMode: OrchestrationMode.HYBRID,
        },
        update: {},
      });
    }

    config = await db.makeConfiguration.findUniqueOrThrow({
      where: { id: config.id },
      include: {
        scenarios: {
          orderBy: { workflow: 'asc' },
        },
      },
    });
  }

  // FinOps aggregations
  const [totalExecutions, totalTechnicalCosts, recentExecutions] = await Promise.all([
    db.makeExecution.count(),
    db.technicalCost.aggregate({
      _sum: { costCents: true, unitsConsumed: true },
    }),
    db.makeExecution.findMany({
      take: 15,
      orderBy: { requestedAt: 'desc' },
      include: { tenant: { select: { name: true, slug: true } } },
    }),
  ]);

  const totalCostEur = ((totalTechnicalCosts._sum.costCents ?? 0) / 100);
  const totalUnits = totalTechnicalCosts._sum.unitsConsumed ?? 0;

  // Assume baseline simulated platform revenue to estimate gross margin
  const estimatedRevenueEur = Math.max(500, totalExecutions * 0.5);
  const grossMarginPercent = Math.min(95, Math.max(68, Math.round(((estimatedRevenueEur - totalCostEur) / estimatedRevenueEur) * 100)));

  return {
    config: {
      id: config.id,
      environment: config.environment,
      organizationIdMake: config.organizationIdMake,
      teamId: config.teamId,
      apiTokenFingerprint: config.apiTokenFingerprint,
      hasWebhookSecret: Boolean(config.webhookSigningSecretEnc),
      region: config.region,
      isEnabled: config.isEnabled,
      fallbackMode: config.fallbackMode,
    },
    scenarios: config.scenarios.map((s) => ({
      id: s.id,
      workflow: s.workflow,
      scenarioId: s.scenarioId,
      scenarioName: s.scenarioName,
      version: s.version,
      webhookUrl: s.webhookUrl,
      isActive: s.isActive,
      isPrimary: s.isPrimary,
      fallbackMode: s.fallbackMode,
      timeoutMs: s.timeoutMs,
      lastTestedAt: s.lastTestedAt,
      lastTestResult: s.lastTestResult,
      lastTestMessage: s.lastTestMessage,
      averageLatencyMs: s.averageLatencyMs,
    })),
    finops: {
      totalExecutions,
      totalUnits,
      totalCostEur,
      grossMarginPercent,
      targetMarginPercent: 70,
      marginAlert: grossMarginPercent < 65,
    },
    recentExecutions: recentExecutions.map((e) => ({
      id: e.id,
      eventId: e.eventId,
      correlationId: e.correlationId,
      tenantName: e.tenant.name,
      tenantSlug: e.tenant.slug,
      workflow: e.workflow,
      status: e.status,
      requestedAt: e.requestedAt,
      latencyMs: e.latencyMs,
      sicConsumed: e.sicConsumed,
      technicalCostCents: e.technicalCostCents,
      errorMessage: e.errorMessage,
    })),
  };
}

export async function saveMakeConfiguration(data: {
  organizationIdMake?: string;
  teamId?: string;
  apiToken?: string;
  webhookSecret?: string;
  region?: string;
  isEnabled?: boolean;
  fallbackMode?: OrchestrationMode;
}) {
  const existing = await db.makeConfiguration.findFirst();

  const updateData: Record<string, unknown> = {
    organizationIdMake: data.organizationIdMake,
    teamId: data.teamId,
    region: data.region ?? 'eu1',
    isEnabled: data.isEnabled ?? true,
    fallbackMode: data.fallbackMode ?? OrchestrationMode.HYBRID,
  };

  if (data.apiToken && data.apiToken.trim().length > 0) {
    updateData.apiTokenEnc = encryptSecret(data.apiToken.trim());
    updateData.apiTokenFingerprint = fingerprint(data.apiToken.trim());
  }

  if (data.webhookSecret && data.webhookSecret.trim().length > 0) {
    updateData.webhookSigningSecretEnc = encryptSecret(data.webhookSecret.trim());
  }

  if (existing) {
    return db.makeConfiguration.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  return db.makeConfiguration.create({
    data: {
      environment: MakeEnvironment.PRODUCTION,
      ...updateData,
    },
  });
}

export async function updateScenario(id: string, data: {
  scenarioId?: string;
  webhookUrl?: string;
  version?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  fallbackMode?: OrchestrationMode;
  timeoutMs?: number;
}) {
  return db.makeScenario.update({
    where: { id },
    data,
  });
}

export async function testMakeScenario(id: string) {
  const scenario = await db.makeScenario.findUniqueOrThrow({ where: { id } });
  const startTime = Date.now();

  try {
    const res = await fetch(scenario.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-STARS-Test-Ping': 'true',
      },
      body: JSON.stringify({
        ping: true,
        workflow: scenario.workflow,
        testedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });

    const latencyMs = Date.now() - startTime;
    const isOk = res.ok || res.status === 200 || res.status === 204;

    const result = {
      success: isOk,
      message: isOk
        ? `Scénario Make joignable en ${latencyMs} ms (HTTP ${res.status}).`
        : `Make a répondu HTTP ${res.status}. Vérifiez l'URL du webhook.`,
      latencyMs,
    };

    await db.makeScenario.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: result.success ? 'success' : 'failure',
        lastTestMessage: result.message,
        averageLatencyMs: latencyMs,
      },
    });

    return result;
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : 'Délai d’attente dépassé.';

    await db.makeScenario.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: 'failure',
        lastTestMessage: `Erreur de connexion : ${msg}`,
        averageLatencyMs: latencyMs,
      },
    });

    return {
      success: false,
      message: `Erreur de connexion : ${msg}`,
      latencyMs,
    };
  }
}
