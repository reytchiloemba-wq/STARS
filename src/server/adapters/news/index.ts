import type { NewsSearchAdapter } from './types';
import { NativeNewsSearchAdapter } from './native';
import { MockNewsSearchAdapter } from './mock';

export * from './types';
export * from './native';
export * from './mock';

/**
 * Returns the operational News & Veille adapter.
 * Uses NativeNewsSearchAdapter which dynamically taps into Brave Search,
 * Tavily, Firecrawl, and the local article repository with LLM synthesis,
 * gracefully falling back to structured mock data if no search keys are present.
 */
export function getNewsSearchAdapter(): NewsSearchAdapter {
  return new NativeNewsSearchAdapter();
}
