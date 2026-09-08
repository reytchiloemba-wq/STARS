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
   * STARS Credits granted per billing period. Credits meter the AI-costed
   * operations (see CREDIT_COSTS below) — analyses, illustrations, dossier
   * refreshes, extra variants, automated briefings. Discovery's pool (10) is
   * sized to exactly cover its advertised free allowance: 3 express (3) + 1
   * deep (3) + 2 illustrations (4) = 10 — one mechanism, two presentations.
   */
  creditsPerMonth: number;
  socialAccountsIncluded: number;
  /** Ordinary publishing/scheduling does not spend credits (spec §3) — it has its own monthly cap. */
  publicationsPerMonth: number;
  brandVoicesIncluded: number;
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
    tagline: 'Découvrez une nouvelle manière de comprendre l’actualité.',
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
      historyDays: 7,
      apiAccess: false,
    },
    features: [
      '1 utilisateur',
      '1 domaine suivi',
      '3 analyses express par mois',
      '1 analyse approfondie par mois',
      '5 préparations de posts par mois',
      '1 compte social connecté',
      '5 publications ou programmations par mois',
      '2 illustrations IA par mois',
      'Historique de 7 jours',
      'Sources visibles',
      'Brand Voice simplifiée',
      'Analytics essentiels',
      "Support via centre d'aide",
    ],
    cta: 'Commencer gratuitement',
  },
  {
    key: 'creator',
    name: 'Creator',
    tagline: 'Transformez l’actualité en contenus qui renforcent votre voix.',
    monthlyPriceCents: 3900,
    annualPriceCents: 39000,
    isCustomPricing: false,
    highlight: null,
    trialDays: null,
    quotas: {
      seatsIncluded: 1,
      extraSeatMonthlyCents: null,
      domains: 3,
      creditsPerMonth: 50,
      socialAccountsIncluded: 3,
      publicationsPerMonth: 50,
      brandVoicesIncluded: 1,
      historyDays: 90,
      apiAccess: false,
    },
    features: [
      '1 utilisateur',
      '3 domaines suivis',
      '50 STARS Credits par mois',
      'Recherches directes',
      'Analyses express et approfondies',
      'Thèse et antithèse',
      "Jusqu'à 3 comptes sociaux",
      '50 publications par mois',
      'Calendrier éditorial',
      '20 illustrations IA par mois',
      '1 Brand Voice',
      'Génération multilingue',
      'Historique de 90 jours',
      'Analytics standards',
      'Export PDF simple',
      'Assistance par email',
    ],
    cta: 'Essayer Creator gratuitement',
  },
  {
    key: 'professional',
    name: 'Professional',
    tagline: 'Passez de l’information à une prise de parole stratégique.',
    monthlyPriceCents: 9900,
    annualPriceCents: 99000,
    isCustomPricing: false,
    highlight: 'most-popular',
    trialDays: 14,
    quotas: {
      seatsIncluded: 3,
      extraSeatMonthlyCents: 1500,
      domains: 10,
      creditsPerMonth: 200,
      socialAccountsIncluded: 10,
      publicationsPerMonth: 250,
      brandVoicesIncluded: 3,
      historyDays: 730,
      apiAccess: false,
    },
    features: [
      '3 utilisateurs inclus',
      '10 domaines suivis',
      '200 STARS Credits par mois',
      'Analyses stratégiques',
      'Radar des tendances et signaux faibles',
      'Comparateur temporel',
      'Carte des narratifs',
      "Jusqu'à 10 comptes sociaux",
      '250 publications par mois',
      '75 illustrations IA par mois',
      '3 Brand Voices',
      'Calendrier partagé',
      'Premier niveau de validation',
      'Analytics avancés',
      'Exports PDF, CSV et DOCX',
      'Briefings hebdomadaires',
      'Historique de 24 mois',
      'Assistance prioritaire',
    ],
    cta: "Démarrer l'essai Professional",
  },
  {
    key: 'business',
    name: 'Business',
    tagline: 'L’intelligence éditoriale de toute votre organisation.',
    monthlyPriceCents: 29900,
    annualPriceCents: 299000,
    isCustomPricing: false,
    highlight: null,
    trialDays: 14,
    quotas: {
      seatsIncluded: 10,
      extraSeatMonthlyCents: 2500,
      domains: 30,
      creditsPerMonth: 750,
      socialAccountsIncluded: 30,
      publicationsPerMonth: 1000,
      brandVoicesIncluded: 10,
      historyDays: 1825,
      apiAccess: true,
    },
    features: [
      '10 utilisateurs inclus',
      '30 domaines suivis',
      '750 STARS Credits par mois',
      'Veille concurrentielle',
      'Radar mondial avancé',
      'Alertes en temps réel',
      "Jusqu'à 30 comptes sociaux",
      '1 000 publications par mois',
      '250 illustrations IA par mois',
      '10 Brand Voices',
      'Gestion multimarque',
      'Rôles avancés',
      'Workflows de validation à plusieurs niveaux',
      'Mode crise',
      'Rapports personnalisés sans marque STARS',
      'Briefings quotidiens et hebdomadaires',
      'Historique de 5 ans',
      'Webhooks et accès API',
      'Support prioritaire renforcé',
    ],
    cta: 'Essayer Business pendant 14 jours',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Une infrastructure d’intelligence éditoriale conçue pour votre organisation.',
    monthlyPriceCents: 99000,
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
      historyDays: -1,
      apiAccess: true,
    },
    features: [
      'Nombre de membres adaptable',
      'Domaines et sources personnalisés',
      'Volumes négociés',
      'Plusieurs filiales et workspaces',
      'Rôles personnalisés',
      'SSO SAML/OIDC, SCIM',
      'Options de résidence des données',
      'API avancée et connecteurs personnalisés',
      'Sources privées et imports documentaires',
      'Tableaux de bord sur mesure',
      'Audit logs étendus',
      'SLA contractuel',
      'Customer Success Manager dédié',
    ],
    cta: 'Parler à un expert STARS',
  },
];

