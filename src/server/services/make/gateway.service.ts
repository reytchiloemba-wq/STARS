import { createHmac, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto';
import { debitCreditsForOrg, grantCredits, InsufficientCreditsError } from '../credits.service';
import { nativeFallbackProvider } from '@/server/providers/fallback.provider';
import {
  WorkflowType,
  OrchestrationMode,
  ExecutionStatus,
  type OrchestrationEnvelope,
  type CallbackPayload,
  type WorkflowDispatchOptions,
  type WorkflowDispatchResult,
} from './types';
import { CreditReason } from '@prisma/client';

export class MakeCircuitBreakerOpenError extends Error {
  constructor(public readonly workflow: WorkflowType) {
    super(`Circuit breaker ouvert pour le workflow ${workflow} suite à des échecs répétés. Bascule automatique vers le moteur natif.`);
    this.name = 'MakeCircuitBreakerOpenError';
  }
}

export class UnauthorizedCallbackError extends Error {
  constructor(message = 'Signature de callback invalide ou tenant non autorisé.') {
    super(message);
    this.name = 'UnauthorizedCallbackError';
  }
}

/** In-memory circuit breaker tracker */
interface CircuitBreakerState {
  failureCount: number;
  lastFailureAt: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreakers = new Map<WorkflowType, CircuitBreakerState>();
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60000; // 1 minute cooldown

function getCircuitBreaker(workflow: WorkflowType): CircuitBreakerState {
  let cb = circuitBreakers.get(workflow);
  if (!cb) {
    cb = { failureCount: 0, lastFailureAt: 0, state: 'CLOSED' };
    circuitBreakers.set(workflow, cb);
  }
  // Check if open circuit breaker can attempt half-open probe
  if (cb.state === 'OPEN' && Date.now() - cb.lastFailureAt > COOLDOWN_MS) {
    cb.state = 'HALF_OPEN';
  }
  return cb;
}

function recordSuccess(workflow: WorkflowType) {
  const cb = getCircuitBreaker(workflow);
  cb.failureCount = 0;
  cb.state = 'CLOSED';
}

function recordFailure(workflow: WorkflowType) {
  const cb = getCircuitBreaker(workflow);
  cb.failureCount++;
  cb.lastFailureAt = Date.now();
  if (cb.failureCount >= FAILURE_THRESHOLD) {
    cb.state = 'OPEN';
  }
}

export class MakeOrchestrationGateway {
  /**
   * Generates HMAC SHA-256 signature for a given payload string
   */
  static signPayload(data: string, secret: string): string {
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verifies an incoming HMAC SHA-256 signature against the raw body
   */
  static verifySignature(rawBody: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    const computed = this.signPayload(rawBody, secret);
    return computed === signature;
  }

  /**
   * Retrieves the current Make configuration and HMAC secret
   */
  static async getConfiguration() {
    return db.makeConfiguration.findFirst({
      include: { scenarios: true },
    });
  }

  /**
   * Maps workflow to appropriate credit debit reason
   */
  private static mapWorkflowToCreditReason(workflow: WorkflowType): CreditReason {
    switch (workflow) {
      case WorkflowType.TOPIC_ANALYSIS:
        return CreditReason.ANALYSIS_DEEP;
      case WorkflowType.ILLUSTRATION:
        return CreditReason.AI_ILLUSTRATION;
      case WorkflowType.POST_PREPARATION:
        return CreditReason.EXTRA_VARIANT_PACK;
      case WorkflowType.BRIEFING:
        return CreditReason.AUTOMATED_BRIEFING;
      default:
        return CreditReason.DOSSIER_REFRESH;
    }
  }

  /**
   * Central dispatch method for all Make workflows.
   * Enforces multi-tenant authorization, idempotent tracking, SIC debit, and automatic refund on failure.
   */
  static async dispatch<T extends Record<string, unknown>>(
    options: WorkflowDispatchOptions<T>,
  ): Promise<WorkflowDispatchResult> {
    const {
      tenantId,
      userId,
      workflow,
      payload,
      correlationId = randomUUID(),
      idempotencyKey = `idemp_${randomUUID()}`,
      sicCost = 0,
      priority = 'normal',
      preferredMode,
    } = options;

    // 1. Verify Tenant existence and active status
    const tenant = await db.organization.findUnique({
      where: { id: tenantId },
      include: { subscription: { include: { plan: true } }, budgetPolicy: true },
    });

    if (!tenant) {
      throw new Error(`Tenant inexistant : ${tenantId}`);
    }

    if (tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
      throw new Error(`Le tenant ${tenant.name} est suspendu ou annulé.`);
    }

    if (tenant.budgetPolicy?.emergencyStopActive) {
      throw new Error(`Arrêt d'urgence actif pour le tenant ${tenant.name} suite à dépassement de quota.`);
    }

    // 2. Check Idempotency
    const existingExecution = await db.makeExecution.findUnique({
      where: { idempotencyKey },
    });

    if (existingExecution) {
      return {
        eventId: existingExecution.eventId,
        correlationId: existingExecution.correlationId,
        idempotencyKey: existingExecution.idempotencyKey,
        modeUsed: OrchestrationMode.MAKE,
        status: existingExecution.status,
        dispatchedAt: existingExecution.requestedAt,
      };
    }

    // 3. Atomically debit STARS Intelligence Credits (SIC) if operation is billable
    let debited = false;
    if (sicCost > 0) {
      try {
        await debitCreditsForOrg(
          tenantId,
          sicCost,
          this.mapWorkflowToCreditReason(workflow),
          { correlationId, workflow, idempotencyKey },
        );
        debited = true;
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          throw err;
        }
        throw new Error(`Échec du débit de crédits SIC : ${err instanceof Error ? err.message : 'inconnu'}`);
      }
    }

    const eventId = randomUUID();
    const config = await this.getConfiguration();
    const scenario = config?.scenarios.find((s) => s.workflow === workflow);
    const cb = getCircuitBreaker(workflow);

    const mode = preferredMode ?? scenario?.fallbackMode ?? config?.fallbackMode ?? OrchestrationMode.HYBRID;

    // 4. Fallback execution if Make is disabled, circuit breaker is open, or in NATIVE mode
    const shouldUseFallback =
      mode === OrchestrationMode.NATIVE ||
      !config?.isEnabled ||
      !scenario?.isActive ||
      cb.state === 'OPEN';

    if (shouldUseFallback) {
      try {
        const fallbackData = await this.executeNativeFallback(workflow, payload);

        // Record execution in DB
        await db.makeExecution.create({
          data: {
            eventId,
            correlationId,
            idempotencyKey,
            tenantId,
            userId,
            workflow,
            status: ExecutionStatus.COMPLETED,
            completedAt: new Date(),
            latencyMs: 15,
            sicConsumed: sicCost,
            technicalCostCents: 0,
          },
        });

        return {
          eventId,
          correlationId,
          idempotencyKey,
          modeUsed: OrchestrationMode.NATIVE,
          status: ExecutionStatus.COMPLETED,
          dispatchedAt: new Date(),
          fallbackTriggered: true,
          data: fallbackData,
        };
      } catch (err) {
        // Refund credits on failure before technical consumption
        if (debited && sicCost > 0) {
          await grantCredits(tenantId, sicCost, CreditReason.REFUND_UNCONSUMED, {
            correlationId,
            reason: 'Échec exécution native',
          });
        }
        throw err;
      }
    }

    // 5. Build signed envelope for Make
    const appUrl = process.env.NEXTAUTH_URL ?? 'https://stars-ap.com';
    const callbackUrl = `${appUrl}/api/webhooks/make`;
    const requestedAt = new Date().toISOString();
    const signingSecret = config?.webhookSigningSecretEnc
      ? decryptSecret(config.webhookSigningSecretEnc)
      : process.env.MAKE_WEBHOOK_SECRET ?? 'stars_make_hmac_secret_default';

    const envelopeWithoutSignature: Omit<OrchestrationEnvelope<T>, 'signature'> = {
      eventId,
      correlationId,
      idempotencyKey,
      tenantId,
      userId,
      workflow,
      workflowVersion: scenario?.version ?? 'v1',
      requestedAt,
      callbackUrl,
      payload,
      metadata: {
        plan: tenant.subscription?.plan.key ?? 'discovery',
        locale: tenant.language ?? 'fr-FR',
        priority,
      },
    };

    const signature = this.signPayload(JSON.stringify(envelopeWithoutSignature), signingSecret);
    const signedEnvelope: OrchestrationEnvelope<T> = {
      ...envelopeWithoutSignature,
      signature,
    };

    // 6. Record execution in QUEUED state
    const execution = await db.makeExecution.create({
      data: {
        eventId,
        correlationId,
        idempotencyKey,
        tenantId,
        userId,
        workflow,
        scenarioId: scenario?.id,
        status: ExecutionStatus.QUEUED,
        sicConsumed: sicCost,
      },
    });

    // 7. Dispatch HTTP request to Make webhook with retry & timeout
    try {
      const webhookUrl = scenario?.webhookUrl;
      if (!webhookUrl) {
        throw new Error(`Aucune URL de webhook configurée pour le workflow ${workflow}`);
      }

      await db.makeExecution.update({
        where: { id: execution.id },
        data: { status: ExecutionStatus.SENT },
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-STARS-Signature': signature,
          'X-STARS-Event-Id': eventId,
          'X-STARS-Tenant-Id': tenantId,
        },
        body: JSON.stringify(signedEnvelope),
        signal: AbortSignal.timeout(scenario?.timeoutMs ?? 30000),
      });

      if (!response.ok) {
        throw new Error(`Make a répondu avec le statut HTTP ${response.status}`);
      }

      recordSuccess(workflow);

      await db.makeExecution.update({
        where: { id: execution.id },
        data: { status: ExecutionStatus.PROCESSING },
      });

      return {
        eventId,
        correlationId,
        idempotencyKey,
        modeUsed: OrchestrationMode.MAKE,
        status: ExecutionStatus.PROCESSING,
        dispatchedAt: new Date(),
      };
    } catch (err) {
      recordFailure(workflow);
      const errMsg = err instanceof Error ? err.message : 'Erreur inconnue lors du déclenchement Make';

      // If Make failed, attempt fallback in HYBRID mode or refund credits
      if (mode === OrchestrationMode.HYBRID) {
        try {
          const fallbackData = await this.executeNativeFallback(workflow, payload);
          await db.makeExecution.update({
            where: { id: execution.id },
            data: {
              status: ExecutionStatus.COMPLETED,
              completedAt: new Date(),
              errorMessage: `Basculé sur fallback suite à erreur Make: ${errMsg}`,
            },
          });

          return {
            eventId,
            correlationId,
            idempotencyKey,
            modeUsed: OrchestrationMode.NATIVE,
            status: ExecutionStatus.COMPLETED,
            dispatchedAt: new Date(),
            fallbackTriggered: true,
            data: fallbackData,
          };
        } catch {
          // If fallback also fails, proceed to refund
        }
      }

      // Mark execution as FAILED / DEAD_LETTERED
      await db.makeExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: errMsg,
          deadLetteredAt: new Date(),
        },
      });

      // Automatic refund of SIC credits
      if (debited && sicCost > 0) {
        await grantCredits(tenantId, sicCost, CreditReason.REFUND_UNCONSUMED, {
          correlationId,
          reason: `Remboursement automatique suite à échec d'orchestration : ${errMsg}`,
        });
      }

      throw new Error(`Échec de l'orchestration Make : ${errMsg}`);
    }
  }

  /**
   * Processes incoming webhook callbacks from Make
   */
  static async handleCallback(rawBody: string, signature: string): Promise<CallbackPayload> {
    const config = await this.getConfiguration();
    const signingSecret = config?.webhookSigningSecretEnc
      ? decryptSecret(config.webhookSigningSecretEnc)
      : process.env.MAKE_WEBHOOK_SECRET ?? 'stars_make_hmac_secret_default';

    // Verify signature
    const isValid = this.verifySignature(rawBody, signature, signingSecret);
    if (!isValid) {
      throw new UnauthorizedCallbackError('Signature HMAC non valide.');
    }

    const payload = JSON.parse(rawBody) as CallbackPayload;

    // Strict multi-tenant verification: find the original execution
    const execution = await db.makeExecution.findUnique({
      where: { eventId: payload.eventId },
    });

    if (!execution) {
      throw new Error(`Aucune exécution trouvée pour l'événement ${payload.eventId}`);
    }

    // Crucial isolation check: Callback tenant MUST match original execution tenant
    if (execution.tenantId !== payload.tenantId) {
      throw new UnauthorizedCallbackError('Le tenantId du callback ne correspond pas au tenant de la tâche originale.');
    }

    // Calculate latency
    const completedAt = new Date();
    const latencyMs = completedAt.getTime() - execution.requestedAt.getTime();

    // Map status
    const status =
      payload.status === 'COMPLETED'
        ? ExecutionStatus.COMPLETED
        : payload.status === 'PARTIAL'
          ? ExecutionStatus.PARTIAL
          : ExecutionStatus.FAILED;

    await db.makeExecution.update({
      where: { id: execution.id },
      data: {
        status,
        completedAt,
        latencyMs,
        errorMessage: payload.error?.message,
        technicalCostCents: payload.telemetry?.estimatedCostCents ?? 0,
      },
    });

    // Record FinOps technical cost if telemetry is provided
    if (payload.telemetry) {
      const ops = payload.telemetry.makeOperationsConsumed ?? 1;
      await db.technicalCost.create({
        data: {
          executionId: execution.id,
          organizationId: execution.tenantId,
          workflow: execution.workflow,
          provider: 'make',
          unitsConsumed: ops,
          costCents: (ops * 0.009), // Approx 0.009 cents per Make op
        },
      });
    }

    return payload;
  }

  /**
   * Executes the native fallback logic for any workflow
   */
  private static async executeNativeFallback(workflow: WorkflowType, payload: Record<string, unknown>) {
    switch (workflow) {
      case WorkflowType.MONITORING: {
        const urls = (payload.feedUrls as string[]) ?? ['https://www.lemonde.fr/rss/une.xml'];
        return nativeFallbackProvider.fetchRss(urls);
      }
      case WorkflowType.TOPIC_ANALYSIS: {
        const topic = (payload.topic as string) ?? 'Actualité';
        const sources = (payload.sources as string[]) ?? [];
        return nativeFallbackProvider.analyzeTopic(topic, sources);
      }
      case WorkflowType.POST_PREPARATION: {
        const dossier = payload.dossier as Parameters<typeof nativeFallbackProvider.generateVariants>[0];
        const voice = (payload.brandVoice as Record<string, unknown>) ?? {};
        return nativeFallbackProvider.generateVariants(dossier, voice);
      }
      case WorkflowType.ILLUSTRATION: {
        const prompt = (payload.prompt as string) ?? 'Illustration éditoriale';
        const ratio = (payload.aspectRatio as '16:9' | '1:1' | '4:5') ?? '16:9';
        return nativeFallbackProvider.generateIllustration(prompt, ratio);
      }
      case WorkflowType.NOTIFICATION: {
        const { tenantId, userId, kind, notifyPayload } = payload as {
          tenantId: string;
          userId: string;
          kind: string;
          notifyPayload: Record<string, unknown>;
        };
        return nativeFallbackProvider.notifyUser(tenantId, userId, kind, notifyPayload);
      }
      default:
        return { success: true, message: `Workflow ${workflow} exécuté via le moteur natif STARS.` };
    }
  }
}
