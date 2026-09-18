export type ExtractionFormat = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot';

export interface ScrapeOptions {
  /** Output formats desired (default: ['markdown']) */
  formats?: ExtractionFormat[];
  /** Only extract the main content, stripping navigation, headers, footers (default: true) */
  onlyMainContent?: boolean;
  /** Wait time in milliseconds before extracting content (e.g. for client-side JS rendering) */
  waitFor?: number;
  /** Custom request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Optional tenant organizationId for FinOps cost attribution */
  organizationId?: string;
  /** Optional execution/workflow correlation ID */
  executionId?: string;
}

export interface ScrapeMetadata {
  title?: string;
  description?: string;
  language?: string;
  sourceURL?: string;
  statusCode?: number;
  author?: string;
  publishedTime?: string;
  ogImage?: string;
  [key: string]: unknown;
}

export interface ScrapeResult {
  url: string;
  markdown: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  metadata: ScrapeMetadata;
  creditsUsed?: number;
  isDemoData: boolean;
}

export interface CrawlOptions {
  /** Maximum number of pages to crawl (default: 10) */
  limit?: number;
  /** Maximum link depth from root URL */
  maxDepth?: number;
  /** List of URL patterns to include (regex or glob) */
  includePaths?: string[];
  /** List of URL patterns to exclude */
  excludePaths?: string[];
  /** Scrape options to apply to every crawled page */
  scrapeOptions?: Omit<ScrapeOptions, 'organizationId' | 'executionId'>;
  /** Optional tenant organizationId for FinOps cost attribution */
  organizationId?: string;
}

export interface CrawlJobResult {
  jobId: string;
  url: string;
  status: 'pending' | 'scraping' | 'completed' | 'failed';
  isDemoData: boolean;
}

export interface CrawlStatusResult {
  jobId: string;
  status: 'pending' | 'scraping' | 'completed' | 'failed' | 'cancelled';
  total: number;
  completed: number;
  creditsUsed?: number;
  expiresAt?: string;
  data: ScrapeResult[];
  isDemoData: boolean;
}

export interface MapOptions {
  /** Search query to filter relevant URLs across the sitemap/domain */
  search?: string;
  /** Maximum URLs to return */
  limit?: number;
  /** Ignore XML sitemap and crawl domain directly */
  ignoreSitemap?: boolean;
}

export interface MapResult {
  links: string[];
  isDemoData: boolean;
}

export interface ExtractOptions<T = unknown> {
  /** Natural language extraction instruction/prompt */
  prompt: string;
  /** JSON Schema describing the expected structure */
  schema: Record<string, unknown>;
  /** Optional tenant organizationId for FinOps cost attribution */
  organizationId?: string;
}

export interface ExtractResult<T = unknown> {
  data: T;
  rawMarkdown?: string;
  isDemoData: boolean;
}

export interface WebExtractionAdapter {
  readonly providerName: string;

  /**
   * Scrapes a single URL and converts its content to clean Markdown and structured metadata
   */
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult>;

  /**
   * Starts an asynchronous crawl across a domain/subpath
   */
  crawl(url: string, options?: CrawlOptions): Promise<CrawlJobResult>;

  /**
   * Checks the progress or retrieves completed pages of an ongoing crawl job
   */
  checkCrawlStatus(jobId: string): Promise<CrawlStatusResult>;

  /**
   * Maps all accessible URLs and sitemap links for a given domain
   */
  map(url: string, options?: MapOptions): Promise<MapResult>;

  /**
   * Extracts structured data matching a specific JSON Schema directly from a URL
   */
  extract<T = unknown>(url: string, options: ExtractOptions<T>): Promise<ExtractResult<T>>;
}
