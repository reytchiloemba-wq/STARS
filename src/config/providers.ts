// SINGLE SOURCE OF TRUTH for the provider catalog shown in the Super Admin
// cockpit ("Infrastructure & Connexions", spec §6-9). Seeded into
// `IntegrationProvider` by prisma/seed.ts — the DB row is the queryable
// record, this file is what you edit to add/change a provider definition.

export type ProviderCategory =
  | 'SOCIAL'
  | 'NEWS_SEARCH'
  | 'WEB_EXTRACTION'
  | 'AI'
  | 'ILLUSTRATION'
  | 'PUBLISHING'
  | 'STORAGE';

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  placeholder?: string;
}

export interface ProviderDefinition {
  key: string;
  name: string;
  category: ProviderCategory;
  description: string;
  docsUrl: string;
  isOAuth: boolean;
  isPrimaryCapable: boolean;
  credentialFields: CredentialField[];
  /** How `testGlobalIntegration` (src/server/services/infrastructure.service.ts) verifies this provider actually works. */
  testKind: 'http-fetch' | 'rss-fetch' | 'oauth-format-check' | 'none';
}

export const PROVIDERS: ProviderDefinition[] = [
  // --- Social (OAuth apps — spec §9) ---
  {
    key: 'meta',
    name: 'Meta (Facebook & Instagram)',
    category: 'SOCIAL',
    description: "Publication sur Pages Facebook et comptes Instagram professionnels via l'API Graph.",
    docsUrl: 'https://developers.facebook.com/docs/graph-api',
    isOAuth: true,
    isPrimaryCapable: true,
    credentialFields: [
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
      { key: 'graphApiVersion', label: 'Version Graph API', type: 'text', required: true, placeholder: 'v21.0' },
      { key: 'webhookVerifyToken', label: 'Token de vérification webhook', type: 'password', required: false },
    ],
    testKind: 'oauth-format-check',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    category: 'SOCIAL',
    description: 'Publication sur profils personnels et Pages LinkedIn administrées.',
    docsUrl: 'https://learn.microsoft.com/linkedin/',
    isOAuth: true,
    isPrimaryCapable: true,
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    testKind: 'oauth-format-check',
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    category: 'SOCIAL',
    description: 'Publication de posts et threads via l’API X v2.',
    docsUrl: 'https://developer.x.com/en/docs',
    isOAuth: true,
    isPrimaryCapable: true,
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    testKind: 'oauth-format-check',
  },

  // --- News & search (spec §11) ---
  {
    key: 'brave-search',
    name: 'Brave Search API',
    category: 'NEWS_SEARCH',
    description: 'Moteur de recherche économique pour la découverte de sujets.',
    docsUrl: 'https://brave.com/search/api/',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },
  {
    key: 'tavily',
    name: 'Tavily',
    category: 'NEWS_SEARCH',
    description: 'Recherche Web optimisée pour les agents IA.',
    docsUrl: 'https://docs.tavily.com/',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },
  {
    key: 'gnews',
    name: 'GNews',
    category: 'NEWS_SEARCH',
    description: "Agrégateur d'actualités économique.",
    docsUrl: 'https://gnews.io/docs/',
    isOAuth: false,
    isPrimaryCapable: false,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },
  {
    key: 'newsapi',
    name: 'NewsAPI',
    category: 'NEWS_SEARCH',
    description: "Agrégateur d'actualités — vérifier la licence avant usage commercial.",
    docsUrl: 'https://newsapi.org/docs',
    isOAuth: false,
    isPrimaryCapable: false,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },
  {
    key: 'rss',
    name: 'Flux RSS / Atom',
    category: 'NEWS_SEARCH',
    description: 'Sources officielles et institutionnelles — aucune clé requise.',
    docsUrl: '',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [],
    testKind: 'rss-fetch',
  },

  // --- Web extraction (spec §12) ---
  {
    key: 'firecrawl',
    name: 'Firecrawl',
    category: 'WEB_EXTRACTION',
    description: 'Extraction de contenu Web respectant robots.txt et les paywalls.',
    docsUrl: 'https://docs.firecrawl.dev/',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },

  // --- AI providers (spec §13) ---
  {
    key: 'anthropic',
    name: 'Anthropic Claude',
    category: 'AI',
    description: 'Analyses, synthèses et génération de contenu.',
    docsUrl: 'https://docs.anthropic.com/',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },
  {
    key: 'openai',
    name: 'OpenAI',
    category: 'AI',
    description: 'Modèles de langage et génération de contenu.',
    docsUrl: 'https://platform.openai.com/docs',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },
  {
    key: 'gemini',
    name: 'Google Gemini',
    category: 'AI',
    description: 'Modèles multimodaux Google.',
    docsUrl: 'https://ai.google.dev/docs',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },

  // --- Illustration (spec §15) ---
  {
    key: 'unsplash',
    name: 'Unsplash',
    category: 'ILLUSTRATION',
    description: 'Banque de photographies sous licence.',
    docsUrl: 'https://unsplash.com/documentation',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [{ key: 'accessKey', label: 'Access Key', type: 'password', required: true }],
    testKind: 'http-fetch',
  },
  {
    key: 'pexels',
    name: 'Pexels',
    category: 'ILLUSTRATION',
    description: 'Banque de photographies et vidéos sous licence.',
    docsUrl: 'https://www.pexels.com/api/documentation/',
    isOAuth: false,
    isPrimaryCapable: false,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },

  // --- Publishing automation (spec §16) ---
  {
    key: 'ayrshare',
    name: 'Ayrshare',
    category: 'PUBLISHING',
    description: 'Connecteur de publication unifié — solution de secours si les API natives échouent.',
    docsUrl: 'https://docs.ayrshare.com/',
    isOAuth: false,
    isPrimaryCapable: false,
    credentialFields: [{ key: 'apiKey', label: 'Clé API', type: 'password', required: true }],
    testKind: 'http-fetch',
  },

  // --- Storage ---
  {
    key: 's3-compatible',
    name: 'Stockage S3-compatible',
    category: 'STORAGE',
    description: 'Illustrations, exports et pièces jointes.',
    docsUrl: '',
    isOAuth: false,
    isPrimaryCapable: true,
    credentialFields: [
      { key: 'endpoint', label: 'Endpoint', type: 'url', required: true },
      { key: 'bucket', label: 'Bucket', type: 'text', required: true },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
    ],
    testKind: 'none',
  },
];

export function getProvider(key: string): ProviderDefinition {
  const provider = PROVIDERS.find((p) => p.key === key);
  if (!provider) throw new Error(`Unknown provider key: ${key}`);
  return provider;
}

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  SOCIAL: 'Réseaux sociaux',
  NEWS_SEARCH: 'Actualités et recherche',
  WEB_EXTRACTION: 'Extraction Web',
  AI: 'Intelligence artificielle',
  ILLUSTRATION: 'Illustrations',
  PUBLISHING: 'Publication et automatisation',
  STORAGE: 'Stockage',
};
