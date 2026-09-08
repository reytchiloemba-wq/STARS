export interface SocialPublishRequest {
  organizationId: string;
  socialAccountExternalId: string;
  /** Decrypted tenant access token for this specific account — never persisted by the connector. */
  accessToken: string;
  network: 'LINKEDIN' | 'INSTAGRAM' | 'FACEBOOK' | 'X';
  content: string;
  mediaUrls: string[];
  idempotencyKey: string;
}

export interface SocialPublishResult {
  success: boolean;
  externalPostId?: string;
  errorMessage?: string;
}

// One connector per network, all behind the same shape, so the publication
// worker never branches on `network` beyond picking the connector instance.
export interface SocialConnector {
  readonly network: 'LINKEDIN' | 'INSTAGRAM' | 'FACEBOOK' | 'X';
  isConfigured(): boolean;
  publish(req: SocialPublishRequest): Promise<SocialPublishResult>;
}
