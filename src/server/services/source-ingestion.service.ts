import { db } from '@/lib/db';
import { getFirecrawlAdapter, type WebExtractionAdapter } from '@/server/adapters/extraction';
import { SourceStatus, SourceType, WorkflowType } from '@prisma/client';

export interface IngestSourceOptions {
  /** Maximum number of articles to extract from the source */
  maxArticles?: number;
  /** Tenant organizationId for tenant-scoped sources and FinOps attribution */
  organizationId?: string;
  /** Search keywords to discover relevant articles via sitemap/domain mapping */
  searchFilter?: string;
}

export interface IngestArticleUrlOptions {
  /** OrganizationId if this article is privately ingested for a specific tenant */
  organizationId?: string;
  /** Optional explicit sourceId to attach the article to */
  sourceId?: string;
}

export interface IngestionResult {
  sourceId: string;
  sourceName: string;
  articlesFound: number;
  articlesSaved: number;
  articleIds: string[];
  lastVerifiedAt: Date;
  isDemoData: boolean;
}

export class SourceIngestionService {
  private static extractionAdapter: WebExtractionAdapter = getFirecrawlAdapter();

  /**
   * Override adapter for testing purposes (e.g. inject MockWebExtractionAdapter)
   */
  static setAdapter(adapter: WebExtractionAdapter) {
    this.extractionAdapter = adapter;
  }

  /**
   * Reset to default Firecrawl adapter
   */
  static resetAdapter() {
    this.extractionAdapter = getFirecrawlAdapter();
  }

  /**
   * Ingests a single article from a URL:
   * 1. Scrapes the page using Firecrawl to get clean markdown and metadata
   * 2. Finds or auto-provisions a matching Source based on the domain
   * 3. Upserts an Article record into the database (storing excerpt, title, canonicalUrl)
   */
  static async ingestArticleUrl(
    url: string,
    options?: IngestArticleUrlOptions,
  ): Promise<{
    articleId: string;
    title: string;
    canonicalUrl: string;
    sourceName: string;
    isDemoData: boolean;
  }> {
    const scrape = await this.extractionAdapter.scrape(url, {
      onlyMainContent: true,
      organizationId: options?.organizationId,
    });

    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace(/^www\./, '');

    // 1. Resolve or create Source
    let source = options?.sourceId
      ? await db.source.findUnique({ where: { id: options.sourceId } })
      : await db.source.findFirst({
          where: {
            OR: [
              { url: { contains: domain } },
              { name: { equals: domain, mode: 'insensitive' } },
            ],
          },
        });

    if (!source) {
      source = await db.source.create({
        data: {
          organizationId: options?.organizationId ?? null,
          name: domain.charAt(0).toUpperCase() + domain.slice(1),
          url: `${parsedUrl.protocol}//${parsedUrl.hostname}`,
          type: SourceType.SPECIALIZED_MEDIA,
          transparencyLevel: 80,
          status: SourceStatus.ACTIVE,
          lastVerifiedAt: new Date(),
        },
      });
    }

    // 2. Prepare excerpt respecting copyright / paywalls
    const rawMarkdown = scrape.markdown || '';
    const cleanExcerpt = rawMarkdown.slice(0, 500).trim();
    const articleTitle = scrape.metadata.title?.trim() || `Article ${domain} (${new Date().toLocaleDateString('fr-FR')})`;
    const publishedAt = scrape.metadata.publishedTime ? new Date(scrape.metadata.publishedTime) : new Date();

    // 3. Upsert Article
    const article = await db.article.upsert({
      where: { canonicalUrl: url },
      create: {
        sourceId: source.id,
        title: articleTitle,
        excerpt: cleanExcerpt,
        canonicalUrl: url,
        language: scrape.metadata.language || 'fr',
        publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      },
      update: {
        title: articleTitle,
        excerpt: cleanExcerpt,
        publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      },
    });

    // Update Source lastVerifiedAt
    await db.source.update({
      where: { id: source.id },
      data: { lastVerifiedAt: new Date() },
    });

    return {
      articleId: article.id,
      title: article.title,
      canonicalUrl: article.canonicalUrl,
      sourceName: source.name,
      isDemoData: scrape.isDemoData,
    };
  }

