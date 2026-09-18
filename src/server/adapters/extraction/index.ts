import type { WebExtractionAdapter } from './types';
import { FirecrawlAdapter, type FirecrawlAdapterConfig } from './firecrawl';
import { MockWebExtractionAdapter } from './mock';

export * from './types';
export * from './firecrawl';
export * from './mock';

export interface WebExtractionFactoryOptions extends FirecrawlAdapterConfig {
  forceMock?: boolean;
}

/**
 * Returns the configured web extraction adapter.
 * If forceMock is set to true, or if explicitly requested, returns MockWebExtractionAdapter.
 * Otherwise, returns the production FirecrawlAdapter that pulls credentials dynamically from
 * environment or the Super Admin encrypted vault.
 */
export function getWebExtractionAdapter(options?: WebExtractionFactoryOptions): WebExtractionAdapter {
  if (options?.forceMock) {
    return new MockWebExtractionAdapter();
  }

  return new FirecrawlAdapter({
    apiKey: options?.apiKey,
    apiUrl: options?.apiUrl,
    fallbackToMock: options?.fallbackToMock ?? true,
  });
}

/**
 * Convenience alias specifically for Firecrawl
 */
export function getFirecrawlAdapter(options?: FirecrawlAdapterConfig): FirecrawlAdapter {
  return new FirecrawlAdapter(options);
}
