import { describe, it, expect, beforeEach } from 'vitest';
import { MakeOrchestrationGateway, UnauthorizedCallbackError } from '@/server/services/make/gateway.service';
import { WorkflowType, OrchestrationMode, ExecutionStatus } from '@/server/services/make/types';
import { db } from '@/lib/db';
import { getBalance, grantCredits } from '@/server/services/credits.service';
import { CreditReason } from '@prisma/client';

describe('MakeOrchestrationGateway & Data Contract Security', () => {
  const testSecret = 'super_secret_hmac_test_key_12345';
  let testOrgId: string;
  let secondOrgId: string;

  beforeEach(async () => {
    // Ensure test demo org exists
    const org = await db.organization.findFirst();
    if (org) {
      testOrgId = org.id;
    } else {
      const created = await db.organization.create({
        data: {
          slug: `test-org-${Date.now()}`,
          name: 'Test Org',
          owner: {
            create: {
              email: `test-${Date.now()}@stars.app`,
              passwordHash: 'dummy',
            },
          },
        },
      });
      testOrgId = created.id;
    }

    // Ensure a second distinct org exists for tenant isolation tests
    const second = await db.organization.findFirst({ where: { id: { not: testOrgId } } });
    if (second) {
      secondOrgId = second.id;
    } else {
      const createdSecond = await db.organization.create({
        data: {
          slug: `test-second-${Date.now()}`,
          name: 'Second Org',
          owner: {
            create: {
              email: `second-${Date.now()}@stars.app`,
              passwordHash: 'dummy',
            },
          },
        },
      });
      secondOrgId = createdSecond.id;
    }
  });

  it('generates valid HMAC SHA-256 signatures and verifies them reliably', () => {
    const payload = JSON.stringify({ message: 'STARS Orchestration Test', timestamp: Date.now() });
    const signature = MakeOrchestrationGateway.signPayload(payload, testSecret);

    expect(signature).toBeDefined();
    expect(signature).toHaveLength(64); // SHA-256 hex string

    // Signature matches valid payload
    const isValid = MakeOrchestrationGateway.verifySignature(payload, signature, testSecret);
    expect(isValid).toBe(true);

    // Tampered payload fails verification
    const tampered = JSON.stringify({ message: 'STARS Orchestration Hacked' });
    const isTamperedValid = MakeOrchestrationGateway.verifySignature(tampered, signature, testSecret);
    expect(isTamperedValid).toBe(false);

    // Wrong secret fails verification
    const isWrongSecretValid = MakeOrchestrationGateway.verifySignature(payload, signature, 'wrong_key');
    expect(isWrongSecretValid).toBe(false);
  });

  it('strictly rejects callbacks when the tenant does not match the original execution (multi-tenant isolation)', async () => {
    const eventId = `evt_iso_${Date.now()}`;
    const idempotencyKey = `idemp_iso_${Date.now()}`;

    // Create an execution record bound to testOrgId
    await db.makeExecution.create({
      data: {
        eventId,
        correlationId: `corr_${Date.now()}`,
        idempotencyKey,
        tenantId: testOrgId,
        workflow: WorkflowType.TOPIC_ANALYSIS,
        status: ExecutionStatus.PROCESSING,
      },
    });

    // An attacker tries to send a callback claiming the event for secondOrgId
    const forgedCallback = {
      eventId,
      correlationId: `corr_${Date.now()}`,
      idempotencyKey,
      tenantId: secondOrgId, // MISMATCH!
      workflow: WorkflowType.TOPIC_ANALYSIS,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      data: { hacked: true },
    };

    const rawBody = JSON.stringify(forgedCallback);
    // Even with a valid signature, tenant mismatch must be blocked!
    const config = await MakeOrchestrationGateway.getConfiguration();
    const secret = process.env.MAKE_WEBHOOK_SECRET ?? 'stars_make_hmac_secret_default';
    const sig = MakeOrchestrationGateway.signPayload(rawBody, secret);

    await expect(
      MakeOrchestrationGateway.handleCallback(rawBody, sig),
    ).rejects.toThrow(UnauthorizedCallbackError);
  });

  it('rejects callbacks with invalid HMAC signature', async () => {
    const rawBody = JSON.stringify({ eventId: 'non_existent', tenantId: testOrgId });
    await expect(
      MakeOrchestrationGateway.handleCallback(rawBody, 'invalid_signature_hex'),
    ).rejects.toThrow(UnauthorizedCallbackError);
  });

  it('dispatches workflows seamlessly in NATIVE fallback mode without blocking the tenant', async () => {
    // Ensure org has enough credits
    await grantCredits(testOrgId, 20, CreditReason.MANUAL_ADJUSTMENT);
    const balanceBefore = await getBalance(testOrgId);

    const result = await MakeOrchestrationGateway.dispatch({
      tenantId: testOrgId,
      userId: 'test_user_id',
      workflow: WorkflowType.TOPIC_ANALYSIS,
      payload: { topic: 'Intelligence Artificielle en Santé', sources: ['https://example.com/ai-health'] },
      sicCost: 3,
      preferredMode: OrchestrationMode.NATIVE,
    });

    expect(result.status).toBe(ExecutionStatus.COMPLETED);
    expect(result.modeUsed).toBe(OrchestrationMode.NATIVE);
    expect(result.fallbackTriggered).toBe(true);
    expect(result.data).toBeDefined();

    // Verify 3 SIC credits debited
    const balanceAfter = await getBalance(testOrgId);
    expect(balanceAfter).toBe(balanceBefore - 3);
  });

  it('returns idempotent result on duplicate dispatch without double-spending credits', async () => {
    await grantCredits(testOrgId, 20, CreditReason.MANUAL_ADJUSTMENT);
    const idempKey = `dedup_${Date.now()}`;
    const balanceBefore = await getBalance(testOrgId);

    // First dispatch
    const first = await MakeOrchestrationGateway.dispatch({
      tenantId: testOrgId,
      userId: 'test_user',
      workflow: WorkflowType.ILLUSTRATION,
      payload: { prompt: 'Futuristic datacenter' },
      sicCost: 2,
      idempotencyKey: idempKey,
      preferredMode: OrchestrationMode.NATIVE,
    });

    const balanceAfterFirst = await getBalance(testOrgId);
    expect(balanceAfterFirst).toBe(balanceBefore - 2);

    // Replay with exact same idempotency key
    const second = await MakeOrchestrationGateway.dispatch({
      tenantId: testOrgId,
      userId: 'test_user',
      workflow: WorkflowType.ILLUSTRATION,
      payload: { prompt: 'Futuristic datacenter' },
      sicCost: 2,
      idempotencyKey: idempKey,
      preferredMode: OrchestrationMode.NATIVE,
    });

    expect(second.eventId).toBe(first.eventId);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);

    // Balance must NOT have decreased again!
    const balanceAfterSecond = await getBalance(testOrgId);
    expect(balanceAfterSecond).toBe(balanceAfterFirst);
  });
});
