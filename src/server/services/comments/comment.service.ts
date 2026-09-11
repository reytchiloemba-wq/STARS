import { db } from '@/lib/db';
import {
  type SocialNetwork,
  type CommentSentiment,
  type CommentCategory,
  type CommentPriorityLevel,
  type CommentStatus,
  type TeamQueue,
  type IncidentSeverity,
  Prisma,
} from '@prisma/client';

export interface CommentFilterParams {
  organizationId: string;
  inbox?: 'all' | 'unassigned' | 'priority' | 'validation' | 'escalated' | 'closed' | 'spam';
  platform?: SocialNetwork;
  sentiment?: CommentSentiment;
  priorityLevel?: CommentPriorityLevel;
  category?: CommentCategory;
  assignedTeam?: TeamQueue;
  search?: string;
  skip?: number;
  take?: number;
}

export interface IngestCommentInput {
  organizationId: string;
  socialAccountId?: string;
  publicationId?: string;
  parentCommentId?: string;
  platform: SocialNetwork;
  externalCommentId: string;
  externalPostId?: string;
  externalAuthorId?: string;
  authorName: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  content: string;
  publishedAt?: Date;
  sentiment?: CommentSentiment;
  category?: CommentCategory;
  categoryReason?: string;
  postContextSummary?: string;
}

export interface PriorityScoreResult {
  score: number;
  level: CommentPriorityLevel;
  factors: Record<string, number | string>;
}

export class CommentIntelligenceService {
  /**
   * Analyse sémantique heuristique multilingue (FR/EN)
   * Détecte sentiment, catégorie et sensibilité critique
   */
  static analyzeContentNLP(text: string): {
    sentiment: CommentSentiment;
    category: CommentCategory;
    isSensitive: boolean;
    confidence: number;
    reason: string;
  } {
    const lower = text.toLowerCase();

    // 1. Détection des signaux critiques & juridiques (sensibilité extrême)
    const crisisKeywords = [
      'procès', 'plainte', 'avocat', 'fraude', 'arnaque', 'scam', 'escroc',
      'boycott', 'justice', 'tribunal', 'dgccrf', 'police', 'menace', 'diffamation',
      'harcèlement', 'honteux', 'scandale', 'lawsuit', 'sue you', 'fraud', 'illegal',
    ];
    for (const kw of crisisKeywords) {
      if (lower.includes(kw)) {
        return {
          sentiment: 'NEGATIVE',
          category: 'LEGAL_RISK',
          isSensitive: true,
          confidence: 0.95,
          reason: `Signal de risque juridique ou crise détecté via le mot-clé "${kw}"`,
        };
      }
    }

    // 2. Détection d'insultes / toxicité
    const abusiveKeywords = ['connard', 'merde', 'fdp', 'imbécile', 'stupid', 'idiot', 'bullshit', 'fuck'];
    for (const kw of abusiveKeywords) {
      if (lower.includes(kw)) {
        return {
          sentiment: 'NEGATIVE',
          category: 'ABUSIVE',
          isSensitive: true,
          confidence: 0.92,
          reason: `Langage potentiellement abusif détecté ("${kw}")`,
        };
      }
    }

    // 3. Détection des opportunités commerciales / Lead
    const leadKeywords = [
      'combien', 'prix', 'tarif', 'devis', 'démo', 'demo', 'acheter',
      'abonnement', 'offre', 'intéressé', 'contactez-moi', 'rejoindre', 'commander',
      'how much', 'pricing', 'quote', 'book a call', 'interested in',
    ];
    for (const kw of leadKeywords) {
      if (lower.includes(kw)) {
        return {
          sentiment: 'POSITIVE',
          category: 'BUYING_INTENT',
          isSensitive: false,
          confidence: 0.88,
          reason: `Intention commerciale identifiée via "${kw}"`,
        };
      }
    }

    // 4. Détection réclamations & mécontentements
    const complaintKeywords = [
      'bug', 'marche pas', 'ne fonctionne pas', 'bloqué', 'déçu', 'problème',
      'catastrophe', 'nul', 'inadmissible', 'attente', 'erreur', 'broken', 'error', 'failed', 'worst',
    ];
    for (const kw of complaintKeywords) {
      if (lower.includes(kw)) {
        return {
          sentiment: 'NEGATIVE',
          category: 'COMPLAINT',
          isSensitive: false,
          confidence: 0.86,
          reason: `Réclamation ou incident technique exprimé ("${kw}")`,
        };
      }
    }

    // 5. Compliments & Témoignages
    const complimentKeywords = [
      'bravo', 'merci', 'super', 'excellent', 'génial', 'top', 'félicitations',
      'magnifique', 'brillant', 'congrats', 'awesome', 'great work', 'love it', 'kudos',
    ];
    for (const kw of complimentKeywords) {
      if (lower.includes(kw)) {
        return {
          sentiment: 'POSITIVE',
          category: 'COMPLIMENT',
          isSensitive: false,
          confidence: 0.9,
          reason: `Témoignage valorisant ou félicitation ("${kw}")`,
        };
      }
    }

    // 6. Questions & Requêtes d'information
    if (lower.includes('?') || lower.includes('pourquoi') || lower.includes('comment') || lower.includes('est-ce que') || lower.includes('where') || lower.includes('how')) {
      return {
        sentiment: 'NEUTRAL',
        category: 'QUESTION',
        isSensitive: false,
        confidence: 0.82,
        reason: `Interrogation ouverte identifiée`,
      };
    }

    // Neutre par défaut
    return {
      sentiment: 'NEUTRAL',
      category: 'OTHER',
      isSensitive: false,
      confidence: 0.7,
      reason: `Commentaire conversationnel courant`,
    };
  }

