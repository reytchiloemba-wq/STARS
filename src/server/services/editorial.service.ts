import { db } from '@/lib/db';
import {
  type SocialNetwork,
  type EditorialStatus,
  type ApprovalDecision,
  type MediaKind,
  CreditReason,
} from '@prisma/client';
import { deductCredits } from './credits.service';
import { CREDIT_COSTS } from '@/config/pricing';
import { decryptSecret } from '@/lib/crypto';
import { getSocialConnector } from '@/server/adapters/social';

export interface GenerateVariantsParams {
  organizationId: string;
  userId: string;
  topicTitle: string;
  summary: string;
  network: SocialNetwork;
  objective?: string;
  tone?: string;
  brandVoiceId?: string;
  includeSources?: boolean;
  sourceUrls?: string[];
}

export interface PostVariantItem {
  id: string;
  label: 'concise' | 'expert' | 'executive' | 'pedagogical' | 'high-engagement';
  name: string;
  content: string;
  hashtags: string[];
  suggestedHook: string;
  suggestedCta: string;
}

export class EditorialService {
  /**
   * Génère les 5 variantes éditoriales pour un réseau donné
   */
  static async generateVariants(params: GenerateVariantsParams): Promise<PostVariantItem[]> {
    let brandVoice = null;
    if (params.brandVoiceId) {
      brandVoice = await db.brandVoice.findFirst({
        where: { id: params.brandVoiceId, organizationId: params.organizationId },
      });
    }

    const baseTone = params.tone || brandVoice?.tone || 'analytique et professionnel';
    const baseCta = brandVoice?.callToAction || 'Et vous, quel est votre regard sur cette évolution ? Partageons nos avis en commentaire.';
    const defaultHashtags = brandVoice?.hashtags && brandVoice.hashtags.length > 0
      ? brandVoice.hashtags
      : ['#VeilleStrategique', '#IntelligenceEconomique', '#Innovation'];
    const sourcesFootnote = params.includeSources && params.sourceUrls?.length
      ? `\n\n📌 Sources vérifiées :\n${params.sourceUrls.map((s) => `• ${s}`).join('\n')}`
      : '';

    const variants: PostVariantItem[] = [
      {
        id: 'var-concise',
        label: 'concise',
        name: 'Version Concise',
        suggestedHook: `⚡ En 60 secondes : ce qu'il faut savoir sur ${params.topicTitle}`,
        content: `⚡ En 60 secondes : ${params.topicTitle}.\n\n` +
          `L'essentiel : ${params.summary.slice(0, 200)}...\n\n` +
          `Ce qu'il faut retenir :\n` +
          `1. Les signaux confirment une transformation majeure du secteur.\n` +
          `2. Les opportunités d'anticipation dépassent les risques identifiés.\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: defaultHashtags.slice(0, 3),
        suggestedCta: baseCta,
      },
      {
        id: 'var-expert',
        label: 'expert',
        name: 'Version Experte',
        suggestedHook: `🔬 Décryptage technique & méthodologique : ${params.topicTitle}`,
        content: `🔬 Décryptage approfondi : ${params.topicTitle}.\n\n` +
          `Au-delà des annonces superficielles, analysons les composantes structurelles :\n\n` +
          `• Contexte et causalité : ${params.summary}\n` +
          `• Analyse contradictoire : la balance bénéfice/risque révèle des écarts notables entre projections et mise en œuvre réelle.\n` +
          `• Recommandation : prioriser la conformité et l'audit continu des métriques clés.\n\n` +
          `Les données actuelles démontrent l'importance d'une gouvernance rigoureuse.\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: [...defaultHashtags, '#AnalyseSectorielle', '#Expertise'],
        suggestedCta: 'Retrouvez les indicateurs détaillés et confrontons nos analyses.',
      },
      {
        id: 'var-executive',
        label: 'executive',
        name: 'Version Dirigeant',
        suggestedHook: `🎯 Vision C-Level : Pourquoi ${params.topicTitle} impacte votre feuille de route stratégique`,
        content: `🎯 Perspective Dirigeant : ${params.topicTitle}.\n\n` +
          `Dans un environnement de marché volatile, les décideurs doivent trancher rapidement sur trois priorités :\n\n` +
          `1. L'impact opérationnel direct sur nos chaînes de valeur.\n` +
          `2. La résilience des équipes face aux nouvelles réglementations.\n` +
          `3. L'avantage compétitif réservé aux premiers entrants crédibles.\n\n` +
          `Notre rôle n'est pas de subir l'actualité, mais d'en extraire un cap clair pour l'organisation.\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: ['#Leadership', '#Strategie', '#Decideurs'],
        suggestedCta: 'Quelles sont vos priorités d’arbitrage pour les prochains trimestres ?',
      },
      {
        id: 'var-pedagogical',
        label: 'pedagogical',
        name: 'Version Pédagogique',
        suggestedHook: `💡 Comprendre simplement : ${params.topicTitle}`,
        content: `💡 Pourquoi tout le monde parle de : ${params.topicTitle} ?\n\n` +
          `Si vous n'avez pas suivi le sujet, voici l'explication simple en 3 points :\n\n` +
          `🔹 D'où part-on ? ${params.summary.slice(0, 150)}...\n` +
          `🔹 Quel est le débat ? Les partisans soulignent l'accélération des gains, tandis que les contradicteurs alertent sur les coûts cachés.\n` +
          `🔹 Ce que ça change pour vous : une adaptation nécessaire de nos pratiques quotidiennes.\n\n` +
          `L'intelligence commence par la clarté.\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: ['#Pedagogie', '#Comprendre', '#Decouverte'],
        suggestedCta: 'Enregistrez ce post pour le relire à tête reposée !',
      },
      {
        id: 'var-high-engagement',
        label: 'high-engagement',
        name: 'Version Forte en Engagement',
        suggestedHook: `🔥 L'erreur que 90% commettent sur ${params.topicTitle} :`,
        content: `🔥 On entend tout et son contraire sur : ${params.topicTitle}.\n\n` +
          `Et si le véritable enjeu n'était pas celui que les médias mettent en avant ?\n\n` +
          `${params.summary}\n\n` +
          `Les faits établis montrent qu'il y a deux camps bien distincts.\n` +
          `D'un côté, ceux qui attendent que la vague passe.\n` +
          `De l'autre, ceux qui structurent leur position dès aujourd'hui.\n\n` +
          `Dans quel camp vous situez-vous ? Votez ou réagissez ci-dessous 👇\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: ['#Debat', '#Innovation', '#Opinion'],
        suggestedCta: 'Donnez votre avis tranché en commentaire : opportunité réelle ou effet de mode ?',
      },
    ];

    return variants;
  }

  /**
   * Crée ou met à jour un brouillon dans l'organisation
   */
  static async saveDraft(params: {
    organizationId: string;
    userId: string;
    draftId?: string;
    topicId?: string;
    brandVoiceId?: string;
    network: SocialNetwork;
    objective?: string;
    tone?: string;
    content: string;
    variantLabel?: string;
  }) {
    if (params.draftId) {
      const existing = await db.draft.findFirst({
        where: { id: params.draftId, organizationId: params.organizationId },
      });
      if (!existing) throw new Error('Brouillon introuvable ou accès refusé');

      const updated = await db.draft.update({
        where: { id: params.draftId },
        data: {
          currentContent: params.content,
          network: params.network,
          objective: params.objective,
          tone: params.tone,
          brandVoiceId: params.brandVoiceId,
        },
      });

      await db.draftVersion.create({
        data: {
          draftId: updated.id,
          authorId: params.userId,
          content: params.content,
          variantLabel: params.variantLabel,
        },
      });

      return updated;
    }

    const created = await db.draft.create({
      data: {
        organizationId: params.organizationId,
        ownerId: params.userId,
        topicId: params.topicId,
        brandVoiceId: params.brandVoiceId,
        network: params.network,
        objective: params.objective,
        tone: params.tone,
        currentContent: params.content,
        status: 'DRAFT',
      },
    });

    await db.draftVersion.create({
      data: {
        draftId: created.id,
        authorId: params.userId,
        content: params.content,
        variantLabel: params.variantLabel,
      },
    });

    return created;
  }

  /**
   * Ajoute un commentaire sur un brouillon
   */
  static async addComment(params: {
    organizationId: string;
    userId: string;
    draftId: string;
    body: string;
  }) {
    const draft = await db.draft.findFirst({
      where: { id: params.draftId, organizationId: params.organizationId },
    });
    if (!draft) throw new Error('Brouillon introuvable');

    return db.comment.create({
      data: {
        draftId: params.draftId,
        authorId: params.userId,
        body: params.body,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  /**
   * Valide ou demande des modifications sur un brouillon
   */
  static async submitApproval(params: {
    organizationId: string;
    approverId: string;
    draftId: string;
    decision: ApprovalDecision;
    note?: string;
  }) {
    const draft = await db.draft.findFirst({
      where: { id: params.draftId, organizationId: params.organizationId },
    });
    if (!draft) throw new Error('Brouillon introuvable');

    const approval = await db.approval.create({
      data: {
        organizationId: params.organizationId,
        draftId: params.draftId,
        approverId: params.approverId,
        decision: params.decision,
        note: params.note,
      },
    });

    const newStatus: EditorialStatus =
      params.decision === 'APPROVED'
        ? 'APPROVED'
        : params.decision === 'CHANGES_REQUESTED'
        ? 'CHANGES_REQUESTED'
        : 'IDEA';

    await db.draft.update({
      where: { id: params.draftId },
      data: { status: newStatus },
    });

    return approval;
  }

  /**
   * Génère ou enregistre une illustration pour un brouillon
   */
  static async attachIllustration(params: {
    organizationId: string;
    userId: string;
    draftId?: string;
    kind: MediaKind;
    url: string;
    altText?: string;
    aiPrompt?: string;
    aiGenerated?: boolean;
    licenseNote?: string;
  }) {
    if (params.aiGenerated) {
      await deductCredits(
        params.organizationId,
        CREDIT_COSTS.AI_ILLUSTRATION,
        CreditReason.AI_ILLUSTRATION,
        { prompt: params.aiPrompt },
      );
    }

    return db.mediaAsset.create({
      data: {
        organizationId: params.organizationId,
        draftId: params.draftId,
        kind: params.kind,
        url: params.url,
        altText: params.altText,
        aiPrompt: params.aiPrompt,
        aiGenerated: !!params.aiGenerated,
        licenseNote: params.licenseNote,
      },
    });
  }

  /**
   * Programme ou publie immédiatement un post sur un ou plusieurs réseaux.
   *
   * CRITICAL invariant: a Publication/PublicationTarget is only ever marked
   * PUBLISHED after the real social connector (src/server/adapters/social)
   * confirms success for that specific account — never optimistically. A
   * prior version of this method fabricated success (fake externalPostId,
   * no network call at all); that was a real bug, not a design choice — see
   * README "What's real vs. demo data".
   */
  static async publishOrSchedule(params: {
    organizationId: string;
    userId: string;
    draftId: string;
    socialAccountIds: string[];
    scheduledAt?: Date;
    timezone?: string;
  }) {
    const draft = await db.draft.findFirst({
      where: { id: params.draftId, organizationId: params.organizationId },
    });
    if (!draft) throw new Error('Brouillon introuvable');

    const accounts = await db.socialAccount.findMany({
      where: {
        id: { in: params.socialAccountIds },
        organizationId: params.organizationId,
        status: 'ACTIVE',
      },
    });
    if (accounts.length === 0) {
      throw new Error("Aucun compte social actif sélectionné — connectez un compte dans Paramètres > Réseaux sociaux.");
    }

    const idempotencyKey = `pub-${draft.id}-${crypto.randomUUID()}`;
    const isScheduled = !!params.scheduledAt && params.scheduledAt > new Date();

    const publication = await db.publication.create({
      data: {
        organizationId: params.organizationId,
        draftId: draft.id,
        idempotencyKey,
        status: isScheduled ? 'SCHEDULED' : 'PUBLISHING',
      },
    });

    if (isScheduled && params.scheduledAt) {
      // Actual delivery for a scheduled post requires a background worker
      // (not built yet — see README known limitations) that would call the
      // same connectors below when `runAt` arrives. Only the schedule record
      // is created here; nothing is claimed as published.
      for (const acc of accounts) {
        await db.publicationTarget.create({
          data: { publicationId: publication.id, socialAccountId: acc.id, status: 'SCHEDULED' },
        });
      }
      await db.schedule.create({
        data: {
          organizationId: params.organizationId,
          publicationId: publication.id,
          runAt: params.scheduledAt,
          timezone: params.timezone || 'Europe/Paris',
        },
      });
      await db.draft.update({ where: { id: draft.id }, data: { status: 'SCHEDULED' } });
      return publication;
    }

    // Immediate publish: call the real connector for each account and
    // record its actual result — one account's failure never contaminates
    // another's, and none of this is ever inferred without a real API call.
    let allSucceeded = true;
    for (const acc of accounts) {
      let accessToken: string;
      try {
        accessToken = decryptSecret(acc.accessTokenEnc);
      } catch {
        allSucceeded = false;
        await db.publicationTarget.create({
          data: {
            publicationId: publication.id,
            socialAccountId: acc.id,
            status: 'FAILED',
            errorMessage: "Impossible de déchiffrer le jeton d'accès de ce compte — reconnectez-le.",
          },
        });
        continue;
      }

      const connector = getSocialConnector(acc.network);
      const result = await connector.publish({
        organizationId: params.organizationId,
        socialAccountExternalId: acc.externalId,
        accessToken,
        network: acc.network,
        content: draft.currentContent ?? '',
        mediaUrls: [],
        idempotencyKey: `${idempotencyKey}-${acc.id}`,
      });

      if (!result.success) allSucceeded = false;

      await db.publicationTarget.create({
        data: {
          publicationId: publication.id,
          socialAccountId: acc.id,
          status: result.success ? 'PUBLISHED' : 'FAILED',
          externalPostId: result.success ? result.externalPostId : null,
          errorMessage: result.success ? null : result.errorMessage,
          publishedAt: result.success ? new Date() : null,
        },
      });
    }

    const finalStatus = allSucceeded ? 'PUBLISHED' : 'FAILED';
    await db.publication.update({ where: { id: publication.id }, data: { status: finalStatus } });
    await db.draft.update({ where: { id: draft.id }, data: { status: allSucceeded ? 'PUBLISHED' : 'FAILED' } });

    return db.publication.findUniqueOrThrow({ where: { id: publication.id } });
  }
}
