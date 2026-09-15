import type { AiAdapter } from './types';
import { NativeAiAdapter } from './native';

export * from './types';
export * from './native';
export * from './mock';

export function getAiAdapter(): AiAdapter {
  return new NativeAiAdapter();
}
