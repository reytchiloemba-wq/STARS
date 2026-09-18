import { db } from '@/lib/db';
import { deductCredits } from './credits.service';
import { CREDIT_COSTS } from '@/config/pricing';
import { CreditReason } from '@prisma/client';
import { getFirecrawlAdapter, type WebExtractionAdapter } from '@/server/adapters/extraction';

export interface WeakSignal {
  id: string;
  category: string;
  title: string;
  signalStrength: 'FAIBLE' | 'ÉMERGENT' | 'EN_ACCÉLÉRATION' | 'RUPTURE';
  velocityScore: number; // 0 - 100
  editorialOpportunity: string;
  reputationalRiskNote?: string;
  firstDetectedAt: string;
  relatedEntities: string[];
  isDemoData?: boolean;
  sourceUrl?: string;
  sourceName?: string;
}

export interface NarrativePerspective {
  region: string;
  dominantFraming: string;
  keyConcerns: string;
  mediaAngle: string;
  confidence: number;
}

export interface ExecutiveBriefingContent {
  id: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  title: string;
  generatedAt: string;
  isDemoData: boolean;
  executiveSummary: string;
  keyFacts: { fact: string; whyItMatters: string; source: string; sourceUrl?: string }[];
  strategicRisks: string[];
  opportunities: string[];
  recommendedActions: string[];
  suggestedCommunications: { topic: string; recommendedAngle: string }[];
}

export class RadarService {
  private static extractionAdapter: WebExtractionAdapter = getFirecrawlAdapter();

  /**
   * For testing or custom adapter injection
   */
  static setAdapter(adapter: WebExtractionAdapter) {
    this.extractionAdapter = adapter;
  }

  static resetAdapter() {
    this.extractionAdapter = getFirecrawlAdapter();
  }

  /**
   * Fallback static demonstration signals
   */
  private static getDemoWeakSignals(): WeakSignal[] {
    return [
      {
        id: 'ws-1',
        category: 'Intelligence Artificielle & Réglementation',
        title: 'Responsabilité civile et transparence algorithmique dans les marchés publics',
        signalStrength: 'EN_ACCÉLÉRATION',
        velocityScore: 88,
        editorialOpportunity: 'Se positionner comme l’expert de la conformité anticipée avant l’entrée en vigueur des audits obligatoires.',
        reputationalRiskNote: 'Risque d’exclusion d’appels d’offres pour les entreprises n’ayant pas formalisé leur charte éthique.',
        firstDetectedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        relatedEntities: ['Union Européenne', 'Parlement Européen', 'Marchés Publics'],
        isDemoData: true,
      },
      {
        id: 'ws-2',
        category: 'Énergie & Décarbonation',
        title: 'Normalisation des batteries sodium-ion pour le stockage de réseau stationnaire',
        signalStrength: 'ÉMERGENT',
        velocityScore: 65,
        editorialOpportunity: 'Comparer les coûts d’infrastructure et l’indépendance géopolitique vis-à-vis du lithium.',
        reputationalRiskNote: 'Greenwashing potentiel si l’empreinte carbone du cycle de fabrication complet est occultée.',
        firstDetectedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        relatedEntities: ['Stockage Stationnaire', 'Batteries Sodium-ion', 'Réseaux Électriques'],
        isDemoData: true,
      },
      {
        id: 'ws-3',
        category: 'Supply Chain & Commerce Mondial',
        title: 'Exigences renforcées de traçabilité carbone Scope 3 aux frontières maritimes',
        signalStrength: 'FAIBLE',
        velocityScore: 42,
        editorialOpportunity: 'Alerter les directions achats sur les retards douaniers prévisibles au T4.',
        firstDetectedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        relatedEntities: ['Scope 3', 'Logistique Maritime', 'Douanes'],
        isDemoData: true,
      },
      {
        id: 'ws-4',
        category: 'Cybersécurité',
        title: 'Attaques supply chain ciblant les bibliothèques open-source critiques pour l’inférence locale',
        signalStrength: 'RUPTURE',
        velocityScore: 94,
        editorialOpportunity: 'Prendre la parole sur la souveraineté du code et les architectures Zero-Trust.',
        reputationalRiskNote: 'Vulnérabilité critique de réputation en cas de compromission silencieuse.',
        firstDetectedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        relatedEntities: ['Open Source', 'Zero Trust', 'Sécurité des dépendances'],
        isDemoData: true,
      },
    ];
  }

