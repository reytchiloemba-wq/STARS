export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  summary?: string;
  language?: string;
  category?: string;
}

export interface AnalysisDossierOutput {
  title: string;
  executiveSummary: string;
  confidenceScore: number;
  facts: string[];
  opinions: string[];
  uncertainties: string[];
  thesis: {
    summary: string;
    strengths: string[];
    limitations: string[];
  };
  antithesis: {
    summary: string;
    strengths: string[];
    limitations: string[];
  };
  citations: Array<{
    title: string;
    url: string;
    quote?: string;
  }>;
}

export interface PostVariant {
  network: 'LINKEDIN' | 'X' | 'INSTAGRAM' | 'FACEBOOK';
  content: string;
  characterCount: number;
  hashtags: string[];
  callToAction: string;
}

export interface ImageGenerationOutput {
  imageUrl: string;
  altText: string;
  aspectRatio: string;
  promptUsed: string;
}

export interface SearchProvider {
  search(query: string, options?: { maxResults?: number; language?: string }): Promise<NewsItem[]>;
}

export interface NewsProvider {
  fetchRss(feedUrls: string[]): Promise<NewsItem[]>;
}

export interface ExtractionProvider {
  extractContent(url: string): Promise<{ title: string; text: string; author?: string; publishedAt?: Date }>;
}

export interface AIProvider {
  analyzeTopic(topic: string, contextSources: string[]): Promise<AnalysisDossierOutput>;
  generateVariants(dossier: AnalysisDossierOutput, brandVoice: Record<string, unknown>): Promise<PostVariant[]>;
}

export interface ImageProvider {
  generateIllustration(prompt: string, aspectRatio: '16:9' | '1:1' | '4:5'): Promise<ImageGenerationOutput>;
}

export interface NotificationProvider {
  notifyUser(tenantId: string, userId: string, kind: string, payload: Record<string, unknown>): Promise<void>;
}