  /**
   * Ingests a full source:
   * 1. Maps the source domain to discover recent article links
   * 2. Scrapes each candidate URL with Firecrawl
   * 3. Saves extracted articles and links to source
   */
  static async ingestSource(
    sourceId: string,
    options?: IngestSourceOptions,
  ): Promise<IngestionResult> {
    const source = await db.source.findUniqueOrThrow({
      where: { id: sourceId },
    });

    const maxArticles = options?.maxArticles ?? 3;

    // 1. Discover links on the source domain
    let articleUrls: string[] = [];
    try {
      const mapResult = await this.extractionAdapter.map(source.url, {
        limit: maxArticles * 3,
        search: options?.searchFilter,
      });

      // Filter to retain only deep path links (exclude home/contact/legal)
      articleUrls = (mapResult.links || [])
        .filter((link) => {
          try {
            const u = new URL(link);
            const path = u.pathname;
            return path.length > 5 && !['/contact', '/about', '/privacy', '/terms', '/mentions-legales'].includes(path);
          } catch {
            return false;
          }
        })
        .slice(0, maxArticles);
    } catch (err) {
      console.warn(`[SourceIngestionService] Map discovery failed on ${source.url}, fallback to root:`, err);
      articleUrls = [source.url];
    }

    if (articleUrls.length === 0) {
      articleUrls = [source.url];
    }

    // 2. Scrape and persist articles
    const savedArticleIds: string[] = [];
    let isDemoData = false;

    for (const url of articleUrls) {
      try {
        const scraped = await this.extractionAdapter.scrape(url, {
          onlyMainContent: true,
          organizationId: options?.organizationId,
        });

        if (scraped.isDemoData) isDemoData = true;

        const title = scraped.metadata.title?.trim() || `${source.name} — Publication récente`;
        const excerpt = (scraped.markdown || '').slice(0, 500).trim();
        const publishedAt = scraped.metadata.publishedTime ? new Date(scraped.metadata.publishedTime) : new Date();

        const article = await db.article.upsert({
          where: { canonicalUrl: url },
          create: {
            sourceId: source.id,
            title,
            excerpt,
            canonicalUrl: url,
            language: scraped.metadata.language || source.language || 'fr',
            country: source.country,
            publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
          },
          update: {
            title,
            excerpt,
          },
        });

        savedArticleIds.push(article.id);
      } catch (err) {
        console.warn(`[SourceIngestionService] Scrape failed for ${url}:`, err);
      }
    }

    const now = new Date();
    await db.source.update({
      where: { id: source.id },
      data: { lastVerifiedAt: now },
    });

    return {
      sourceId: source.id,
      sourceName: source.name,
      articlesFound: articleUrls.length,
      articlesSaved: savedArticleIds.length,
      articleIds: savedArticleIds,
      lastVerifiedAt: now,
      isDemoData,
    };
  }

  /**
   * Batch ingestion of all active monitored sources for an organization (or globally)
   */
  static async ingestMonitoredSources(options?: {
    organizationId?: string;
    maxPerSource?: number;
  }): Promise<{
    sourcesProcessed: number;
    totalArticlesSaved: number;
    results: IngestionResult[];
  }> {
    const sources = await db.source.findMany({
      where: {
        status: SourceStatus.ACTIVE,
        OR: options?.organizationId
          ? [{ organizationId: null }, { organizationId: options.organizationId }]
          : [{ organizationId: null }],
      },
      take: 10,
    });

    const results: IngestionResult[] = [];
    let totalSaved = 0;

    for (const source of sources) {
      const result = await this.ingestSource(source.id, {
        maxArticles: options?.maxPerSource ?? 2,
        organizationId: options?.organizationId,
      });
      results.push(result);
      totalSaved += result.articlesSaved;
    }

    return {
      sourcesProcessed: sources.length,
      totalArticlesSaved: totalSaved,
      results,
    };
  }
}
