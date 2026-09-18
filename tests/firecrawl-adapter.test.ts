import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FirecrawlAdapter,
  MockWebExtractionAdapter,
  getWebExtractionAdapter,
  getFirecrawlAdapter,
  FirecrawlAuthError,
  FirecrawlQuotaError,
} from '@/server/adapters/extraction';

describe('Web Extraction & Firecrawl Adapter Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('MockWebExtractionAdapter', () => {
    const mockAdapter = new MockWebExtractionAdapter();

    it('scrapes a URL into clean Markdown with demo flag', async () => {
      const result = await mockAdapter.scrape('https://example.com/strategie-ia');
      expect(result.url).toBe('https://example.com/strategie-ia');
      expect(result.markdown).toContain('# STRATEGIE IA');
      expect(result.metadata.title).toBeDefined();
      expect(result.isDemoData).toBe(true);
    });

    it('starts and checks a simulated crawl job', async () => {
      const crawl = await mockAdapter.crawl('https://example.com');
      expect(crawl.jobId).toContain('mock-crawl-');
      expect(crawl.status).toBe('completed');

      const status = await mockAdapter.checkCrawlStatus(crawl.jobId);
      expect(status.status).toBe('completed');
      expect(status.data.length).toBeGreaterThan(0);
      expect(status.data[0]?.markdown).toBeDefined();
    });

    it('maps site links with search filters', async () => {
      const map = await mockAdapter.map('https://example.com', { search: 'ia' });
      expect(map.links.length).toBeGreaterThan(0);
      expect(map.links.some((l) => l.includes('ia'))).toBe(true);
    });

    it('extracts structured data matching a schema in mock mode', async () => {
      const schema = {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          confidenceScore: { type: 'number' },
        },
      };

      const result = await mockAdapter.extract('https://example.com', {
        prompt: 'Extraire le titre et la confiance',
        schema,
      });

      expect(result.isDemoData).toBe(true);
      expect(result.data).toHaveProperty('headline');
      expect(result.data).toHaveProperty('confidenceScore', 42);
    });
  });

  describe('FirecrawlAdapter Native Engine', () => {
    it('throws FirecrawlAuthError when no key is found and fallback is disabled', async () => {
      const adapter = new FirecrawlAdapter({
        apiKey: '',
        fallbackToMock: false,
      });

      // Override env to ensure clean test
      const prevEnv = process.env.FIRECRAWL_API_KEY;
      delete process.env.FIRECRAWL_API_KEY;

      await expect(adapter.scrape('https://example.com')).rejects.toThrow(FirecrawlAuthError);

      if (prevEnv) process.env.FIRECRAWL_API_KEY = prevEnv;
    });

    it('falls back to mock when fallbackToMock is enabled and no key is found', async () => {
      const prevEnv = process.env.FIRECRAWL_API_KEY;
      delete process.env.FIRECRAWL_API_KEY;

      const adapter = new FirecrawlAdapter({
        apiKey: '',
        fallbackToMock: true,
      });

      const result = await adapter.scrape('https://example.com');
      expect(result.isDemoData).toBe(true);

      if (prevEnv) process.env.FIRECRAWL_API_KEY = prevEnv;
    });

    it('successfully calls Firecrawl API v1 /scrape with Bearer auth', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            markdown: '# Article de Presse\n\nContenu extrait avec succès.',
            metadata: {
              title: 'Article de Presse',
              description: 'Description de test',
              sourceURL: 'https://example.com/presse',
              statusCode: 200,
            },
            links: ['https://example.com/page-1', 'https://example.com/page-2'],
          },
        }),
      });
      global.fetch = mockFetch;

      const adapter = new FirecrawlAdapter({
        apiKey: 'fc-test-key-123456',
        fallbackToMock: false,
      });

      const result = await adapter.scrape('https://example.com/presse', {
        onlyMainContent: true,
        waitFor: 1000,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call).toBeDefined();
      const [calledUrl, calledInit] = call as [string, { headers: Record<string, string>; method: string; body: string }];
      expect(calledUrl).toBe('https://api.firecrawl.dev/v1/scrape');
      expect(calledInit.headers['Authorization']).toBe('Bearer fc-test-key-123456');
      expect(calledInit.method).toBe('POST');

      const body = JSON.parse(calledInit.body) as { url: string; onlyMainContent: boolean; waitFor: number };
      expect(body.url).toBe('https://example.com/presse');
      expect(body.onlyMainContent).toBe(true);
      expect(body.waitFor).toBe(1000);

      expect(result.isDemoData).toBe(false);
      expect(result.markdown).toContain('# Article de Presse');
      expect(result.links?.length).toBe(2);
    });

    it('handles 429 / 402 quota exceeded with FirecrawlQuotaError', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Plan credit limit reached' }),
      });

      const adapter = new FirecrawlAdapter({
        apiKey: 'fc-quota-key',
        fallbackToMock: false,
      });

      await expect(adapter.scrape('https://example.com')).rejects.toThrow(FirecrawlQuotaError);
    });

    it('executes map request to discover domain links', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          links: ['https://example.com/doc-1', 'https://example.com/doc-2'],
        }),
      });

      const adapter = new FirecrawlAdapter({
        apiKey: 'fc-map-key',
      });

      const mapResult = await adapter.map('https://example.com', { search: 'doc' });
      expect(mapResult.links).toEqual(['https://example.com/doc-1', 'https://example.com/doc-2']);
      expect(mapResult.isDemoData).toBe(false);
    });
  });

  describe('Factory Functions', () => {
    it('returns MockWebExtractionAdapter when forceMock is true', () => {
      const adapter = getWebExtractionAdapter({ forceMock: true });
      expect(adapter).toBeInstanceOf(MockWebExtractionAdapter);
    });

    it('returns FirecrawlAdapter instance from getFirecrawlAdapter()', () => {
      const adapter = getFirecrawlAdapter({ apiKey: 'fc-test' });
      expect(adapter).toBeInstanceOf(FirecrawlAdapter);
    });
  });
});
