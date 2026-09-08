import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorialService } from '@/server/services/editorial.service';
import { BrandVoiceService } from '@/server/services/brandvoice.service';
import { RadarService } from '@/server/services/radar.service';

const org1 = 'org-tenant-1';
const org2 = 'org-tenant-2';
const user1 = 'user-1';

// In-memory mock DB for tests
const mockDrafts: Record<string, any> = {};
const mockBrandVoices: Record<string, any> = {};
const mockPublications: Record<string, any> = {};

vi.mock('@/lib/db', () => ({
  db: {
    brandVoice: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; organizationId: string } }) => {
        const bv = mockBrandVoices[where.id];
        if (bv && bv.organizationId === where.organizationId) return bv;
        return null;
      }),
      findMany: vi.fn(async ({ where }: { where: { organizationId: string } }) => {
        return Object.values(mockBrandVoices).filter((b) => b.organizationId === where.organizationId);
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        const id = `bv-${Date.now()}-${Math.random()}`;
        const record = { id, ...data, createdAt: new Date() };
        mockBrandVoices[id] = record;
        return record;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        delete mockBrandVoices[where.id];
        return { id: where.id };
      }),
    },
    draft: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; organizationId: string } }) => {
        const d = mockDrafts[where.id];
        if (d && d.organizationId === where.organizationId) return d;
        return null;
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        const id = `draft-${Date.now()}-${Math.random()}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        mockDrafts[id] = record;
        return record;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: any }) => {
        mockDrafts[where.id] = { ...mockDrafts[where.id], ...data };
        return mockDrafts[where.id];
      }),
    },
    draftVersion: {
      create: vi.fn(async ({ data }: { data: any }) => ({ id: `ver-${Date.now()}`, ...data })),
    },
    socialAccount: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] }; organizationId: string } }) => {
        return [];
      }),
    },
    publication: {
      create: vi.fn(async ({ data }: { data: any }) => ({ id: `pub-${Date.now()}`, ...data })),
    },
    publicationTarget: {
      create: vi.fn(async ({ data }: { data: any }) => ({ id: `target-${Date.now()}`, ...data })),
    },
  },
}));

vi.mock('@/server/services/credits.service', () => ({
  deductCredits: vi.fn(async () => 10),
}));

describe('Editorial & BrandVoice Service - Multi-Tenant Isolation', () => {
  it('generates 5 distinct post variants with valid hooks and CTAs', async () => {
    const variants = await EditorialService.generateVariants({
      organizationId: org1,
      userId: user1,
      topicTitle: 'Nouvelle directive européenne sur l’intelligence artificielle',
      summary: 'Les obligations de transparence entrent en vigueur pour tous les modèles à usage général.',
      network: 'LINKEDIN',
      includeSources: true,
      sourceUrls: ['https://start.app/sources/eu-ai-act'],
    });

    expect(variants).toHaveLength(5);
    expect(variants.map((v) => v.label)).toEqual([
      'concise',
      'expert',
      'executive',
      'pedagogical',
      'high-engagement',
    ]);
    expect(variants[0]!.content).toContain('En 60 secondes');
    expect(variants[1]!.content).toContain('Décryptage approfondi');
    expect(variants[2]!.content).toContain('Perspective Dirigeant');
    expect(variants[3]!.content).toContain('💡 Pourquoi tout le monde parle de');
    expect(variants[4]!.content).toContain('On entend tout et son contraire');
  });

  it('saves a draft scoped strictly to the caller organization', async () => {
    const draft = await EditorialService.saveDraft({
      organizationId: org1,
      userId: user1,
      network: 'LINKEDIN',
      content: 'Contenu test pour le tenant 1',
    });

    expect(draft.id).toBeDefined();
    expect(draft.organizationId).toBe(org1);
  });

  it('CRITICAL: rejects modification of tenant 1 draft when requested under tenant 2 context', async () => {
    const draft = await EditorialService.saveDraft({
      organizationId: org1,
      userId: user1,
      network: 'LINKEDIN',
      content: 'Contenu privé du tenant 1',
    });

    await expect(
      EditorialService.saveDraft({
        organizationId: org2, // tentative d'accès cross-tenant
        userId: 'user-hacker',
        draftId: draft.id,
        network: 'LINKEDIN',
        content: 'Modification frauduleuse',
      }),
    ).rejects.toThrow(/Brouillon introuvable ou accès refusé/);
  });

  it('isolates Brand Voices across tenants', async () => {
    const bv1 = await BrandVoiceService.create({
      organizationId: org1,
      name: 'Voix Officielle Tenant 1',
      values: ['Excellence'],
      preferredVocabulary: ['Innovation'],
      forbiddenTerms: ['Spam'],
      hashtags: ['#Tenant1'],
    });

    expect(bv1.organizationId).toBe(org1);

    // Tenant 2 cannot see Tenant 1's Brand Voice
    const foundByTenant2 = await BrandVoiceService.getById(org2, bv1.id);
    expect(foundByTenant2).toBeNull();

    // Tenant 2 cannot delete Tenant 1's Brand Voice
    await expect(BrandVoiceService.delete(org2, bv1.id)).rejects.toThrow(/Brand Voice introuvable/);
  });

  it('generates weak signals and narrative maps with complete regional perspectives', async () => {
    const signals = await RadarService.getWeakSignals();
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.signalStrength).toBeDefined();

    const narrative = await RadarService.getNarrativeMap('Intelligence Artificielle');
    expect(narrative.perspectives.length).toBe(4);
    expect(narrative.contentGap.length).toBeGreaterThan(0);
    expect(narrative.saturatedAngles.length).toBeGreaterThan(0);
  });
});
