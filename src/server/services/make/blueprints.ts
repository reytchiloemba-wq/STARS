import { WorkflowType } from './types';

export interface ScenarioBlueprint {
  workflow: WorkflowType;
  name: string;
  description: string;
  version: string;
  estimatedOperations: number;
  trigger: string;
  modules: Array<{
    id: number;
    module: string;
    action: string;
    description: string;
  }>;
}

export const MAKE_SCENARIO_BLUEPRINTS: Record<WorkflowType, ScenarioBlueprint> = {
  [WorkflowType.MONITORING]: {
    workflow: WorkflowType.MONITORING,
    name: 'STARS — Veille Permanente & Flux RSS',
    description: 'Collecte programmée des flux RSS sectoriels, déduplication, enrichissement et transmission à STARS pour persistance.',
    version: '1.0.0',
    estimatedOperations: 4,
    trigger: 'Webhook STARS ou Planification Cron',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Custom Webhook', description: 'Reçoit le payload signé STARS avec les domaines actifs' },
      { id: 2, module: 'rss/feed', action: 'Retrieve RSS Feed Items', description: 'Interroge les flux RSS des sources vérifiées' },
      { id: 3, module: 'tools/deduplicator', action: 'Deduplicate by URL', description: 'Élimine les doublons évidents de dépêches' },
      { id: 4, module: 'http/callback', action: 'Send HTTP Callback', description: 'Transmet les articles normalisés à la passerelle STARS' },
    ],
  },
  [WorkflowType.TOPIC_ANALYSIS]: {
    workflow: WorkflowType.TOPIC_ANALYSIS,
    name: 'STARS — Analyse Structurée de Sujet IA',
    description: 'Extraction des sources primaires, distinction faits/opinions/incertitudes, et synthèse contradictoire thèse/antithèse.',
    version: '1.0.0',
    estimatedOperations: 6,
    trigger: 'Demande manuelle ou Alerte de veille',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Analysis Request', description: 'Reçoit le sujet et les identifiants de sources' },
      { id: 2, module: 'http/scraper', action: 'Fetch Primary Sources', description: 'Récupère les métadonnées et extraits autorisés' },
      { id: 3, module: 'ai/anthropic_or_openai', action: 'Generate Structured Dossier', description: 'Produit la matrice Faits/Opinions/Thèse/Antithèse' },
      { id: 4, module: 'data/validator', action: 'Validate JSON Schema', description: 'Vérifie la conformité du format éditorial STARS' },
      { id: 5, module: 'http/callback', action: 'Return Dossier to STARS', description: 'Retourne le dossier complet pour validation humaine' },
    ],
  },
  [WorkflowType.POST_PREPARATION]: {
    workflow: WorkflowType.POST_PREPARATION,
    name: 'STARS — Préparation de Variantes Réseaux Sociaux',
    description: 'Génération de variantes de posts (LinkedIn, X, Instagram, Facebook) adaptées à la Brand Voice du tenant.',
    version: '1.0.0',
    estimatedOperations: 5,
    trigger: 'Validation du dossier par l’analyste',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Approved Dossier', description: 'Reçoit les éléments clés de l’analyse' },
      { id: 2, module: 'ai/completion', action: 'Apply Brand Voice & Formats', description: 'Formate selon les contraintes de caractères et de ton' },
      { id: 3, module: 'tools/counter', action: 'Verify Character Limits', description: 'Contrôle strict des quotas (ex. 280 pour X, 3000 LinkedIn)' },
      { id: 4, module: 'http/callback', action: 'Send Drafts to Studio', description: 'Enregistre les variantes dans le Studio Éditorial STARS' },
    ],
  },
  [WorkflowType.ILLUSTRATION]: {
    workflow: WorkflowType.ILLUSTRATION,
    name: 'STARS — Studio d’Illustration IA & Médias',
    description: 'Génération d’images éditoriales aux ratios ciblés (16:9, 1:1, 4:5) avec texte alternatif et provenance.',
    version: '1.0.0',
    estimatedOperations: 4,
    trigger: 'Demande d’illustration dans le Studio',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Visual Prompt', description: 'Reçoit le prompt exécutif et le ratio souhaité' },
      { id: 2, module: 'image/generation', action: 'Call Image Provider', description: 'Génère l’illustration haute fidélité' },
      { id: 3, module: 'storage/upload', action: 'Upload to STARS Media Vault', description: 'Stocke le média dans le bucket sécurisé' },
      { id: 4, module: 'http/callback', action: 'Return Media Asset ID', description: 'Lie le visuel au brouillon dans STARS' },
    ],
  },
  [WorkflowType.PUBLICATION]: {
    workflow: WorkflowType.PUBLICATION,
    name: 'STARS — Publication Sociale Post-Validation',
    description: 'Publication multi-réseaux conditionnée par la validation humaine préalable, avec garantie d’idempotence.',
    version: '1.0.0',
    estimatedOperations: 5,
    trigger: 'Validation humaine explicite dans STARS',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Publication Order', description: 'Vérifie l’idempotence et les autorisations' },
      { id: 2, module: 'router/network', action: 'Dispatch to Target Platforms', description: 'Achemine vers LinkedIn, X, Instagram ou Facebook' },
      { id: 3, module: 'social/publish', action: 'Post Update', description: 'Exécute la publication via les API officielles' },
      { id: 4, module: 'http/callback', action: 'Report Real Status', description: 'Remonte l’externalPostId ou les erreurs à STARS' },
    ],
  },
  [WorkflowType.BRIEFING]: {
    workflow: WorkflowType.BRIEFING,
    name: 'STARS — Synthèse & Briefing Périodique',
    description: 'Compilation automatique des faits marquants hebdomadaires ou mensuels par domaine.',
    version: '1.0.0',
    estimatedOperations: 6,
    trigger: 'Échéance calendaire ou demande utilisateur',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Trigger Briefing', description: 'Reçoit la période et les thématiques du tenant' },
      { id: 2, module: 'data/aggregate', action: 'Aggregate Analyzed Topics', description: 'Rassemble les dossiers de la période' },
      { id: 3, module: 'ai/synthesize', action: 'Generate Executive Briefing', description: 'Rédige le récapitulatif exécutif' },
      { id: 4, module: 'http/callback', action: 'Save Briefing in STARS', description: 'Met à disposition le document PDF/web' },
    ],
  },
  [WorkflowType.NOTIFICATION]: {
    workflow: WorkflowType.NOTIFICATION,
    name: 'STARS — Hub de Notifications & Alertes',
    description: 'Diffusion d’alertes multi-canal (app, email, webhook) lors des événements clés du cycle éditorial.',
    version: '1.0.0',
    estimatedOperations: 3,
    trigger: 'Événement métier dans STARS',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Event Alert', description: 'Reçoit le type d’alerte et l’utilisateur ciblé' },
      { id: 2, module: 'format/template', action: 'Render Notification', description: 'Formate le message selon le canal' },
      { id: 3, module: 'dispatch/channel', action: 'Send Notification', description: 'Délivre l’alerte à l’utilisateur' },
    ],
  },
  [WorkflowType.ANALYTICS]: {
    workflow: WorkflowType.ANALYTICS,
    name: 'STARS — Synchronisation des Métriques Réseaux',
    description: 'Récupération périodique des statistiques d’engagement réelles (impressions, clics, partages) rattachées au tenant.',
    version: '1.0.0',
    estimatedOperations: 4,
    trigger: 'Synchronisation programmée',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Query Connected Accounts', description: 'Liste les comptes sociaux du tenant' },
      { id: 2, module: 'social/analytics', action: 'Fetch Platform Metrics', description: 'Récupère les métriques authentiques' },
      { id: 3, module: 'http/callback', action: 'Store Analytics Snapshot', description: 'Persiste les snapshots dans STARS sans métriques inventées' },
    ],
  },
  [WorkflowType.COMMENT_SYNC]: {
    workflow: WorkflowType.COMMENT_SYNC,
    name: 'STARS — Synchronisation & Réconciliation des Commentaires',
    description: 'Réception des webhooks plateformes et polling de réconciliation incrémentale des commentaires sociaux.',
    version: '1.0.0',
    estimatedOperations: 4,
    trigger: 'Webhook Social Platform ou Réconciliation programmée',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Comment Events', description: 'Capture les nouveaux commentaires Facebook, Instagram, LinkedIn ou X' },
      { id: 2, module: 'tools/normalizer', action: 'Normalize Comment Schema', description: 'Standardise l’identifiant externe, l’auteur et le contenu' },
      { id: 3, module: 'dedup/checker', action: 'Check External ID', description: 'Évite toute ré-ingestion de commentaire déjà persisté' },
      { id: 4, module: 'http/callback', action: 'Commit to STARS Hub', description: 'Transmet le commentaire au tenant STARS' },
    ],
  },
  [WorkflowType.COMMENT_QUALIFICATION]: {
    workflow: WorkflowType.COMMENT_QUALIFICATION,
    name: 'STARS — Classification & Priorisation des Commentaires',
    description: 'Analyse NLP du sentiment, intention, détection des risques et calcul du score de priorité 0-100.',
    version: '1.0.0',
    estimatedOperations: 3,
    trigger: 'Arrivée d’un nouveau commentaire dans le Hub',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Comment Text', description: 'Reçoit le texte pseudonymisé du commentaire' },
      { id: 2, module: 'ai/nlp_classifier', action: 'Classify & Score', description: 'Évalue le sentiment, la catégorie (question, lead, réclamation) et la priorité' },
      { id: 3, module: 'http/callback', action: 'Return Qualification JSON', description: 'Met à jour la fiche commentaire avec ses facteurs de priorité' },
    ],
  },
  [WorkflowType.COMMENT_REPLY_SUGGESTION]: {
    workflow: WorkflowType.COMMENT_REPLY_SUGGESTION,
    name: 'STARS — Copilot de Suggestions de Réponses',
    description: 'Génération de variantes de réponse respectant la Brand Voice et la politique de modération.',
    version: '1.0.0',
    estimatedOperations: 4,
    trigger: 'Demande manuelle ou ouverture du commentaire par l’opérateur',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Context & Voice', description: 'Reçoit le post d’origine, le fil de discussion et la Brand Voice' },
      { id: 2, module: 'ai/copilot', action: 'Generate Nuanced Variants', description: 'Produit les réponses courte, experte, commerciale, empathique, etc.' },
      { id: 3, module: 'safety/guard', action: 'Check Sensitivity & Risks', description: 'Vérifie l’absence d’auto-réponse sur des sujets interdits' },
      { id: 4, module: 'http/callback', action: 'Deliver Suggestions to UI', description: 'Présente les propositions modifiables dans le panneau Copilot' },
    ],
  },
  [WorkflowType.CRISIS_ALERT]: {
    workflow: WorkflowType.CRISIS_ALERT,
    name: 'STARS — Crisis Radar & Détection d’Anomalies',
    description: 'Surveillance des hausses anormales de négativité, polémiques multiréseaux et suspension préventive des automatismes.',
    version: '1.0.0',
    estimatedOperations: 5,
    trigger: 'Détection d’un pic de négativité ou mention critique',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Aggregate Sentiment Trends', description: 'Surveille les signaux sur 1h à 24h' },
      { id: 2, module: 'analytics/anomaly', action: 'Detect Negative Surges', description: 'Identifie les polémiques virales ou risques juridiques' },
      { id: 3, module: 'safety/halt', action: 'Pause Auto-Responses', description: 'Gèle immédiatement tout automatisme sur le tenant' },
      { id: 4, module: 'http/callback', action: 'Open Crisis Incident in STARS', description: 'Crée l’incident et notifie la cellule de crise' },
    ],
  },
  [WorkflowType.COMMENT_PUBLISH_REPLY]: {
    workflow: WorkflowType.COMMENT_PUBLISH_REPLY,
    name: 'STARS — Publication de Réponse Sociale',
    description: 'Publication de la réponse validée sur l’API du réseau social (LinkedIn, X, Meta) avec idempotence.',
    version: '1.0.0',
    estimatedOperations: 4,
    trigger: 'Clic « Publier la réponse » par un humain habilité',
    modules: [
      { id: 1, module: 'gateway/webhook', action: 'Receive Validated Reply', description: 'Reçoit le texte approuvé et l’ID du commentaire parent' },
      { id: 2, module: 'social/reply', action: 'Post Reply to API', description: 'Appelle l’endpoint de réponse officiel du réseau' },
      { id: 3, module: 'http/callback', action: 'Confirm Published Status', description: 'Enregistre le statut REPLIED et la date exacte' },
    ],
  },
};

