import type { NewsSearchAdapter } from './types';
import { MockNewsSearchAdapter } from './mock';

export * from './types';

// No real provider is wired yet (needs a licensed news/RSS/API integration).
// Swap this factory to return a real adapter once credentials exist — every
// caller depends only on the NewsSearchAdapter interface.
export function getNewsSearchAdapter(): NewsSearchAdapter {
  return new MockNewsSearchAdapter();
}
