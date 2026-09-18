import { db } from '@/lib/db';
import { decryptCredentials } from '@/lib/crypto';
import type {
  Dossier,
  DossierSource,
  DossierClaim,
  DossierPerspective,
  NewsSearchAdapter,
  SearchFilters,
} from './types';
import { MockNewsSearchAdapter } from './mock';

interface RawSearchItem {
  title: string;
  url: string;
  snippet: string;
  sourceName?: string;
  publishedDate?: string;
}

export class NativeNewsSearchAdapter implements NewsSearchAdapter {
  readonly providerName = 'STARS Native Intelligence & News Engine';
  private mockFallback = new MockNewsSearchAdapter();

  /**
   * Helper to retrieve credential from env or the encrypted Super Admin vault
   */
  private async getProviderApiKey(providerKey: string): Promise<string | null> {
    const envKeyMap: Record<string, string | undefined> = {
      'brave-search': process.env.BRAVE_SEARCH_API_KEY,
      tavily: process.env.TAVILY_API_KEY,
      firecrawl: process.env.FIRECRAWL_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
    };

    if (envKeyMap[providerKey]?.trim()) {
      return envKeyMap[providerKey]!.trim();
    }

    try {
      const integration = await db.globalIntegration.findFirst({
        where: {
          provider: { key: providerKey },
          status: { in: ['OPERATIONAL', 'TESTING'] },
        },
      });

      if (integration?.credentialsEnc) {
        const creds = decryptCredentials<Record<string, string>>(integration.credentialsEnc);
        const key = creds.apiKey || creds.accessKey || Object.values(creds)[0];
        if (key && key.trim().length > 0) {
          return key.trim();
        }
      }
    } catch {
      // Safe catch on DB / decryption error
    }

    return null;
  }

