import { db } from '@/lib/db';
import { decryptCredentials } from '@/lib/crypto';
import { WorkflowType } from '@prisma/client';
import type {
  WebExtractionAdapter,
  ScrapeOptions,
  ScrapeResult,
  CrawlOptions,
  CrawlJobResult,
  CrawlStatusResult,
  MapOptions,
  MapResult,
  ExtractOptions,
  ExtractResult,
} from './types';
import { MockWebExtractionAdapter } from './mock';

export class FirecrawlError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'FirecrawlError';
    this.statusCode = statusCode;
  }
}

export class FirecrawlAuthError extends FirecrawlError {
  constructor(message = 'Clé API Firecrawl invalide ou non configurée.') {
    super(message, 401);
    this.name = 'FirecrawlAuthError';
  }
}

export class FirecrawlQuotaError extends FirecrawlError {
  constructor(message = 'Quota de requêtes ou crédits Firecrawl épuisé.') {
    super(message, 402);
    this.name = 'FirecrawlQuotaError';
  }
}

export class FirecrawlTimeoutError extends FirecrawlError {
  constructor(message = 'Délai d’attente dépassé lors de l’extraction Firecrawl.') {
    super(message, 408);
    this.name = 'FirecrawlTimeoutError';
  }
}

export interface FirecrawlAdapterConfig {
  apiKey?: string;
  apiUrl?: string;
  fallbackToMock?: boolean;
}

export class FirecrawlAdapter implements WebExtractionAdapter {
  readonly providerName = 'Firecrawl Web Extraction Engine';
  private readonly defaultApiUrl = 'https://api.firecrawl.dev';
  private apiUrl: string;
  private explicitApiKey?: string;
  private fallbackToMock: boolean;
  private mockFallback = new MockWebExtractionAdapter();

  constructor(config?: FirecrawlAdapterConfig) {
    this.apiUrl = config?.apiUrl || process.env.FIRECRAWL_API_URL || this.defaultApiUrl;
    this.explicitApiKey = config?.apiKey;
    this.fallbackToMock = config?.fallbackToMock ?? false;
  }

  /**
   * Resolves the Firecrawl API key dynamically:
   * 1. Constructor parameter
   * 2. Environment variable FIRECRAWL_API_KEY
   * 3. Encrypted vault in GlobalIntegration (Super Admin cockpit)
   */
  async getApiKey(): Promise<string | null> {
    if (this.explicitApiKey && this.explicitApiKey.trim().length > 0) {
      return this.explicitApiKey.trim();
    }

    if (process.env.FIRECRAWL_API_KEY && process.env.FIRECRAWL_API_KEY.trim().length > 0) {
      return process.env.FIRECRAWL_API_KEY.trim();
    }

    try {
      const integration = await db.globalIntegration.findFirst({
        where: {
          provider: { key: 'firecrawl' },
          status: { in: ['OPERATIONAL', 'TESTING', 'DEGRADED'] },
        },
      });

      if (integration?.credentialsEnc) {
        const creds = decryptCredentials<{ apiKey?: string }>(integration.credentialsEnc);
        if (creds?.apiKey && creds.apiKey.trim().length > 0) {
          return creds.apiKey.trim();
        }
      }
    } catch {
      // Safe fallback on database or decryption errors
    }

    return null;
  }

  /**
   * Helper to execute authenticated HTTP requests against Firecrawl API v1
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: unknown,
    timeoutMs = 30000,
  ): Promise<T> {
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      if (this.fallbackToMock) {
        return null as unknown as T;
      }
      throw new FirecrawlAuthError(
        'Aucune clé Firecrawl trouvée. Configurez Firecrawl dans /admin/infrastructure ou définissez FIRECRAWL_API_KEY.',
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `${this.apiUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: { error?: string; message?: string } = {};
        try {
          errorData = await response.json();
        } catch {
          // Response body is not json
        }

        const errorMsg = errorData.error || errorData.message || response.statusText;

        if (response.status === 401 || response.status === 403) {
          throw new FirecrawlAuthError(`Erreur d'authentification Firecrawl (${response.status}) : ${errorMsg}`);
        }
        if (response.status === 402 || response.status === 429) {
          throw new FirecrawlQuotaError(`Limite Firecrawl atteinte (${response.status}) : ${errorMsg}`);
        }

        throw new FirecrawlError(`Échec de l'appel Firecrawl HTTP ${response.status} : ${errorMsg}`, response.status);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof FirecrawlError) {
        throw err;
      }
      if ((err as Error).name === 'AbortError') {
        throw new FirecrawlTimeoutError(`Délai d'attente dépassé (${timeoutMs}ms) lors de l'appel à ${endpoint}.`);
      }
      throw new FirecrawlError(`Erreur réseau Firecrawl : ${(err as Error).message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Tracks FinOps telemetry for attribution when organizationId is provided
   */
  private async trackCost(organizationId?: string, unitsConsumed = 1, executionId?: string): Promise<void> {
    if (!organizationId) return;

    try {
      // Firecrawl standard pricing reference: ~0.5 cent (€0.005) per scrape credit
      const costCents = unitsConsumed * 0.5;

      await db.technicalCost.create({
        data: {
          organizationId,
          executionId,
          workflow: WorkflowType.TOPIC_ANALYSIS,
          provider: 'firecrawl',
          unitsConsumed,
          costCents,
        },
      });
    } catch (err) {
      // FinOps logging should never crash the business logic
      console.warn('[FirecrawlAdapter] FinOps cost record failed:', err);
    }
  }

  /**
   * Scrapes a single URL and converts it into clean, AI-ready Markdown
   */
  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    const apiKey = await this.getApiKey();
    if (!apiKey && this.fallbackToMock) {
      return this.mockFallback.scrape(url, options);
    }