  /**
   * Calcul du score de priorité 0 - 100 avec traçabilité des composantes
   */
  static calculatePriorityScore(params: {
    sentiment: CommentSentiment;
    category: CommentCategory;
    isSensitive: boolean;
    content: string;
    postReachTier?: 'LOW' | 'MEDIUM' | 'VIRAL';
  }): PriorityScoreResult {
    let score = 30; // score de base
    const factors: Record<string, number | string> = {};

    // 1. Impact de la sensibilité & du sentiment
    if (params.isSensitive) {
      score += 35;
      factors['sensitivity_alert'] = '+35 (Sujet sensible / risque réputationnel ou légal)';
    }

    if (params.sentiment === 'NEGATIVE') {
      score += 20;
      factors['sentiment_negative'] = '+20 (Sentiment négatif)';
    } else if (params.sentiment === 'RATHER_NEGATIVE') {
      score += 10;
      factors['sentiment_rather_negative'] = '+10 (Sentiment plutôt négatif)';
    } else if (params.sentiment === 'MIXED') {
      score += 5;
      factors['sentiment_mixed'] = '+5 (Sentiment mitigé)';
    }

    // 2. Impact de la catégorie
    if (params.category === 'LEGAL_RISK' || params.category === 'THREAT' || params.category === 'REPUTATION_CRISIS') {
      score += 20;
      factors['category_risk'] = '+20 (Risque juridique, réputationnel ou crise)';
    } else if (params.category === 'BUYING_INTENT' || params.category === 'LEAD') {
      score += 30;
      factors['category_commercial'] = '+30 (Opportunité commerciale directe)';
    } else if (params.category === 'PARTNERSHIP' || params.category === 'MEDIA_REQUEST') {
      score += 20;
      factors['category_strategic'] = '+20 (Opportunité partenariale ou média)';
    } else if (params.category === 'COMPLAINT') {
      score += 20;
      factors['category_complaint'] = '+20 (Réclamation client prioritaire)';
    } else if (params.category === 'QUESTION') {
      score += 15;
      factors['category_question'] = '+15 (Question en attente d’éclaircissement)';
    }

    // 3. Questions / longueur / engagement
    if (params.content.includes('?')) {
      score += 5;
      factors['has_question_mark'] = '+5 (Question explicite formulée)';
    }

    // 4. Contexte de viralité de la publication parente
    if (params.postReachTier === 'VIRAL') {
      score += 15;
      factors['post_viral'] = '+15 (Publication parente à très fort engagement)';
    } else if (params.postReachTier === 'MEDIUM') {
      score += 5;
      factors['post_medium_reach'] = '+5 (Publication parente active)';
    }

    // Borner entre 0 et 100
    const clampedScore = Math.max(0, Math.min(100, score));

    let level: CommentPriorityLevel = 'NORMAL';
    if (clampedScore >= 80) {
      level = 'CRITICAL';
    } else if (clampedScore >= 60) {
      level = 'HIGH';
    } else if (clampedScore < 35) {
      level = 'LOW';
    }

    return {
      score: clampedScore,
      level,
      factors,
    };
  }