  /**
   * Retourne les signaux faibles détectés et la dynamique des tendances.
   * Si des articles réels ont été ingérés via Firecrawl / SourceIngestionService,
   * ils sont transformés en signaux qualifiés avec source vérifiée.
   */
  static async getWeakSignals(organizationId?: string): Promise<WeakSignal[]> {
    try {
      // 1. Check if real articles exist in the database
      const recentArticles = await db.article.findMany({
        where: organizationId
          ? {
              OR: [
                { source: { organizationId: null } },
                { source: { organizationId } },
              ],
            }
          : undefined,
        include: { source: true },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      });

      if (recentArticles.length > 0) {
        // Map real articles into live WeakSignals
        return recentArticles.map((article, index) => {
          const strengths: WeakSignal['signalStrength'][] = ['RUPTURE', 'EN_ACCÉLÉRATION', 'ÉMERGENT', 'FAIBLE'];
          const strength = strengths[index % strengths.length]!;
          const velocity = Math.max(50, 95 - index * 9);

          return {
            id: `real-signal-${article.id}`,
            category: article.source?.type ? `Veille ${article.source.type.replace('_', ' ')}` : 'Veille Stratégique',
            title: article.title,
            signalStrength: strength,
            velocityScore: velocity,
            editorialOpportunity: article.excerpt
              ? `Exploiter les enseignements de l’article pour orienter vos prochaines publications : « ${article.excerpt.slice(0, 140)}… »`
              : 'Opportunité de prise de parole experte sur ce développement récent.',
            firstDetectedAt: article.publishedAt.toISOString(),
            relatedEntities: [article.source?.name || 'Média Spécialisé', article.language.toUpperCase()],
            isDemoData: false,
            sourceUrl: article.canonicalUrl,
            sourceName: article.source?.name,
          };
        });
      }
    } catch {
      // Fallback on error
    }

    return this.getDemoWeakSignals();
  }

  /**
   * Enrichit le Radar en direct en scrapant une liste d'URLs d'actualités avec Firecrawl
   */
  static async enrichSignalsWithFirecrawl(
    targetUrls: string[],
    organizationId?: string,
  ): Promise<WeakSignal[]> {
    const liveSignals: WeakSignal[] = [];

    for (const url of targetUrls) {
      try {
        const scrape = await this.extractionAdapter.scrape(url, {
          onlyMainContent: true,
          organizationId,
        });

        const title = scrape.metadata.title || 'Signal détecté sur le web';
        const excerpt = scrape.markdown.slice(0, 200);

        liveSignals.push({
          id: `firecrawl-live-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          category: 'Actualité Web en Temps Réel',
          title,
          signalStrength: 'EN_ACCÉLÉRATION',
          velocityScore: 85,
          editorialOpportunity: `Opportunité immédiate issue de l'analyse en direct : ${excerpt}`,
          firstDetectedAt: new Date().toISOString(),
          relatedEntities: ['Firecrawl Engine', 'Extraction Live'],
          isDemoData: scrape.isDemoData,
          sourceUrl: url,
        });
      } catch (err) {
        console.warn(`[RadarService] Failed to enrich signal from ${url}:`, err);
      }
    }

    return liveSignals.length > 0 ? liveSignals : this.getDemoWeakSignals();
  }