    interface FirecrawlScrapeResponse {
      success: boolean;
      data?: {
        markdown?: string;
        html?: string;
        rawHtml?: string;
        links?: string[];
        metadata?: Record<string, unknown>;
      };
      error?: string;
    }

    const payload = {
      url,
      formats: options?.formats ?? ['markdown'],
      onlyMainContent: options?.onlyMainContent ?? true,
      waitFor: options?.waitFor,
    };

    const res = await this.request<FirecrawlScrapeResponse>(
      '/v1/scrape',
      'POST',
      payload,
      options?.timeoutMs ?? 30000,
    );

    if (!res?.success || !res.data) {
      throw new FirecrawlError(res?.error || 'Aucune donnée retournée par Firecrawl.');
    }

    await this.trackCost(options?.organizationId, 1, options?.executionId);

    return {
      url,
      markdown: res.data.markdown || '',
      html: res.data.html,
      rawHtml: res.data.rawHtml,
      links: res.data.links,
      metadata: (res.data.metadata || {}) as ScrapeResult['metadata'],
      creditsUsed: 1,
      isDemoData: false,
    };
  }

  /**
   * Initiates an asynchronous crawl on a given URL
   */
  async crawl(url: string, options?: CrawlOptions): Promise<CrawlJobResult> {
    const apiKey = await this.getApiKey();
    if (!apiKey && this.fallbackToMock) {
      return this.mockFallback.crawl(url, options);
    }

    interface FirecrawlCrawlStartResponse {
      success: boolean;
      id?: string;
      url?: string;
      error?: string;
    }

    const payload = {
      url,
      limit: options?.limit ?? 10,
      maxDepth: options?.maxDepth,
      includePaths: options?.includePaths,
      excludePaths: options?.excludePaths,
      scrapeOptions: {
        formats: options?.scrapeOptions?.formats ?? ['markdown'],
        onlyMainContent: options?.scrapeOptions?.onlyMainContent ?? true,
      },
    };

    const res = await this.request<FirecrawlCrawlStartResponse>('/v1/crawl', 'POST', payload, 30000);

    if (!res?.success || !res.id) {
      throw new FirecrawlError(res?.error || 'Impossible de démarrer le crawl Firecrawl.');
    }

    return {
      jobId: res.id,
      url,
      status: 'scraping',
      isDemoData: false,
    };
  }

  /**
   * Checks the status and retrieves pages from an active or finished crawl job
   */
  async checkCrawlStatus(jobId: string): Promise<CrawlStatusResult> {
    const apiKey = await this.getApiKey();
    if (!apiKey && this.fallbackToMock) {
      return this.mockFallback.checkCrawlStatus(jobId);
    }

    interface FirecrawlCrawlCheckResponse {
      status: 'scraping' | 'completed' | 'failed' | 'cancelled';
      total?: number;
      completed?: number;
      creditsUsed?: number;
      expiresAt?: string;
      data?: Array<{
        markdown?: string;
        html?: string;
        metadata?: Record<string, unknown>;
      }>;
    }

    const res = await this.request<FirecrawlCrawlCheckResponse>(`/v1/crawl/${jobId}`, 'GET', undefined, 15000);

    const pages: ScrapeResult[] = (res.data || []).map((page) => ({
      url: (page.metadata?.sourceURL as string) || '',
      markdown: page.markdown || '',
      html: page.html,
      metadata: (page.metadata || {}) as ScrapeResult['metadata'],
      isDemoData: false,
    }));

    return {
      jobId,
      status: res.status || 'scraping',
      total: res.total ?? pages.length,
      completed: res.completed ?? pages.length,
      creditsUsed: res.creditsUsed,
      expiresAt: res.expiresAt,
      data: pages,
      isDemoData: false,
    };
  }

  /**
   * Maps all accessible URLs for a domain using Firecrawl map engine
   */
  async map(url: string, options?: MapOptions): Promise<MapResult> {
    const apiKey = await this.getApiKey();
    if (!apiKey && this.fallbackToMock) {
      return this.mockFallback.map(url, options);
    }

    interface FirecrawlMapResponse {
      success: boolean;
      links?: string[];
      error?: string;
    }

    const payload = {
      url,
      search: options?.search,
      limit: options?.limit,
      ignoreSitemap: options?.ignoreSitemap,
    };

    const res = await this.request<FirecrawlMapResponse>('/v1/map', 'POST', payload, 30000);

    if (!res?.success || !Array.isArray(res.links)) {
      throw new FirecrawlError(res?.error || 'Échec du mapping de l’URL via Firecrawl.');
    }

    return {
      links: res.links,
      isDemoData: false,
    };
  }

  /**
   * Extracts structured JSON data matching a JSON Schema from a target URL
   */
  async extract<T = unknown>(url: string, options: ExtractOptions<T>): Promise<ExtractResult<T>> {
    const apiKey = await this.getApiKey();
    if (!apiKey && this.fallbackToMock) {
      return this.mockFallback.extract(url, options);
    }

    interface FirecrawlExtractResponse {
      success: boolean;
      data?: {
        extract?: T;
        markdown?: string;
      };
      error?: string;
    }

    const payload = {
      url,
      formats: ['extract', 'markdown'],
      extract: {
        schema: options.schema,
        prompt: options.prompt,
      },
    };

    const res = await this.request<FirecrawlExtractResponse>('/v1/scrape', 'POST', payload, 45000);

    if (!res?.success || !res.data) {
      throw new FirecrawlError(res?.error || 'Échec de l’extraction structurée Firecrawl.');
    }

    await this.trackCost(options.organizationId, 2);

    return {
      data: (res.data.extract ?? ({} as unknown)) as T,
      rawMarkdown: res.data.markdown,
      isDemoData: false,
    };
  }
}