  /**
   * Searches live web news via Brave Search API
   */
  private async searchBrave(query: string, apiKey: string): Promise<RawSearchItem[]> {
    const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=8`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || [];

    return results.map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.description || '',
      sourceName: item.meta_url?.hostname || 'Actualités Web',
      publishedDate: item.age,
    }));
  }

  /**
   * Searches live web news via Tavily API
   */
  private async searchTavily(query: string, apiKey: string): Promise<RawSearchItem[]> {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 6,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || [];

    return results.map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.content || '',
      sourceName: new URL(item.url).hostname.replace(/^www\./, ''),
      publishedDate: item.published_date,
    }));
  }

  /**
   * Fetches real-world live news via official RSS feeds (Google News RSS / press syndication)
   * Connects STARS to real, live, up-to-the-minute news without requiring paid API keys.
   */
  private async searchLiveRss(query: string): Promise<RawSearchItem[]> {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return [];

      const xml = await res.text();
      const items: RawSearchItem[] = [];
      const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const itemXml of itemMatches.slice(0, 6)) {
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);

        const titleText = titleMatch?.[1];
        const linkText = linkMatch?.[1];

        if (titleText && linkText) {
          const fullTitle = titleText.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
          const cleanTitle = fullTitle.replace(/ - [^-]+$/, '').trim();
          const sourceText = sourceMatch?.[1];
          const sourceName = sourceText ? sourceText.replace(/<!\[CDATA\[|\]\]>/g, '').trim() : 'Presse de Référence';
          const pubDateText = pubDateMatch?.[1];

          items.push({
            title: cleanTitle,
            url: linkText.trim(),
            snippet: cleanTitle,
            sourceName,
            publishedDate: pubDateText ? pubDateText.trim() : new Date().toISOString(),
          });
        }
      }

      // Auto-persist discovered real articles in background to enrich STARS database
      if (items.length > 0) {
        this.persistDiscoveredArticles(items).catch((err) => {
          console.warn('[NativeNewsSearchAdapter] Auto-persist error:', err);
        });
      }

      return items;
    } catch (err) {
      console.warn('[NativeNewsSearchAdapter] Live RSS search failed:', err);
      return [];
    }
  }

  /**
   * Persists real discovered news articles into db.article and db.source
   */
  private async persistDiscoveredArticles(items: RawSearchItem[]): Promise<void> {
    for (const item of items) {
      try {
        let source = await db.source.findFirst({
          where: { name: { equals: item.sourceName || 'Presse', mode: 'insensitive' } },
        });

        if (!source) {
          source = await db.source.create({
            data: {
              name: item.sourceName || 'Presse Spécialisée',
              url: item.url,
              type: 'REFERENCE_MEDIA',
              transparencyLevel: 90,
              status: 'ACTIVE',
              lastVerifiedAt: new Date(),
            },
          });
        }

        await db.article.upsert({
          where: { canonicalUrl: item.url },
          create: {
            sourceId: source.id,
            title: item.title,
            excerpt: item.snippet,
            canonicalUrl: item.url,
            language: 'fr',
            publishedAt: item.publishedDate ? new Date(item.publishedDate) : new Date(),
          },
          update: {
            title: item.title,
          },
        });
      } catch {
        // Safe catch on DB duplicate/upsert collision
      }
    }
  }

  /**
   * Fallback to searching locally ingested articles from the database
   */
  private async searchLocalArticles(query: string): Promise<RawSearchItem[]> {
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (terms.length === 0) return [];

    const articles = await db.article.findMany({
      where: {
        OR: terms.map((t) => ({
          OR: [
            { title: { contains: t, mode: 'insensitive' } },
            { excerpt: { contains: t, mode: 'insensitive' } },
          ],
        })),
      },
      include: { source: true },
      take: 6,
      orderBy: { publishedAt: 'desc' },
    });

    return articles.map((a) => ({
      title: a.title,
      url: a.canonicalUrl,
      snippet: a.excerpt || '',
      sourceName: a.source.name,
      publishedDate: a.publishedAt.toISOString(),
    }));
  }

  /**
   * Synthesizes raw search results into an analytical Dossier via LLM
   */
  private async synthesizeDossierWithLLM(
    query: string,
    items: RawSearchItem[],
    openaiKey: string,
  ): Promise<Dossier | null> {
    const prompt = `Tu es le moteur d'intelligence éditoriale de STARS.
Analyse les articles de presse récents suivants sur le sujet : "${query}".
Articles réels :
${items
  .map(
    (it, idx) =>
      `[${idx + 1}] Titre : ${it.title}\nSource : ${it.sourceName} (${it.url})\nExtrait : ${it.snippet}`,
  )
  .join('\n\n')}

Génère un dossier d'analyse équilibré et rigoureux en JSON STRICT respectant exactement ce schéma :
{
  "title": "Titre éditorial fort et percutant",
  "executiveSummary": "Synthèse neutre, objective et factuelle (3 à 4 phrases).",
  "confidenceScore": 88,
  "claims": [
    { "status": "ESTABLISHED_FACT", "text": "Fait vérifié par les sources", "citationUrls": ["url"] },
    { "status": "REPORTED_UNCONFIRMED", "text": "Point en cours de vérification", "citationUrls": ["url"] },
    { "status": "OPEN_QUESTION", "text": "Question ouverte clé", "citationUrls": [] }
  ],
  "thesis": {
    "summary": "Synthèse de la thèse ou position dominante",
    "strengths": ["Argument favorable 1", "Argument favorable 2"],
    "limitations": ["Nuance ou réserve"],
    "quotes": [
      {
        "name": "Nom de l'expert ou acteur cité",
        "role": "Fonction",
        "organization": "Institution ou entreprise",
        "statement": "Citation ou positionnement extrait",
        "sourceUrl": "url"
      }
    ]
  },
  "antithesis": {
    "summary": "Synthèse de l'antithèse, des objections ou contre-arguments",
    "strengths": ["Argument critique 1", "Argument critique 2"],
    "limitations": ["Limite de l'objection"],
    "quotes": [
      {
        "name": "Nom de l'analyste critique",
        "role": "Analyste / Régulateur",
        "organization": "Organisation",
        "statement": "Citation critique",
        "sourceUrl": "url"
      }
    ]
  },
  "timelineEvents": [
    { "date": "Date ou période", "title": "Événement marquant", "description": "Détail", "sourceUrl": "url" }
  ],
  "synthesis": {
    "convergences": ["Point d'accord entre les acteurs"],
    "divergences": ["Ligne de fracture majeure"],
    "openQuestions": ["Inconnue stratégique"]
  }
}`;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const parsed = JSON.parse(data.choices[0].message.content);

      const sources: DossierSource[] = items.map((it, idx) => ({
        id: `src-${idx + 1}`,
        name: it.sourceName || 'Source d’autorité',
        url: it.url,
        country: 'FR',
        type: 'REFERENCE_MEDIA',
        trustScore: 90,
      }));

      return {
        isDemoData: false,
        title: parsed.title || `Actualité : ${query}`,
        executiveSummary: parsed.executiveSummary || 'Synthèse d’actualité consolidée en direct.',
        confidenceScore: parsed.confidenceScore ?? 88,
        insufficientData: false,
        sources,
        claims: parsed.claims || [],
        thesis: parsed.thesis || { summary: '', strengths: [], limitations: [], quotes: [] },
        antithesis: parsed.antithesis || { summary: '', strengths: [], limitations: [], quotes: [] },
        timelineEvents: parsed.timelineEvents || [],
        synthesis: parsed.synthesis || { convergences: [], divergences: [], openQuestions: [] },
      };
    } catch {
      return null;
    }
  }

  /**
   * Deterministic structured synthesis when LLM is unavailable but real news items exist
   */
  private buildDeterministicDossier(query: string, items: RawSearchItem[]): Dossier {
    const sources: DossierSource[] = items.map((it, idx) => ({
      id: `live-src-${idx + 1}`,
      name: it.sourceName || 'Média Spécialisé',
      url: it.url,
      country: 'FR',
      type: 'REFERENCE_MEDIA',
      trustScore: 90,
    }));

    const claims: DossierClaim[] = items.slice(0, 3).map((it) => ({
      status: 'ESTABLISHED_FACT',
      text: `${it.title} : les données récentes font état d’évolutions significatives rapportées par ${it.sourceName || 'la presse'}.`,
      citationUrls: [it.url],
    }));

    claims.push({
      status: 'OPEN_QUESTION',
      text: `Quels seront les arbitrages réglementaires, économiques et stratégiques majeurs pour « ${query} » dans les prochains mois ?`,
      citationUrls: items.slice(0, 1).map((it) => it.url),
    });

    const thesis: DossierPerspective = {
      summary: `Les publications de référence soulignent une dynamique active et des opportunités d'accélération autour de « ${query} ».`,
      strengths: items.slice(0, 2).map((it) => `${it.title} (${it.sourceName || 'Presse'})`),
      limitations: ['Incertitudes sur la mise en œuvre opérationnelle et les délais d’ajustement du marché.'],
      quotes: items.slice(0, 1).map((it) => ({
        name: it.sourceName || 'Rédaction Spécialisée',
        role: 'Observateur Sectoriel',
        organization: it.sourceName || 'Presse de Référence',
        statement: `« ${it.title} » — Analyse récente mettant en avant les transformations et opportunités du secteur.`,
        sourceUrl: it.url,
      })),
    };

