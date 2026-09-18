import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NativeNewsSearchAdapter, getNewsSearchAdapter } from '@/server/adapters/news';
import { db } from '@/lib/db';
import { SourceType, SourceStatus } from '@prisma/client';

describe('Agent 1 : Native News Search & Dossier Synthesis Adapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('factory returns NativeNewsSearchAdapter instance', () => {
    const adapter = getNewsSearchAdapter();
    expect(adapter).toBeInstanceOf(NativeNewsSearchAdapter);
  });

  it('falls back to mock with isDemoData: true when no API keys are present and no local articles exist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const adapter = new NativeNewsSearchAdapter();
    const result = await adapter.search('SujetInconnuSansArticlesDansLaBase123456', {});

    expect(result).toBeDefined();
    expect(result.isDemoData).toBe(true);
    expect(result.claims.length).toBeGreaterThan(0);
    expect(result.thesis.summary).toBeDefined();
    expect(result.antithesis.summary).toBeDefined();
  });

  it('builds a live verified dossier from local ingested articles when available', async () => {
    // 1. Create a source and article in the database
    const source = await db.source.create({
      data: {
        name: `Revue Souveraineté ${Date.now()}`,
        url: `https://revue-ia-${Date.now()}.fr`,
        type: SourceType.SPECIALIZED_MEDIA,
        transparencyLevel: 95,
        status: SourceStatus.ACTIVE,
      },
    });

    const uniqueTag = `quantum-${Date.now()}`;
    await db.article.create({
      data: {
        sourceId: source.id,
        title: `Révolution de l'informatique ${uniqueTag}`,
        excerpt: `Les accélérations récentes sur la technologie ${uniqueTag} permettent de franchir un cap décisif dans les télécommunications sécurisées.`,
        canonicalUrl: `https://revue-ia-${Date.now()}.fr/article-${uniqueTag}`,
        language: 'fr',
        publishedAt: new Date(),
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const adapter = new NativeNewsSearchAdapter();
    const result = await adapter.search(uniqueTag, {});

    expect(result).toBeDefined();
    expect(result.isDemoData).toBe(false);
    expect(result.title).toContain(uniqueTag);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0]?.name).toBe(source.name);
    expect(result.claims.length).toBeGreaterThan(0);
  });

  it('synthesizes live web news when Brave Search responds with articles', async () => {
    const mockBraveFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('api.search.brave.com')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                title: 'L’Europe adopte les normes sur les batteries stationnaires',
                url: 'https://lesechos.fr/batteries-stationnaires-2026',
                description: 'La directive fixe des exigences strictes de recyclage et de transparence carbone.',
                age: 'Hier',
                meta_url: { hostname: 'lesechos.fr' },
              },
              {
                title: 'Marché mondial des batteries sodium-ion en forte hausse',
                url: 'https://usinenouvelle.com/sodium-ion-marche',
                description: 'Les industriels annoncent une réduction de 30% des coûts par rapport au lithium.',
                age: 'Il y a 3 jours',
                meta_url: { hostname: 'usinenouvelle.com' },
              },
            ],
          }),
        };
      }
      return { ok: false };
    });

    global.fetch = mockBraveFetch;

    const prevBrave = process.env.BRAVE_SEARCH_API_KEY;
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    const adapter = new NativeNewsSearchAdapter();
    const dossier = await adapter.search('Batteries sodium-ion', {});

    expect(dossier.isDemoData).toBe(false);
    expect(dossier.sources.length).toBe(2);
    expect(dossier.sources[0]?.url).toBe('https://lesechos.fr/batteries-stationnaires-2026');
    expect(dossier.claims.length).toBeGreaterThan(0);
    expect(dossier.thesis.summary).toBeDefined();
    expect(dossier.antithesis.summary).toBeDefined();

    if (prevBrave) process.env.BRAVE_SEARCH_API_KEY = prevBrave;
    else delete process.env.BRAVE_SEARCH_API_KEY;
  });
});
