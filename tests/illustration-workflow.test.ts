import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { EditorialService } from '@/server/services/editorial.service';
import { grantCredits, getBalance } from '@/server/services/credits.service';
import { CreditReason, MediaKind } from '@prisma/client';
import { NativeAiAdapter } from '@/server/adapters/ai/native';

describe('Illustration Studio & Life Cycle Workflows', () => {
  let testOrgId: string;
  let testUserId: string;

  beforeEach(async () => {
    const createdOrg = await db.organization.create({
      data: {
        slug: `test-illus-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name: 'Illustration Test Org',
        owner: {
          create: {
            email: `owner-illus-${Date.now()}-${Math.floor(Math.random() * 10000)}@stars.app`,
            passwordHash: 'dummy',
          },
        },
      },
      include: { owner: true },
    });
    testOrgId = createdOrg.id;
    testUserId = createdOrg.owner!.id;
  });

  it('generates an illustration with 9:16 TikTok ratio and debits exactly 2 credits', async () => {
    await grantCredits(testOrgId, 10, CreditReason.MANUAL_ADJUSTMENT);
    const balanceBefore = await getBalance(testOrgId);

    const asset = await EditorialService.generateAiIllustration({
      organizationId: testOrgId,
      userId: testUserId,
      prompt: 'Analyse stratégique des marchés boursiers et fintech',
      aspectRatio: '9:16',
    });

    expect(asset).toBeDefined();
    expect(asset.url).toContain('https://');
    expect(asset.kind).toBe(MediaKind.AI_GENERATED);

    const balanceAfter = await getBalance(testOrgId);
    expect(balanceAfter).toBe(balanceBefore - 2);
  });

  it('guarantees zero double-billing when attaching an existing generated asset on draft save', async () => {
    await grantCredits(testOrgId, 10, CreditReason.MANUAL_ADJUSTMENT);

    const asset = await EditorialService.generateAiIllustration({
      organizationId: testOrgId,
      userId: testUserId,
      prompt: 'Cybersécurité et résilience bancaire',
      aspectRatio: '16:9',
    });

    const balanceBeforeSave = await getBalance(testOrgId);

    // Simulate draft save
    const attached = await EditorialService.attachIllustration({
      organizationId: testOrgId,
      userId: testUserId,
      mediaAssetId: asset.id,
      url: asset.url,
      kind: asset.kind,
      aiGenerated: true,
    });

    expect(attached.id).toBe(asset.id);

    const balanceAfterSave = await getBalance(testOrgId);
    expect(balanceAfterSave).toBe(balanceBeforeSave); // STRICTLY EQUAL - NO DOUBLE BILLING
  });

  it('adapter resolves contextual keywords to relevant thematic visual categories', async () => {
    const adapter = new NativeAiAdapter();

    const financeVisual = await adapter.generateIllustration('Banque centrale et investissements financiers', '16:9');
    expect(financeVisual.url).toContain('1590283603385'); // Finance dashboard

    const techVisual = await adapter.generateIllustration('Intelligence artificielle et sécurité informatique', '1:1');
    expect(techVisual.url).toContain('1526374965328'); // Tech matrix
  });
});