  /**
   * Calcul du SLA en fonction du niveau de priorité
   */
  static calculateSlaDueDate(priorityLevel: CommentPriorityLevel, fromDate = new Date()): Date {
    const due = new Date(fromDate.getTime());
    switch (priorityLevel) {
      case 'CRITICAL':
        due.setMinutes(due.getMinutes() + 30); // 30 minutes
        break;
      case 'HIGH':
        due.setHours(due.getHours() + 2); // 2 heures
        break;
      case 'NORMAL':
        due.setHours(due.getHours() + 8); // 8 heures
        break;
      case 'LOW':
        due.setHours(due.getHours() + 24); // 24 heures
        break;
    }
    return due;
  }

  /**
   * Ingestion d'un commentaire avec déduplication stricte et calcul d'intelligence
   */
  static async ingestComment(input: IngestCommentInput) {
    const existing = await db.socialComment.findUnique({
      where: {
        organizationId_platform_externalCommentId: {
          organizationId: input.organizationId,
          platform: input.platform,
          externalCommentId: input.externalCommentId,
        },
      },
    });

    if (existing) {
      return { comment: existing, isDuplicate: true };
    }

    // Analyse sémantique si sentiment ou catégorie non fournis
    let sentiment = input.sentiment;
    let category = input.category;
    let isSensitive = false;
    let confidence = 0.85;
    let categoryReason = input.categoryReason;

    if (!sentiment || !category) {
      const nlp = this.analyzeContentNLP(input.content);
      sentiment = sentiment || nlp.sentiment;
      category = category || nlp.category;
      isSensitive = nlp.isSensitive;
      confidence = nlp.confidence;
      categoryReason = categoryReason || nlp.reason;
    } else {
      isSensitive = ['THREAT', 'LEGAL_RISK', 'REPUTATION_CRISIS', 'ABUSIVE'].includes(category);
    }

    // Calcul de la priorité
    const priority = this.calculatePriorityScore({
      sentiment,
      category,
      isSensitive,
      content: input.content,
    });

    // File d'équipe recommandée
    let assignedTeam: TeamQueue = 'COMMUNITY';
    if (isSensitive || category === 'LEGAL_RISK' || category === 'THREAT') {
      assignedTeam = 'LEGAL';
    } else if (category === 'REPUTATION_CRISIS') {
      assignedTeam = 'CRISIS';
    } else if (category === 'MEDIA_REQUEST') {
      assignedTeam = 'PR';
    } else if (category === 'BUYING_INTENT' || category === 'LEAD') {
      assignedTeam = 'SALES';
    } else if (category === 'COMPLAINT' || category === 'SUPPORT_REQUEST') {
      assignedTeam = 'SUPPORT';
    }

    const slaDueAt = this.calculateSlaDueDate(priority.level, input.publishedAt || new Date());

    const comment = await db.socialComment.create({
      data: {
        organizationId: input.organizationId,
        socialAccountId: input.socialAccountId,
        publicationId: input.publicationId,
        parentCommentId: input.parentCommentId,
        platform: input.platform,
        externalCommentId: input.externalCommentId,
        externalPostId: input.externalPostId,
        externalAuthorId: input.externalAuthorId,
        authorName: input.authorName,
        authorUsername: input.authorUsername,
        authorAvatarUrl: input.authorAvatarUrl,
        content: input.content,
        publishedAt: input.publishedAt || new Date(),
        sentiment,
        category,
        categoryConfidence: confidence,
        categoryReason,
        priorityScore: priority.score,
        priorityLevel: priority.level,
        priorityFactors: priority.factors,
        status: isSensitive ? 'ESCALATED' : 'NEW',
        assignedTeam,
        slaDueAt,
        isSensitive,
        postContextSummary: input.postContextSummary,
      },
    });

    // Audit log de création
    await db.socialCommentAudit.create({
      data: {
        commentId: comment.id,
        toStatus: comment.status,
        reason: 'Ingestion automatique du commentaire depuis la passerelle sociale',
        metadata: {
          platform: input.platform,
          priorityScore: priority.score,
          isSensitive,
        },
      },
    });

    return { comment, isDuplicate: false };
  }