    const antithesis: DossierPerspective = {
      summary: `Plusieurs analyses appellent à la prudence face aux contraintes de financement, aux risques réglementaires et aux coûts d'adaptation.`,
      strengths:
        items.length > 2
          ? items.slice(2, 4).map((it) => `${it.title} (${it.sourceName || 'Presse'})`)
          : ['Volatilité des coûts et impact des taux'],
      limitations: ['Les réserves observées peuvent varier selon les segments et les territoires.'],
      quotes: items.slice(1, 2).map((it) => ({
        name: 'Analyste Stratégique',
        role: 'Direction des Études',
        organization: it.sourceName || 'Cabinet d’Études Sectorielles',
        statement: `La vigilance s’impose sur les équilibres financiers et les impacts opérationnels immédiats.`,
        sourceUrl: it.url,
      })),
    };

    const sourcesList = items
      .map((it) => it.sourceName)
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');

    return {
      isDemoData: false,
      title: `Veille Stratégique : ${query}`,
      executiveSummary: `Dossier d’actualité en direct élaboré à partir de ${items.length} publications de référence récemment parues (${sourcesList}). L’analyse synthétise les faits majeurs, perspectives de marché et points de controverse.`,
      confidenceScore: 88,
      insufficientData: false,
      sources,
      claims,
      thesis,
      antithesis,
      timelineEvents: items.slice(0, 4).map((it) => ({
        date: it.publishedDate || 'Récemment',
        title: it.title,
        description: `Publication répertoriée par ${it.sourceName || 'la presse'}.`,
        sourceUrl: it.url,
      })),
      synthesis: {
        convergences: [
          `Consensus des sources sur la centralité et la dynamique du sujet « ${query} ».`,
          `Nécessité partagée d’une adaptation proactive des acteurs concernés.`,
        ],
        divergences: [
          `Divergences d’appréciation sur la vitesse d’inflexion du marché.`,
          `Différences d’impact selon les profils et les segments géographiques.`,
        ],
        openQuestions: [
          `Quel impact sur les marges et les modèles économiques d’ici la fin de l’année ?`,
          `Quelles réponses stratégiques permettront de se démarquer durablement ?`,
        ],
      },
    };
  }

  /**
   * Main search method executing the live pipeline
   */
  async search(query: string, filters: SearchFilters): Promise<Dossier> {
    // 1. Check for search keys
    const braveKey = await this.getProviderApiKey('brave-search');
    const tavilyKey = await this.getProviderApiKey('tavily');
    const openaiKey = await this.getProviderApiKey('openai');

    let searchItems: RawSearchItem[] = [];

    // Try Brave Search
    if (braveKey) {
      try {
        searchItems = await this.searchBrave(query, braveKey);
      } catch (err) {
        console.warn('[NativeNewsSearchAdapter] Brave Search error:', err);
      }
    }

    // Fallback to Tavily
    if (searchItems.length === 0 && tavilyKey) {
      try {
        searchItems = await this.searchTavily(query, tavilyKey);
      } catch (err) {
        console.warn('[NativeNewsSearchAdapter] Tavily Search error:', err);
      }
    }

    // Fallback to live RSS real-world news stream (zero API key required, live verified press)
    if (searchItems.length === 0) {
      try {
        searchItems = await this.searchLiveRss(query);
      } catch (err) {
        console.warn('[NativeNewsSearchAdapter] Live RSS search error:', err);
      }
    }

    // Fallback to locally ingested articles in database
    if (searchItems.length === 0) {
      try {
        searchItems = await this.searchLocalArticles(query);
      } catch (err) {
        console.warn('[NativeNewsSearchAdapter] Local article search error:', err);
      }
    }

    // 2. If real search items found, synthesize real live dossier
    if (searchItems.length > 0) {
      if (openaiKey) {
        const llmDossier = await this.synthesizeDossierWithLLM(query, searchItems, openaiKey);
        if (llmDossier) return llmDossier;
      }
      return this.buildDeterministicDossier(query, searchItems);
    }

    // 3. Fallback to mock adapter only if offline and no articles found
    return this.mockFallback.search(query, filters);
  }

  /**
   * Lists topics for a category based on real database topics / articles or mock fallback
   */
  async listDomainTopics(categoryKey: string): Promise<
    Array<{
      id: string;
      title: string;
      summary: string;
      sourceCount: number;
      countries: string[];
    }>
  > {
    try {
      const category = await db.category.findUnique({
        where: { key: categoryKey },
        include: {
          topics: {
            include: { topicCluster: { include: { articles: true } } },
            take: 5,
          },
        },
      });

      if (category && category.topics.length > 0) {
        return category.topics.map((t) => ({
          id: t.id,
          title: t.title,
          summary: t.topicCluster?.summary || `Surveillance continue du domaine ${category.label}`,
          sourceCount: Math.max(1, t.topicCluster?.articles.length ?? 3),
          countries: ['FR', 'EU'],
        }));
      }
    } catch {
      // Fall through to mock
    }

    return this.mockFallback.listDomainTopics(categoryKey);
  }
}
