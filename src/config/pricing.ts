// SINGLE SOURCE OF TRUTH for STARS's pricing.
//
// The landing page pricing section, the in-app billing center, and
// prisma/seed.ts (which materializes these into `Plan` rows read by the
// entitlement checks) all import from this file. Never hardcode a price or
// quota anywhere else — see spec requirement: "les prix présentés sur la
// landing page, dans le checkout et dans l'application doivent toujours
// provenir de la même source de vérité."
//
// Changing a number here and re-running `npm run db:seed` is the only
// sanctioned way to change a price or quota.

export type PlanKey = 'discovery' | 'creator' | 'professional' | 'business' | 'enterprise';

export interface PlanQuotas {
  seatsIncluded: number;
  /** cents/month for each seat beyond `seatsIncluded`; null = not sellable (e.g. single-seat plans) or negotiated (Enterprise) */
  extraSeatMonthlyCents: number | null;
  domains: number;
  /**
   * STARS Intelligence Credits (SIC) granted per billing period.
   * SIC meters all technical consumption (Make scenarios, LLM tokens, search engine queries,
   * web scraping, image generation). Discovery's pool (10) covers: 3 express (3) + 1 deep (3) + 2 illustrations (4) = 10.
   */
  creditsPerMonth: number;
  socialAccountsIncluded: number;
  /** Ordinary publishing/scheduling does not spend SIC — it has its own monthly cap. */
  publicationsPerMonth: number;
  brandVoicesIncluded: number;
  commentsPerMonth: number;
  commentAiSuggestionsPerMonth: number;
  historyDays: number;
  apiAccess: boolean;
}

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  tagline: string;
  /** null = no fixed self-serve price ("sur devis") */
  monthlyPriceCents: number | null;
  annualPriceCents: number | null;
  isCustomPricing: boolean;
  highlight: 'most-popular' | null;
  quotas: PlanQuotas;
  features: string[];
  cta: string;
  trialDays: number | null;
}

export const CURRENCY = 'EUR';
export const ANNUAL_MONTHS_FREE = 2;
export const VAT_NOTE = 'Prix hors taxes (HT). La TVA applicable est ajoutée au moment du paiement.';