export function getPlan(key: PlanKey): PlanDefinition {
  const plan = PLANS.find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown plan key: ${key}`);
  return plan;
}

// STARS Credits — cost of each AI-costed operation. Administrable in spirit
// (this file is the config point); wiring a DB-backed override table is a
// Phase 7+ enhancement once real usage data justifies it.
export const CREDIT_COSTS = {
  ANALYSIS_EXPRESS: 1,
  ANALYSIS_DEEP: 3,
  ANALYSIS_STRATEGIC: 6,
  DOSSIER_REFRESH: 1,
  AI_ILLUSTRATION: 2,
  EXTRA_VARIANT_PACK: 1,
  AUTOMATED_BRIEFING: 2,
} as const;

export type CreditCostKey = keyof typeof CREDIT_COSTS;

export interface CreditPack {
  credits: number;
  priceCents: number;
  validityMonths: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  { credits: 50, priceCents: 1900, validityMonths: 12 },
  { credits: 150, priceCents: 4900, validityMonths: 12 },
  { credits: 500, priceCents: 13900, validityMonths: 12 },
];

export interface FoundersPromo {
  enabled: boolean;
  badge: string;
  discountPercent: number;
  durationMonths: number;
  eligiblePlans: PlanKey[];
}

// Toggle by flipping `enabled` here (or via Stripe promotion code activation —
// see StripeBillingProvider). No fabricated countdown/quantity is rendered
// unless backed by a real number.
export const FOUNDERS_PROMO: FoundersPromo = {
  enabled: true,
  badge: 'Offre Fondateurs',
  discountPercent: 30,
  durationMonths: 12,
  eligiblePlans: ['creator', 'professional', 'business'],
};

export function formatPriceCents(cents: number | null): string {
  if (cents === null) return 'Sur devis';
  if (cents === 0) return '0 €';
  return `${(cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
}