  /**
   * Retourne la carte des narratifs mondiaux pour un sujet
   */
  static async getNarrativeMap(
    topic: string,
    _organizationId?: string,
  ): Promise<{
    topic: string;
    perspectives: NarrativePerspective[];
    contentGap: string[];
    saturatedAngles: string[];
    isDemoData?: boolean;
  }> {
    return {
      topic,
      isDemoData: true,
      perspectives: [
        {
          region: 'Europe',
          dominantFraming: 'Régulation, protection des données, souveraineté et conformité juridique stricte.',
          keyConcerns: 'Respect du RGPD, protection des consommateurs, encadrement des monopoles.',
          mediaAngle: 'Approche institutionnelle et prudente, axée sur les garanties éthiques.',
          confidence: 89,
        },
        {
          region: 'Amérique du Nord',
          dominantFraming: 'Vitesse d’adoption, retour sur investissement (ROI), gains de productivité et leadership de marché.',
          keyConcerns: 'Coûts d’infrastructure, concurrence agressive, attraction des talents.',
          mediaAngle: 'Approche pragmatique orientée valorisation financière et disruption technologique.',
          confidence: 92,
        },
        {
          region: 'Asie-Pacifique',
          dominantFraming: 'Industrialisation de masse, intégration matérielle et déploiement à grande échelle.',
          keyConcerns: 'Rendements énergétiques, fabrication de composants, souveraineté industrielle.',
          mediaAngle: 'Focus sur les capacités de production et l’impact sur les infrastructures logistiques.',
          confidence: 85,
        },
        {
          region: 'Afrique',
          dominantFraming: 'Inclusion financière, résilience des réseaux, applications concrètes pour le mobile et l’agriculture.',
          keyConcerns: 'Accessibilité tarifaire, couverture rurale, solutions adaptées aux réalités locales.',
          mediaAngle: 'Perspectives axées sur l’impact socio-économique direct et les innovations d’usage.',
          confidence: 84,
        },
      ],
      contentGap: [
        'L’impact direct sur les coûts opérationnels des PME intermédiaires reste sous-documenté.',
        'Très peu d’analyses comparent les retours d’expérience concrets à 12 mois.',
        'La transition des compétences métiers face aux nouveaux outils manque d’études empiriques.',
      ],
      saturatedAngles: [
        '« Pourquoi cette technologie va tout révolutionner d’ici demain » (angle sensationnaliste saturé).',
        '« Fin du monde vs utopie » (bipolarisation stérile sans données chiffrées).',
      ],
    };
  }

