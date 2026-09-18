export interface PostVariantRequest {
  dossierTitle: string;
  dossierSummary: string;
  network: 'LINKEDIN' | 'INSTAGRAM' | 'FACEBOOK' | 'X' | 'TIKTOK';
  tone: string;
  brandVoiceName?: string;
  sourceUrls?: string[];
}

export interface PostVariant {
  label: 'concise' | 'expert' | 'executive' | 'pedagogical' | 'high-engagement';
  name?: string;
  content: string;
  suggestedHook?: string;
  suggestedCta?: string;
  hashtags?: string[];
  isDemoData: boolean;
}

export interface IllustrationResult {
  url: string;
  altText: string;
  provider: string;
  model: string;
  isDemoData: boolean;
}

export interface AiAdapter {
  readonly providerName: string;
  generatePostVariants(req: PostVariantRequest): Promise<PostVariant[]>;
  generateIllustration(prompt: string, aspectRatio?: '16:9' | '1:1' | '4:5'): Promise<IllustrationResult>;
}
