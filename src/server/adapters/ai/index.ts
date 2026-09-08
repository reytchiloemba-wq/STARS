import type { AiAdapter } from './types';
import { MockAiAdapter } from './mock';

export * from './types';

export function getAiAdapter(): AiAdapter {
  return new MockAiAdapter();
}