  /**
   * Récupération filtrée des commentaires pour la boîte de réception 3-volets
   */
  static async listComments(params: CommentFilterParams) {
    const where: Prisma.SocialCommentWhereInput = {
      organizationId: params.organizationId,
    };

    // Gestion des dossiers d'inbox
    switch (params.inbox) {
      case 'unassigned':
        where.assignedUserId = null;
        where.status = { notIn: ['CLOSED', 'SPAM', 'HIDDEN', 'DELETED'] };
        break;
      case 'priority':
        where.priorityLevel = { in: ['HIGH', 'CRITICAL'] };
        where.status = { notIn: ['CLOSED', 'SPAM'] };
        break;
      case 'validation':
        where.status = 'VALIDATION_REQUIRED';
        break;
      case 'escalated':
        where.status = 'ESCALATED';
        break;
      case 'closed':
        where.status = 'CLOSED';
        break;
      case 'spam':
        where.status = 'SPAM';
        break;
      case 'all':
      default:
        where.status = { notIn: ['SPAM', 'DELETED'] };
        break;
    }

    if (params.platform) {
      where.platform = params.platform;
    }
    if (params.sentiment) {
      where.sentiment = params.sentiment;
    }
    if (params.priorityLevel) {
      where.priorityLevel = params.priorityLevel;
    }
    if (params.category) {
      where.category = params.category;
    }
    if (params.assignedTeam) {
      where.assignedTeam = params.assignedTeam;
    }
    if (params.search) {
      where.OR = [
        { content: { contains: params.search, mode: 'insensitive' } },
        { authorName: { contains: params.search, mode: 'insensitive' } },
        { authorUsername: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [totalCount, comments] = await Promise.all([
      db.socialComment.count({ where }),
      db.socialComment.findMany({
        where,
        orderBy: [
          { priorityScore: 'desc' },
          { publishedAt: 'desc' },
        ],
        skip: params.skip || 0,
        take: params.take || 50,
        include: {
          socialAccount: {
            select: { id: true, displayName: true, network: true },
          },
          publication: {
            select: { id: true, status: true },
          },
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
          internalNotes: {
            orderBy: { createdAt: 'desc' },
            include: {
              author: { select: { id: true, name: true, email: true } },
            },
          },
          suggestions: {
            orderBy: { createdAt: 'desc' },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              actor: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    // Calcul dynamique de l'état SLA
    const now = new Date();
    const enrichedComments = comments.map((c) => {
      const isBreached = c.slaDueAt ? c.slaDueAt < now && c.status !== 'REPLIED' && c.status !== 'CLOSED' : false;
      return {
        ...c,
        slaBreached: isBreached,
      };
    });

    return {
      totalCount,
      comments: enrichedComments,
    };
  }

  /**
   * Détails complets d'un commentaire
   */
  static async getCommentDetails(organizationId: string, commentId: string) {
    const comment = await db.socialComment.findFirst({
      where: { id: commentId, organizationId },
      include: {
        socialAccount: true,
        publication: true,
        parentComment: true,
        replies: {
          orderBy: { publishedAt: 'asc' },
        },
        assignedUser: {
          select: { id: true, name: true, email: true },
        },
        replyAuthor: {
          select: { id: true, name: true, email: true },
        },
        internalNotes: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
        suggestions: {
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!comment) throw new Error('Commentaire introuvable pour cette organisation');
    return comment;
  }

  /**
   * Génération de suggestions de réponses IA selon le Brand Voice et les contraintes de gouvernance
   */
  static async generateReplySuggestions(params: {
    organizationId: string;
    commentId: string;
    brandVoiceId?: string;
  }) {
    const comment = await db.socialComment.findFirst({
      where: { id: params.commentId, organizationId: params.organizationId },
    });
    if (!comment) throw new Error('Commentaire introuvable');

    // Récupérer le Brand Voice si spécifié ou actif
    const brandVoice = params.brandVoiceId
      ? await db.brandVoice.findFirst({
          where: { id: params.brandVoiceId, organizationId: params.organizationId },
        })
      : await db.brandVoice.findFirst({
          where: { organizationId: params.organizationId, isActive: true },
        });

    const personaName = brandVoice?.name || 'STARS Brand Voice';

    // RÈGLE STRICTE DE SÉCURITÉ : Sujets sensibles
    if (comment.isSensitive) {
      const sensitiveSuggestion = await db.socialCommentSuggestion.create({
        data: {
          commentId: comment.id,
          variantKey: 'deescalation',
          label: '🔒 Escalade Spécialiste Requise (Sujet Sensible)',
          suggestedReply: `[Sujet sensible détecté : ${comment.categoryReason || 'Risque réputationnel ou légal'}]. Conformément à la politique de gouvernance STARS, toute réponse automatique publique est neutralisée. Merci de consulter la direction juridique/communication ou de répondre via une procédure de médiation privée hors réseaux.`,
          tone: 'Protocolaire et confidentiel',
        },
      });

      return [sensitiveSuggestion];
    }

    // Variantes de réponses adaptées
    const authorGreeting = comment.authorName ? `Bonjour ${comment.authorName.split(' ')[0]}` : 'Bonjour';

    const variants = [
      {
        variantKey: 'short',
        label: '⚡ Courte & Directe',
        suggestedReply: `${authorGreeting}, merci pour votre retour ! Nous restons à votre entière disposition si vous souhaitez approfondir le sujet.`,
        tone: 'Concis et réactif',
      },
      {
        variantKey: 'expert',
        label: '🎓 Experte & Valeur Ajoutée',
        suggestedReply: `${authorGreeting}, c'est un point tout à fait pertinent. Notre analyse montre que l'anticipation stratégique fait précisément la différence sur ce type d'enjeux. N'hésitez pas à consulter nos récentes publications sur le sujet.`,
        tone: 'Analytique et autorité de domaine',
      },
      {
        variantKey: 'commercial',
        label: '💼 Commerciale & Conversion',
        suggestedReply: `${authorGreeting}, ravi de votre intérêt ! Nous serions enchantés de vous présenter une démonstration personnalisée de nos capacités adaptées à vos objectifs. Pouvons-nous échanger par message privé ?`,
        tone: 'Engageant et orienté valeur',
      },
      {
        variantKey: 'educational',
        label: '📚 Pédagogique & Factualité',
        suggestedReply: `${authorGreeting}, merci d'aborder cet aspect. Afin de dissiper tout malentendu, nos données sont issues d'un benchmark vérifié et indépendant. Nous détaillons notre méthodologie en toute transparence.`,
        tone: 'Didactique et bienveillant',
      },
      {
        variantKey: 'empathic',
        label: '🤝 Désescalade & Écoute Active',
        suggestedReply: `${authorGreeting}, nous comprenons parfaitement votre point de vue et nous prenons votre remarque très au sérieux. Venez échanger directement avec notre équipe en message privé afin que nous puissions examiner votre cas en détail.`,
        tone: 'Écoute active et résolution apaisée',
      },
    ];

    // Nettoyer les anciennes suggestions non acceptées
    await db.socialCommentSuggestion.deleteMany({
      where: { commentId: comment.id, isAccepted: false },
    });

    // Enregistrer les nouvelles variantes
    const createdSuggestions = [];
    for (const v of variants) {
      const created = await db.socialCommentSuggestion.create({
        data: {
          commentId: comment.id,
          variantKey: v.variantKey,
          label: v.label,
          suggestedReply: v.suggestedReply,
          tone: v.tone,
        },
      });
      createdSuggestions.push(created);
    }

    return createdSuggestions;
  }

  /**
   * Ajout d'une note interne confidentielle (jamais publiée sur les réseaux)
   */
  static async addInternalNote(params: {
    organizationId: string;
    commentId: string;
    authorId: string;
    body: string;
  }) {
    // Vérification du tenant
    const comment = await db.socialComment.findFirst({
      where: { id: params.commentId, organizationId: params.organizationId },
    });
    if (!comment) throw new Error('Commentaire introuvable pour cette organisation');

    const note = await db.socialCommentNote.create({
      data: {
        commentId: params.commentId,
        authorId: params.authorId,
        body: params.body,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return note;
  }

  /**
   * Transition de statut avec audit log
   */
  static async transitionStatus(params: {
    organizationId: string;
    commentId: string;
    toStatus: CommentStatus;
    actorUserId?: string;
    reason?: string;
    replyContent?: string;
  }) {
    const comment = await db.socialComment.findFirst({
      where: { id: params.commentId, organizationId: params.organizationId },
    });
    if (!comment) throw new Error('Commentaire introuvable');

    const updateData: Prisma.SocialCommentUpdateInput = {
      status: params.toStatus,
    };

    if (params.toStatus === 'REPLIED' && params.replyContent) {
      updateData.replyContent = params.replyContent;
      updateData.repliedAt = new Date();
      if (params.actorUserId) {
        updateData.replyAuthor = { connect: { id: params.actorUserId } };
      }
    }

    const updated = await db.socialComment.update({
      where: { id: params.commentId },
      data: updateData,
    });

    await db.socialCommentAudit.create({
      data: {
        commentId: params.commentId,
        actorUserId: params.actorUserId,
        fromStatus: comment.status,
        toStatus: params.toStatus,
        reason: params.reason || `Transition vers le statut ${params.toStatus}`,
      },
    });

    return updated;
  }

  /**
   * Assignation d'un commentaire à un membre ou équipe
   */
  static async assignComment(params: {
    organizationId: string;
    commentId: string;
    assignedUserId?: string | null;
    assignedTeam?: TeamQueue;
    actorUserId?: string;
  }) {
    const comment = await db.socialComment.findFirst({
      where: { id: params.commentId, organizationId: params.organizationId },
    });
    if (!comment) throw new Error('Commentaire introuvable');

    const updated = await db.socialComment.update({
      where: { id: params.commentId },
      data: {
        assignedUserId: params.assignedUserId,
        assignedTeam: params.assignedTeam || comment.assignedTeam,
        status: params.assignedUserId && comment.status === 'NEW' ? 'ASSIGNED' : comment.status,
      },
    });

    await db.socialCommentAudit.create({
      data: {
        commentId: params.commentId,
        actorUserId: params.actorUserId,
        fromStatus: comment.status,
        toStatus: updated.status,
        reason: `Assignation mise à jour (Équipe: ${params.assignedTeam || comment.assignedTeam}, Membre: ${params.assignedUserId || 'Non assigné'})`,
      },
    });

    return updated;
  }

  /**
   * Transformer un commentaire en opportunité commerciale ou ticket
   */
  static async convertToOpportunity(params: {
    organizationId: string;
    commentId: string;
    actorUserId: string;
    type: 'LEAD' | 'SUPPORT_TICKET' | 'TASK';
  }) {
    const comment = await db.socialComment.findFirst({
      where: { id: params.commentId, organizationId: params.organizationId },
    });
    if (!comment) throw new Error('Commentaire introuvable');

    const targetId = `crm_${params.type.toLowerCase()}_${Date.now()}`;

    const updated = await db.socialComment.update({
      where: { id: params.commentId },
      data: {
        convertedToType: params.type,
        convertedTargetId: targetId,
        assignedTeam: params.type === 'LEAD' ? 'SALES' : params.type === 'SUPPORT_TICKET' ? 'SUPPORT' : 'COMMUNITY',
      },
    });

    await db.socialCommentAudit.create({
      data: {
        commentId: params.commentId,
        actorUserId: params.actorUserId,
        fromStatus: comment.status,
        toStatus: comment.status,
        reason: `Commentaire converti en ${params.type} (Réf: ${targetId})`,
      },
    });

    return { updated, targetId };
  }

  /**
   * Transformer un commentaire en idée de publication éditoriale (Draft)
   */
  static async convertToPublication(params: {
    organizationId: string;
    commentId: string;
    actorUserId: string;
  }) {
    const comment = await db.socialComment.findFirst({
      where: { id: params.commentId, organizationId: params.organizationId },
    });
    if (!comment) throw new Error('Commentaire introuvable');

    // Création d'un brouillon éditorial STARS basé sur l'inspiration du commentaire
    const draftContent = `💡 Rebond suite à un commentaire sur ${comment.platform} de ${comment.authorName} :\n\n"${comment.content}"\n\nNotre perspective stratégique :\n`;

    const draft = await db.draft.create({
      data: {
        organizationId: params.organizationId,
        ownerId: params.actorUserId,
        network: comment.platform,
        status: 'IDEA',
        objective: `Rebond communautaire suite à une question/réaction de ${comment.authorName}`,
        tone: 'Analytique et pédagogique',
        currentContent: draftContent,
      },
    });

    const updated = await db.socialComment.update({
      where: { id: params.commentId },
      data: {
        convertedToType: 'PUBLICATION',
        convertedTargetId: draft.id,
      },
    });

    await db.socialCommentAudit.create({
      data: {
        commentId: params.commentId,
        actorUserId: params.actorUserId,
        fromStatus: comment.status,
        toStatus: comment.status,
        reason: `Commentaire recyclé en brouillon éditorial STARS (Draft #${draft.id})`,
      },
    });

    return { updated, draft };
  }

  /**
   * Détection des anomalies et alertes de crise (STARS Crisis Radar)
   */
  static async detectCrisisAnomaly(organizationId: string) {
    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalRecent, negativeRecent, sensitiveRecent] = await Promise.all([
      db.socialComment.count({
        where: {
          organizationId,
          publishedAt: { gte: past24Hours },
        },
      }),
      db.socialComment.count({
        where: {
          organizationId,
          publishedAt: { gte: past24Hours },
          sentiment: { in: ['NEGATIVE', 'RATHER_NEGATIVE'] },
        },
      }),
      db.socialComment.count({
        where: {
          organizationId,
          publishedAt: { gte: past24Hours },
          isSensitive: true,
        },
      }),
    ]);

    const negativeRatio = totalRecent > 0 ? negativeRecent / totalRecent : 0;
    const isAnomaly = sensitiveRecent >= 2 || (totalRecent >= 5 && negativeRatio >= 0.4);

    if (isAnomaly) {
      const severity: IncidentSeverity = sensitiveRecent >= 3 || negativeRatio >= 0.6 ? 'CRITICAL' : 'WARNING';
      const title = `Alerte Bad Buzz / Crise : ${negativeRecent} réactions négatives sur 24h`;
      const description = `Le radar de modération STARS a détecté une anomalie : ${Math.round(negativeRatio * 100)}% de réactions défavorables sur les dernières 24 heures (${sensitiveRecent} commentaires classés sensibles).`;

      // Vérifier si incident actif existant
      const existingIncident = await db.crisisIncident.findFirst({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
      });

      if (!existingIncident) {
        const incident = await db.crisisIncident.create({
          data: {
            organizationId,
            title,
            severity,
            status: 'ACTIVE',
            description,
            signalsDetected: {
              totalRecent,
              negativeRecent,
              sensitiveRecent,
              negativeRatio,
              detectedAt: new Date().toISOString(),
            },
          },
        });
        return { isCrisis: true, incident, stats: { totalRecent, negativeRecent, sensitiveRecent, negativeRatio } };
      }

      return { isCrisis: true, incident: existingIncident, stats: { totalRecent, negativeRecent, sensitiveRecent, negativeRatio } };
    }

    return { isCrisis: false, incident: null, stats: { totalRecent, negativeRecent, sensitiveRecent, negativeRatio } };
  }
}