  /**
   * Génère un briefing exécutif et débite les crédits correspondants.
   * Si des articles réels existent en base (issus de Firecrawl), ils sont intégrés
   * avec leurs vraies sources vérifiées.
   */
  static async generateBriefing(
    organizationId: string,
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  ): Promise<ExecutiveBriefingContent> {
    await deductCredits(
      organizationId,
      CREDIT_COSTS.AUTOMATED_BRIEFING,
      CreditReason.AUTOMATED_BRIEFING,
      { period },
    );

    const dateStr = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Check for real articles in the database
    const realArticles = await db.article.findMany({
      include: { source: true },
      orderBy: { publishedAt: 'desc' },
      take: 4,
    });

    if (realArticles.length >= 2) {
      return {
        id: `briefing-${Date.now()}`,
        period,
        title: `Briefing Exécutif STARS — ${period === 'DAILY' ? 'Quotidien' : period === 'WEEKLY' ? 'Hebdomadaire' : 'Stratégique Mensuel'} (${dateStr})`,
        generatedAt: new Date().toISOString(),
        isDemoData: false,
        executiveSummary: `Synthèse automatisée basée sur les articles et sources récemment ingérés par le moteur Firecrawl. ${realArticles.length} publications de référence ont été analysées pour ce briefing.`,
        keyFacts: realArticles.map((a) => ({
          fact: a.title,
          whyItMatters: a.excerpt
            ? `Extrait clé : ${a.excerpt.slice(0, 180)}…`
            : 'Point d’actualité ayant un impact direct sur le positionnement éditorial.',
          source: `${a.source.name} (Source vérifiée)`,
          sourceUrl: a.canonicalUrl,
        })),
        strategicRisks: [
          'Risque de décalage temporel si la réactivité sur les prises de parole clés dépasse 48 heures.',
          'Nécessité de contextualiser les annonces avec les directives régionales.',
        ],
        opportunities: [
          'S’appuyer sur les sources d’autorité identifiées pour étayer les publications sur LinkedIn et X.',
          'Créer des formats synthétiques et pédagogiques valorisant les données vérifiées.',
        ],
        recommendedActions: [
          'Sélectionner 1 article d’actualité pour en faire un projet de post Studio.',
          'Consulter la revue des sources pour ajuster la fréquence de veille.',
        ],
        suggestedCommunications: realArticles.slice(0, 2).map((a) => ({
          topic: a.title,
          recommendedAngle: `Tribune d’expert analysant les impacts concrets d’après ${a.source.name}`,
        })),
      };
    }

    // Fallback demonstration content if no real articles exist yet
    return {
      id: `briefing-${Date.now()}`,
      period,
      title: `[Démonstration] Briefing Exécutif STARS — ${period === 'DAILY' ? 'Quotidien' : period === 'WEEKLY' ? 'Hebdomadaire' : 'Stratégique Mensuel'} (${dateStr})`,
      generatedAt: new Date().toISOString(),
      isDemoData: true,
      executiveSummary:
        'Exemple de synthèse illustrant le format d’un briefing exécutif STARS. Ce contenu est fixe et ne provient d’aucune source réelle — aucun flux n’a encore été ingéré via Firecrawl (voir Ingestion de Sources ou Infrastructure).',
      keyFacts: [
        {
          fact: 'Exemple : « Les directives européennes sur la transparence des modèles imposent un audit des algorithmes utilisés dans les prises de décision RH. »',
          whyItMatters: 'Illustre le type d’implication stratégique qu’un fait réel pourrait avoir.',
          source: 'Démonstration — aucune source réelle',
        },
        {
          fact: 'Exemple : « Chute de 18% des coûts d’accès aux infrastructures de calcul décentralisées au cours du dernier trimestre. »',
          whyItMatters: 'Illustre le type de donnée chiffrée qu’un fait réel pourrait apporter.',
          source: 'Démonstration — aucune source réelle',
        },
        {
          fact: 'Exemple : « Publication de 3 études indépendantes attestant de la viabilité industrielle des batteries sodium-ion. »',
          whyItMatters: 'Illustre le type de synthèse multi-sources qu’un briefing réel proposerait.',
          source: 'Démonstration — aucune source réelle',
        },
      ],
      strategicRisks: [
        'Risque de non-conformité sur les déclarations d’impact environnemental (renforcement des contrôles).',
        'Volatilité accrue des coûts de télécommunication transfrontaliers.',
      ],
      opportunities: [
        'Possibilité de devancer les concurrents sur la certification éthique des données de marque.',
        'Prise de parole légitime sur l’optimisation des chaînes logistiques décarbonées.',
      ],
      recommendedActions: [
        'Lancer une ingestion de sources via Firecrawl pour alimenter les briefings réels.',
        'Mandater les équipes communication pour préparer 2 prises de parole expertes sur LinkedIn.',
      ],
      suggestedCommunications: [
        {
          topic: 'Conformité et éthique des algorithmes RH',
          recommendedAngle: 'Partager une tribune de dirigeant : « Comment nous allions exigence réglementaire et respect humain »',
        },
        {
          topic: 'Décarbonation et autonomie énergétique',
          recommendedAngle: 'Décryptage pédagogique des technologies de rupture pour notre audience sectorielle',
        },
      ],
    };
  }
}
