import type {
  WebExtractionAdapter,
  ScrapeOptions,
  ScrapeResult,
  CrawlOptions,
  CrawlJobResult,
  CrawlStatusResult,
  MapOptions,
  MapResult,
  ExtractOptions,
  ExtractResult,
} from './types';

export class MockWebExtractionAdapter implements WebExtractionAdapter {
  readonly providerName = 'Mock Web Extraction Adapter';

  async scrape(url: string, _options?: ScrapeOptions): Promise<ScrapeResult> {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const pathSlug = parsed.pathname.replace(/^\/|\/$/g, '').replace(/[\/-]/g, ' ') || 'Accueil';

    return {
      url,
      markdown: `# ${pathSlug.toUpperCase()} — ${domain}

## Aperçu Stratégique
Ce document a été extrait via l'adaptateur de démonstration STARS. Il synthétise les points clés de la page cible pour alimenter le radar de veille éditoriale et la génération de contenu.

### Points Clés
- **Souveraineté & Performance** : Analyse comparative des standards actuels et opportunités de marché.
- **Impact Opérationnel** : Recommandations adaptées aux directions de communication et de contenu.
- **Chiffres Repères** : Plus de 45% de gain d'engagement observé sur les formats synthétiques qualifiés.

> *Extrait certifié par STARS Extraction Adapter (mode démonstration).*
`,
      metadata: {
        title: `${pathSlug} — ${domain}`,
        description: `Synthèse analytique extraite depuis ${domain} pour la veille stratégique STARS.`,
        sourceURL: url,
        statusCode: 200,
        language: 'fr',
        author: 'Rédaction STARS Intelligence',
        publishedTime: new Date().toISOString(),
      },
      creditsUsed: 1,
      isDemoData: true,
    };
  }

  async crawl(url: string, options?: CrawlOptions): Promise<CrawlJobResult> {
    const mockId = `mock-crawl-${Date.now()}`;
    return {
      jobId: mockId,
      url,
      status: 'completed',
      isDemoData: true,
    };
  }

  async checkCrawlStatus(jobId: string): Promise<CrawlStatusResult> {
    const mockPages: ScrapeResult[] = [
      {
        url: 'https://example.com/actualites/ia-2026',
        markdown: '# Actualités IA 2026\n\nSynthèse des tendances majeures de l’intelligence artificielle.',
        metadata: { title: 'Tendances IA 2026', statusCode: 200 },
        isDemoData: true,
      },
      {
        url: 'https://example.com/analyses/souverainete-donnees',
        markdown: '# Souveraineté des données\n\nAnalyse des régulations européennes récentes.',
        metadata: { title: 'Souveraineté des données', statusCode: 200 },
        isDemoData: true,
      },
    ];

    return {
      jobId,
      status: 'completed',
      total: mockPages.length,
      completed: mockPages.length,
      creditsUsed: mockPages.length,
      data: mockPages,
      isDemoData: true,
    };
  }

  async map(url: string, options?: MapOptions): Promise<MapResult> {
    const parsed = new URL(url);
    const origin = parsed.origin;
    const search = options?.search?.toLowerCase() || '';

    const allLinks = [
      `${origin}/`,
      `${origin}/actualites`,
      `${origin}/actualites/ia-generative`,
      `${origin}/actualites/technologie-2026`,
      `${origin}/dossiers/strategie-editoriale`,
      `${origin}/a-propos`,
      `${origin}/contact`,
    ];

    const filtered = search ? allLinks.filter((l) => l.toLowerCase().includes(search)) : allLinks;

    return {
      links: filtered.slice(0, options?.limit ?? 10),
      isDemoData: true,
    };
  }

  async extract<T = unknown>(url: string, options: ExtractOptions<T>): Promise<ExtractResult<T>> {
    // Generate mock object based on schema properties
    const mockData: Record<string, unknown> = {};
    if (options.schema && typeof options.schema === 'object' && 'properties' in options.schema) {
      const props = options.schema.properties as Record<string, { type?: string }>;
      for (const [key, meta] of Object.entries(props)) {
        if (meta.type === 'string') mockData[key] = `Donnée extraite : ${key}`;
        else if (meta.type === 'number') mockData[key] = 42;
        else if (meta.type === 'boolean') mockData[key] = true;
        else if (meta.type === 'array') mockData[key] = [`Exemple ${key} 1`, `Exemple ${key} 2`];
        else mockData[key] = null;
      }
    }

    return {
      data: mockData as T,
      rawMarkdown: `# Données extraites de ${url}\n\nExécution réussie avec le schéma fourni.`,
      isDemoData: true,
    };
  }
}
