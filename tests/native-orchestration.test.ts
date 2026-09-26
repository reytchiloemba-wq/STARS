import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { EditorialService } from '@/server/services/editorial.service';
import { getFinOpsOverview } from '@/server/services/finops.service';
import { grantCredits, getBalance } from '@/server/services/credits.service';
import { CreditReason, MediaKind, SocialNetwork } from '@prisma/client';

describe('STARS Native Orchestration & Architecture (Without Make)', () => {
  let testOrgId: string;
  let testUserId: string;

  beforeEach(async () => {
    const org = await db.organization.findFirst({
      include: { owner: true },
    });

    if (org && org.owner) {
      testOrgId = org.id;
      testUserId = org.owner.id;
    } else {
      const createdOrg = await db.organization.create({
        data: {
          slug: `test-native-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: 'Native Test Org',
          owner: {
            create: {
              email: `owner-${Date.now()}@stars.app`,
              passwordHash: 'dummy',
            },
          },
        },
        include: { owner: true },
      });
      testOrgId = createdOrg.id;
      testUserId = createdOrg.owner!.id;
    }
  });

  it('generates 5 distinct, high-standard post variants natively', async () => {
    const variants = await EditorialService.generateVariants({
      organizationId: testOrgId,
      userId: testUserId,
      topicTitle: 'L’essor de l’IA souveraine en Europe',
      summary: 'Les initiatives européennes accélèrent pour garantir l’indépendance technologique et la conformité RGPD.',
      network: SocialNetwork.LINKEDIN,
      objective: 'Positionnement d’expert',
    });

    expect(variants).toHaveLength(5);
    const labels = variants.map((v) => v.label);
    expect(labels).toContain('concise');
    expect(labels).toContain('expert');
    expect(labels).toContain('executive');
    expect(labels).toContain('pedagogical');
    expect(labels).toContain('high-engagement');

    for (const v of variants) {
      expect(v.content.length).toBeGreaterThan(50);
      expect(v.suggestedHook).toBeDefined();
      expect(v.suggestedCta).toBeDefined();
    }
  });

  it('generates 5 distinct, high-standard post variants in English when requested', async () => {
    const variants = await EditorialService.generateVariants({
      organizationId: testOrgId,
      userId: testUserId,
      topicTitle: 'European AI Sovereignty & Data Governance',
      summary: 'EU initiatives accelerate to guarantee technological independence and GDPR compliance.',
      network: SocialNetwork.LINKEDIN,
      objective: 'Executive positioning',
      language: 'en',
    });

    expect(variants).toHaveLength(5);
    const labels = variants.map((v) => v.label);
    expect(labels).toContain('concise');
    expect(labels).toContain('expert');
    expect(labels).toContain('executive');
    expect(labels).toContain('pedagogical');
    expect(labels).toContain('high-engagement');

    const concise = variants.find((v) => v.label === 'concise');
    expect(concise?.name).toBe('Concise Version');
    expect(concise?.suggestedHook).toContain('In 60 seconds:');
    expect(concise?.content).toContain('Key facts:');

    const expert = variants.find((v) => v.label === 'expert');
    expect(expert?.name).toBe('Expert Deep-Dive');
    expect(expert?.suggestedHook).toContain('Strategic & Industry Analysis:');

    const executive = variants.find((v) => v.label === 'executive');
    expect(executive?.name).toBe('Executive / C-Level');
    expect(executive?.suggestedHook).toContain('C-Suite Perspective:');

    for (const v of variants) {
      expect(v.content.length).toBeGreaterThan(50);
      expect(v.suggestedHook).toBeDefined();
      expect(v.suggestedCta).toBeDefined();
    }
  });

  it('generates native AI illustrations, deducts credits and logs technical costs', async () => {
    // Ensure sufficient credits
    await grantCredits(testOrgId, 10, CreditReason.MANUAL_ADJUSTMENT);
    const balanceBefore = await getBalance(testOrgId);

    const asset = await EditorialService.generateAiIllustration({
      organizationId: testOrgId,
      userId: testUserId,
      prompt: 'Visualisation futuriste des flux de données souveraines',
      aspectRatio: '16:9',
      altText: 'Graphique de données stratégiques',
    });

    expect(asset).toBeDefined();
    expect(asset.id).toBeDefined();
    expect(asset.kind).toBe(MediaKind.AI_GENERATED);
    expect(asset.url).toContain('https://');
    expect(asset.aiGenerated).toBe(true);

    // Verify atomic credit debit (2 credits for illustration)
    const balanceAfter = await getBalance(testOrgId);
    expect(balanceAfter).toBe(balanceBefore - 2);

    // Verify FinOps technical cost record created
    const costRecord = await db.technicalCost.findFirst({
      where: { organizationId: testOrgId },
      orderBy: { recordedAt: 'desc' },
    });
    expect(costRecord).toBeDefined();
    expect(costRecord?.unitsConsumed).toBe(1);
    expect(costRecord?.costCents).toBeGreaterThan(0);
  });

  it('calculates FinOps telemetry and preserves gross margin > 70%', async () => {
    const overview = await getFinOpsOverview();

    expect(overview.grossMarginPercent).toBeGreaterThanOrEqual(70);
    expect(overview.targetMarginPercent).toBe(70);
    expect(overview.marginAlert).toBe(false);
    expect(overview.providerBreakdown.length).toBeGreaterThan(0);
    expect(overview.workflowBreakdown.length).toBeGreaterThan(0);
  });
});
