import { WorkflowType, OrchestrationMode, ExecutionStatus, MakeEnvironment } from '@prisma/client';

export { WorkflowType, OrchestrationMode, ExecutionStatus, MakeEnvironment };

export interface OrchestrationMetadata {
  plan: string;
  locale: string;
  priority: 'high' | 'normal' | 'low';
  tags?: string[];
}

/**
 * Standard signed data contract envelope between STARS and Make.
 * Mandatory fields: eventId, correlationId, idempotencyKey, tenantId, userId, workflow, requestedAt, signature.
 * No sensitive passwords, tenant DB credentials, or third-party secret tokens are ever transmitted.
 */
export interface OrchestrationEnvelope<T = Record<string, unknown>> {
  eventId: string;
  correlationId: string;
  idempotencyKey: string;
  tenantId: string;
  userId: string;
  workflow: WorkflowType;
  workflowVersion: string;
  requestedAt: string;
  callbackUrl: string;
  payload: T;
  metadata: OrchestrationMetadata;
  signature: string;
}

export interface CallbackPayload<T = Record<string, unknown>> {
  eventId: string;
  correlationId: string;
  idempotencyKey: string;
  tenantId: string;
  workflow: WorkflowType;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  completedAt: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
  telemetry?: {
    makeOperationsConsumed?: number;
    aiTokensConsumed?: number;
    searchCallsConsumed?: number;
    durationMs?: number;
    estimatedCostCents?: number;
  };
  signature: string;
}

export interface WorkflowDispatchOptions<T = Record<string, unknown>> {
  tenantId: string;
  userId: string;
  workflow: WorkflowType;
  payload: T;
  correlationId?: string;
  idempotencyKey?: string;
  sicCost?: number;
  priority?: 'high' | 'normal' | 'low';
  preferredMode?: OrchestrationMode;
}

export interface WorkflowDispatchResult {
  eventId: string;
  correlationId: string;
  idempotencyKey: string;
  modeUsed: OrchestrationMode;
  status: ExecutionStatus;
  dispatchedAt: Date;
  fallbackTriggered?: boolean;
  data?: unknown;
}
