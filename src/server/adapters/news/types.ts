// Provider-agnostic contract for the news/veille pipeline (spec §6-9, §23).
// A real implementation would call licensed RSS/API sources; until those
// licenses and API keys exist, `mock.ts` returns clearly-labeled demo data
// shaped exactly like production output so the UI and dossier logic never
// need to change when a real provider is wired in.

export interface DossierSource {
  id: string;
  name: string;
  url: string;
  country?: string;
  type: string;
  trustScore: number;
}

export interface DossierClaim {
  status:
    | 'ESTABLISHED_FACT'
    | 'REPORTED_UNCONFIRMED'
    | 'ASSERTION'
    | 'ANALYSIS'
    | 'OPINION'
    | 'HYPOTHESIS'
    | 'OPEN_QUESTION';
  text: string;
  citationUrls: string[];
}

export interface DossierExpertQuote {
  name: string;
  role: string;
  organization: string;
  statement: string;
  sourceUrl: string;
}

export interface DossierPerspective {
  summary: string;
  strengths: string[];
  limitations: string[];
  quotes: DossierExpertQuote[];
}

export interface Dossier {
  isDemoData: boolean;
  title: string;
  executiveSummary: string;
  confidenceScore: number | null;
  insufficientData: boolean;
  sources: DossierSource[];
  claims: DossierClaim[];
  thesis: DossierPerspective;
  antithesis: DossierPerspective;
  timelineEvents?: Array<{ date: string; title: string; description: string; sourceUrl?: string }>;
  synthesis: {
    convergences: string[];
    divergences: string[];
    openQuestions: string[];
  };
}

export interface SearchFilters {
  period?: string;
  countries?: string[];
  languages?: string[];
  categoryKeys?: string[];
  depth?: 'EXPRESS' | 'DEEP' | 'STRATEGIC';
}

export interface NewsSearchAdapter {
  readonly providerName: string;
  search(query: string, filters: SearchFilters): Promise<Dossier>;
  listDomainTopics(categoryKey: string): Promise<Array<{ id: string; title: string; summary: string; sourceCount: number; countries: string[] }>>;
}
