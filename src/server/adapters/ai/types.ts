export interface PostVariantRequest {
  dossierTitle: string;
  dossierSummary: string;
  network: 'LINKEDIN' | 'INSTAGRAM' | 'FACEBOOK' | 'X';
  tone: string;
  brandVoiceName?: string;
}

export interface PostVariant {
  label: 'concise' | 'expert' | 'executive' | 'pedagogical' | 'high-engagement';
  content: string;
  isDemoData: boolean;
}

export interface AiAdapter {
  readonly providerName: string;
  generatePostVariants(req: PostVariantRequest): Promise<PostVariant[]>;
}
