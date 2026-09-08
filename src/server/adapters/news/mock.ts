import type { Dossier, NewsSearchAdapter, SearchFilters } from './types';

// Deterministic demo adapter. Every string it returns is fabricated for the
// sandbox and MUST stay tagged `isDemoData: true` — the UI is required to
// render a "Démonstration" badge whenever that flag is set (spec §28).
export class MockNewsSearchAdapter implements NewsSearchAdapter {
  readonly providerName = 'start-demo-news-adapter';

  async search(query: string, _filters: SearchFilters): Promise<Dossier> {
    return {
      isDemoData: true,
      title: `[Démonstration] ${query}`,
      executiveSummary:
        'Ceci est un dossier de démonstration généré sans connexion à une source réelle. ' +
        'Branchez un fournisseur de veille sous licence dans src/server/adapters/news pour obtenir des données réelles.',
      confidenceScore: 62,
      insufficientData: false,
      sources: [
        { id: 'demo-src-1', name: 'Agence Démonstration', url: 'https://example.com/demo-1', country: 'FR', type: 'WIRE_AGENCY', trustScore: 78 },
        { id: 'demo-src-2', name: 'Institut de Démonstration', url: 'https://example.com/demo-2', country: 'EU', type: 'INSTITUTION', trustScore: 85 },
      ],
      claims: [
        { status: 'ESTABLISHED_FACT', text: `Fait établi de démonstration relatif à : ${query}.`, citationUrls: ['https://example.com/demo-1'] },
        { status: 'REPORTED_UNCONFIRMED', text: 'Information rapportée mais non confirmée (démonstration).', citationUrls: ['https://example.com/demo-2'] },
        { status: 'OPEN_QUESTION', text: 'Question ouverte identifiée par la démonstration.', citationUrls: [] },
      ],
      thesis: {
        summary: 'Synthèse de la thèse (démonstration).',
        strengths: ['Argument favorable démonstratif 1', 'Argument favorable démonstratif 2'],
        limitations: ['Limite identifiée en démonstration'],
        quotes: [
          {
            name: 'Expert Démonstration A',
            role: 'Chercheur',
            organization: 'Institut Démonstration',
            statement: 'Citation d’expert fictive utilisée uniquement à des fins de démonstration.',
            sourceUrl: 'https://example.com/demo-1',
          },
        ],
      },
      antithesis: {
        summary: 'Synthèse de l’antithèse (démonstration).',
        strengths: ['Argument contradictoire démonstratif 1'],
        limitations: ['Limite identifiée en démonstration'],
        quotes: [
          {
            name: 'Expert Démonstration B',
            role: 'Analyste',
            organization: 'Cabinet Démonstration',
            statement: 'Seconde citation fictive, utilisée uniquement à des fins de démonstration.',
            sourceUrl: 'https://example.com/demo-2',
          },
        ],
      },
      timelineEvents: [
        { date: 'Il y a 14 jours', title: 'Première publication de référence', description: 'Révélation des premières données consolidées par les équipes de recherche.', sourceUrl: 'https://example.com/demo-1' },
        { date: 'Il y a 6 jours', title: 'Réactions institutionnelles', description: 'Prise de position des régulateurs et ouverture d’une consultation publique.', sourceUrl: 'https://example.com/demo-2' },
        { date: 'Hier', title: 'Nouvelles données contradictoires', description: 'Publication d’un contre-rapport apportant des nuances substantielles.' },
      ],
      synthesis: {
        convergences: ['Point de convergence en démonstration'],
        divergences: ['Point de divergence en démonstration'],
        openQuestions: ['Donnée manquante en démonstration'],
      },
    };
  }

  async listDomainTopics(categoryKey: string) {
    return [1, 2, 3].map((n) => ({
      id: `demo-${categoryKey}-${n}`,
      title: `[Démonstration] Sujet ${n} — ${categoryKey}`,
      summary: 'Résumé de démonstration en attente d’une source de veille réelle.',
      sourceCount: n + 1,
      countries: ['FR', 'EU'],
    }));
  }
}
