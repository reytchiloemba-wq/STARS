import type { SocialConnector } from './types';
import { LinkedInConnector, FacebookConnector, InstagramConnector, XConnector } from './real';

export * from './types';

const registry: Record<SocialConnector['network'], SocialConnector> = {
  LINKEDIN: new LinkedInConnector(),
  INSTAGRAM: new InstagramConnector(),
  FACEBOOK: new FacebookConnector(),
  X: new XConnector(),
};

export function getSocialConnector(network: SocialConnector['network']): SocialConnector {
  return registry[network];
}
