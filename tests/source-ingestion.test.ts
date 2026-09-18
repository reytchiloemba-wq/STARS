import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { SourceIngestionService } from '@/server/services/source-ingestion.service';
import { RadarService } from '@/server/services/radar.service';
import { MockWebExtractionAdapter } from '@/server/adapters/extraction/mock';
import { SourceType, SourceStatus } from '@prisma/client';

describe('Source Ingestion & Radar Enrichment via Web Extraction Engine', () => {
  const mockAdapter = new MockWebExtractionAdapter();

  beforeEach(() => {
    SourceIngestionService.setAdapter(mockAdapter);
    RadarService.setAdapter(mockAdapter);
  });

  afterEach(() => {
    SourceIngestionService.resetAdapter();
    RadarService.resetAdapter();
  });

  it('ingests a single article URL and links it to an auto-created or existing source', async () => {
    const testUrl = `https://tech-innovations-2026.com/articles/ia-multimodale-${Date.now()}`;

    const result = await SourceIngestionService.ingestArticleUrl(testUrl);

    expect(result.articleId).toBeDefined();
    expect(result.canonicalUrl).toBe(testUrl);
    expect(result.title).toBeDefined();
    expect(result.sourceName).toBeDefined();

    // Verify record in database
    const savedArticle = await db.article.findUnique({
      where: { id: result.articleId },
      include: { source: true },
    });

    expect(savedArticle).toBeDefined();
    expect(savedArticle?.canonicalUrl).toBe(testUrl);
    expect(savedArticle?.excerpt).toBeDefined();
    expect(savedArticle?.source).toBeDefined();
    expect(savedArticle?.source.lastVerifiedAt).toBeDefined();
  });

  it('ingests a full source by mapping domain links and saving articles', async () => {
    // Create a temporary test source
    const source = await db.source.create({
      data: {
        name: `Revue Test ${Date.now()}`,
        url: `https://revue-test-${Date.now()}.fr`,
        type: SourceType.SPECIALIZED_MEDIA,
        transparencyLevel: 92,
        status: SourceStatus.ACTIVE,
      },
    });

    const ingestionResult = await SourceIngestionService.ingestSource(source.id, {
      maxArticles: 2,
    });

    expect(ingestionResult.sourceId).toBe(source.id);
    expect(ingestionResult.articlesSaved).toBeGreaterThan(0);
    expect(ingestionResult.articleIds.length).toBeGreaterThan(0);

    // Verify articles saved in database
    const articles = await db.article.findMany({
      where: { sourceId: source.id },
    });

    expect(articles.length).toBe(ingestionResult.articlesSaved);
    for (const a of articles) {
      expect(a.title).toBeDefined();
      expect(a.excerpt).toBeDefined();
    }
  });

  it('automatically converts ingested articles into live Radar weak signals with real citations', async () => {
    // 1. Ingest an article
    const testArticleUrl = `https://actu-souverainete-${Date.now()}.eu/directive-ia`;
    await SourceIngestionService.ingestArticleUrl(testArticleUrl);

    // 2. Query weak signals
    const signals = await RadarService.getWeakSignals();

    expect(signals.length).toBeGreaterThan(0);
    const liveSignal = signals.find((s) => s.isDemoData === false);
    expect(liveSignal).toBeDefined();
    expect(liveSignal?.sourceUrl).toBeDefined();
    expect(liveSignal?.sourceName).toBeDefined();
    expect(liveSignal?.velocityScore).toBeGreaterThanOrEqual(50);
  });
});
