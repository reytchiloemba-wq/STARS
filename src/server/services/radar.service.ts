import { db } from '@/lib/db';
import { deductCredits } from './credits.service';
import { CREDIT_COSTS } from '@/config/pricing';
import { CreditReason } from '@prisma/client';

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
  /** No real ingestion pipeline feeds this yet — see RadarService class doc. Always true today. */
  isDemoData: boolean;
  executiveSummary: string;
  keyFacts: { fact: string; whyItMatters: string; source: string }[];
  strategicRisks: string[];
  opportunities: string[];
  recommendedActions: string[];
  suggestedCommunications: { topic: string; recommendedAngle: string }[];
}

// No real signal-detection or briefing pipeline exists yet — every method
// below returns fixed, hand-written illustrative content (there is no
// ingestion, no scoring model, no source). A prior version presented this
// as if it were live monitoring output and attributed invented facts to
// real institutions ("Journal Officiel de l'Union Européenne", etc.) — a
// direct citation-fabrication problem found during audit. Fixed: every
// output is flagged `isDemoData`/carries a "Démonstration" source label,
// and the UI (src/app/w/[org]/radar, .../briefings) must render that badge
// rather than presenting this as real intelligence.
export class RadarService {
  /**
   * Retourne les signaux faibles détectés et la dynamique des tendances
   */
  static async getWeakSignals(): Promise<WeakSignal[]> {
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
      },
    ];
  }

  /**
   * Retourne la carte des narratifs mondiaux pour un sujet
   */
  static async getNarrativeMap(topic: string): Promise<{
    topic: string;
    perspectives: NarrativePerspective[];
    contentGap: string[];
    saturatedAngles: string[];
  }> {
    return {
      topic,
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
   * Génère un briefing exécutif et débite les crédits correspondants
   */
  static async generateBriefing(organizationId: string, period: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Promise<ExecutiveBriefingContent> {
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

    return {
      id: `briefing-${Date.now()}`,
      period,
      title: `[Démonstration] Briefing Exécutif STARS — ${period === 'DAILY' ? 'Quotidien' : period === 'WEEKLY' ? 'Hebdomadaire' : 'Stratégique Mensuel'} (${dateStr})`,
      generatedAt: new Date().toISOString(),
      isDemoData: true,
      executiveSummary:
        'Exemple de synthèse illustrant le format d’un briefing exécutif STARS. Ce contenu est fixe et ne provient d’aucune source réelle — aucun pipeline de veille n’est encore connecté (voir Infrastructure & Connexions).',
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
        'Lancer un audit express de conformité sur les traitements internes sous 30 jours.',
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