export const PLANS: PlanDefinition[] = [
  {
    key: 'discovery',
    name: 'Discovery',
    tagline: 'Découvrez la puissance de l’intelligence éditoriale STARS.',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    isCustomPricing: false,
    highlight: null,
    trialDays: null,
    quotas: {
      seatsIncluded: 1,
      extraSeatMonthlyCents: null,
      domains: 1,
      creditsPerMonth: 10,
      socialAccountsIncluded: 1,
      publicationsPerMonth: 5,
      brandVoicesIncluded: 1,
      commentsPerMonth: 25,
      commentAiSuggestionsPerMonth: 5,
      historyDays: 7,
      apiAccess: false,
    },
    features: [
      '1 utilisateur',
      '1 organisation (tenant)',
      '1 domaine suivi',
      '10 STARS Intelligence Credits (SIC) / mois',
      '3 analyses express',
      '1 analyse approfondie',
      '5 posts préparés',
      '1 réseau social connecté',
      '5 publications ou programmations / mois',
      '25 commentaires synchronisés / mois',
      '5 suggestions IA de réponse',
      '2 illustrations IA',
      'Historique de 7 jours',
      'Analytics essentiels',
      'Support en libre-service',
    ],
    cta: 'Commencer gratuitement',
  },
  {
    key: 'creator',
    name: 'Creator',
    tagline: 'Pour créateurs, entrepreneurs et indépendants désireux de s’imposer.',
    monthlyPriceCents: 4900,
    annualPriceCents: 49000,
    isCustomPricing: false,
    highlight: null,
    trialDays: null,
    quotas: {
      seatsIncluded: 1,
      extraSeatMonthlyCents: null,
      domains: 5,
      creditsPerMonth: 100,
      socialAccountsIncluded: 3,
      publicationsPerMonth: 75,
      brandVoicesIncluded: 1,
      commentsPerMonth: 500,
      commentAiSuggestionsPerMonth: 150,
      historyDays: 180,
      apiAccess: false,
    },
    features: [
      '1 utilisateur',
      '5 domaines suivis',
      '100 STARS Intelligence Credits (SIC) / mois',
      'Recherches directes & veille continue',
      'Analyses express et approfondies',
      'Thèse et antithèse sourcées',
      '3 comptes sociaux connectés',
      '75 publications / mois',
      '500 commentaires / mois',
      '150 suggestions IA de réponse (Copilot)',
      'Classification & sentiment',
      '25 illustrations IA / mois',
      '1 STARS Voice personnalisée',
      'Calendrier éditorial partagé',
      'Historique de 6 mois',
      'Analytics standards',
      'Support par email',
    ],
    cta: 'Essayer Creator',
  },
  {
    key: 'professional',
    name: 'Professional',
    tagline: 'Pour dirigeants, consultants, experts et responsables communication.',
    monthlyPriceCents: 12900,
    annualPriceCents: 129000,
    isCustomPricing: false,
    highlight: 'most-popular',
    trialDays: 14,
    quotas: {
      seatsIncluded: 3,
      extraSeatMonthlyCents: 1900,
      domains: 15,
      creditsPerMonth: 350,
      socialAccountsIncluded: 10,
      publicationsPerMonth: 300,
      brandVoicesIncluded: 3,
      commentsPerMonth: 3000,
      commentAiSuggestionsPerMonth: 1000,
      historyDays: 730,
      apiAccess: false,
    },
    features: [
      '3 utilisateurs inclus (+19 € HT/mois par siège supplémentaire)',
      '15 domaines suivis',
      '350 STARS Intelligence Credits (SIC) / mois',
      'Analyses stratégiques complètes',
      'STARS Radar & signaux faibles',
      'Comparateur temporel & carte des narratifs',
      '10 comptes sociaux connectés',
      '300 publications / mois',
      '3 000 commentaires / mois',
      '1 000 suggestions IA (Copilot)',
      'Boîte de réception unifiée & priorisation',
      'Gestion des SLA & détection des prospects',
      'Transformation commentaire en publication',
      '100 illustrations IA / mois',
      '3 STARS Voices',
      'Validation éditoriale simple',
      'Briefings hebdomadaires automatisés',
      'Exports PDF, DOCX et CSV',
      'Historique de 24 mois',
      'Analytics avancés',
      'Support prioritaire',
    ],
    cta: 'Démarrer l’essai Professional',
  },
  {
    key: 'business',
    name: 'Business',
    tagline: 'Pour PME, agences, directions marketing et équipes de veille.',
    monthlyPriceCents: 39900,
    annualPriceCents: 399000,
    isCustomPricing: false,
    highlight: null,
    trialDays: 14,
    quotas: {
      seatsIncluded: 10,
      extraSeatMonthlyCents: 2900,
      domains: 50,
      creditsPerMonth: 1200,
      socialAccountsIncluded: 30,
      publicationsPerMonth: 1500,
      brandVoicesIncluded: 10,
      commentsPerMonth: 15000,
      commentAiSuggestionsPerMonth: 5000,
      historyDays: 1825,
      apiAccess: true,
    },
    features: [
      '10 utilisateurs inclus (+29 € HT/mois par siège supplémentaire)',
      '50 domaines suivis',
      '1 200 STARS Intelligence Credits (SIC) / mois',
      'Analyses avancées & veille concurrentielle',
      'STARS Radar avancé & alertes rapides',
      '30 comptes sociaux connectés',
      '1 500 publications / mois',
      '15 000 commentaires / mois',
      '5 000 suggestions IA (Copilot)',
      'STARS Crisis Radar & règles de modération',
      'SLA personnalisés & files par équipe',
      '300 illustrations IA / mois',
      '10 STARS Voices',
      'Gestion multimarque & rôles avancés',
      'Workflows d’approbation multi-niveaux',
      'Mode crise & rapports personnalisés',
      'Briefings quotidiens et hebdomadaires',
      'Automatisations avancées & webhooks',
      'Accès API avec quota inclus',
      'Historique de 5 ans',
      'Onboarding assisté & support prioritaire renforcé',
    ],
    cta: 'Essayer Business pendant 14 jours',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Pour grands groupes, médias, institutions et organisations réglementées.',
    monthlyPriceCents: 149000,
    annualPriceCents: null,
    isCustomPricing: true,
    highlight: null,
    trialDays: null,
    quotas: {
      seatsIncluded: -1,
      extraSeatMonthlyCents: null,
      domains: -1,
      creditsPerMonth: -1,
      socialAccountsIncluded: -1,
      publicationsPerMonth: -1,
      brandVoicesIncluded: -1,
      commentsPerMonth: -1,
      commentAiSuggestionsPerMonth: -1,
      historyDays: -1,
      apiAccess: true,
    },
    features: [
      'Volumes négociés & membres adaptables',
      'Commentaires & modération grand volume',
      'Files dédiées & SLA contractuel garanti',
      'Plusieurs entités et filiales',
      'Sources privées & connecteurs personnalisés',
      'Modèles IA personnalisés & RAG d’entreprise',
      'Infrastructure hybride ou dédiée (Make ou native)',
      'SSO SAML/OIDC & SCIM',
      'Rôles personnalisés & audit avancé',
      'Options de résidence des données & chiffrement dédié',
      'Customer Success Manager dédié',
      'Formation et accompagnement au déploiement',
    ],
    cta: 'Parler à un expert STARS',
  },
];

export function getPlan(key: PlanKey): PlanDefinition {
  const plan = PLANS.find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown plan key: ${key}`);
  return plan;
}

/**
 * STARS Intelligence Credits (SIC) — Barème officiel configurable.
 * Regroupe les coûts de Make, recherche, extraction, IA, traduction et illustration.
 */
export const CREDIT_COSTS = {
  ANALYSIS_EXPRESS: 1,
  ANALYSIS_DEEP: 3,
  ANALYSIS_STRATEGIC: 6,
  DOSSIER_REFRESH: 1,
  AUTOMATED_BRIEFING: 2,
  EXTRA_VARIANT_PACK: 1,
  AI_ILLUSTRATION: 2,
  ADVANCED_TRANSLATION: 1,
  NARRATIVE_MAP: 4,
  EXECUTIVE_REPORT: 5,
} as const;

export type CreditCostKey = keyof typeof CREDIT_COSTS;

export interface CreditPack {
  credits: number;
  priceCents: number;
  validityMonths: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  { credits: 50, priceCents: 2400, validityMonths: 12 },
  { credits: 150, priceCents: 5900, validityMonths: 12 },
  { credits: 500, priceCents: 16900, validityMonths: 12 },
  { credits: 1500, priceCents: 44900, validityMonths: 12 },
];

export interface FoundersPromo {
  enabled: boolean;
  badge: string;
  discountPercent: number;
  durationMonths: number;
  eligiblePlans: PlanKey[];
}

export const FOUNDERS_PROMO: FoundersPromo = {
  enabled: true,
  badge: 'Programme Fondateurs',
  discountPercent: 30,
  durationMonths: 12,
  eligiblePlans: ['creator', 'professional', 'business'],
};

export function formatPriceCents(cents: number | null): string {
  if (cents === null) return 'Sur devis';
  if (cents === 0) return '0 €';
  return `${(cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}
