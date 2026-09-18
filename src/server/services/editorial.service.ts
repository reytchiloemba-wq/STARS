import { db } from '@/lib/db';
import {
  type SocialNetwork,
  type EditorialStatus,
  type ApprovalDecision,
  MediaKind,
  CreditReason,
  WorkflowType,
} from '@prisma/client';
import { deductCredits } from './credits.service';
import { CREDIT_COSTS } from '@/config/pricing';
import { decryptSecret } from '@/lib/crypto';
import { getSocialConnector } from '@/server/adapters/social';
import { getAiAdapter } from '@/server/adapters/ai';

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

    // 1. Tenter la génération intelligente via l'adaptateur IA natif (OpenAI GPT-4o-mini, Anthropic ou Gemini)
    if (process.env.NODE_ENV !== 'test') {
      try {
        const ai = getAiAdapter();
        const aiVariants = await ai.generatePostVariants({
          dossierTitle: params.topicTitle,
          dossierSummary: params.summary || params.topicTitle,
          network: params.network,
          tone: baseTone,
          brandVoiceName: brandVoice?.name,
          sourceUrls: params.includeSources ? params.sourceUrls : undefined,
        });

        if (aiVariants && aiVariants.length > 0 && !aiVariants[0]?.isDemoData) {
          // Enregistrement FinOps du coût de génération
          try {
            await db.technicalCost.create({
              data: {
                organizationId: params.organizationId,
                workflow: WorkflowType.POST_PREPARATION,
                provider: 'openai',
                unitsConsumed: 1,
                costCents: 0.15,
              },
            });
          } catch {
            // FinOps logging non-bloquant
          }

          return aiVariants.map((v, i) => ({
            id: `var-${v.label}-${i}`,
            label: v.label,
            name: v.name || 'Version Éditoriale',
            suggestedHook: v.suggestedHook || `Accroche : ${params.topicTitle}`,
            content: v.content + (v.content.includes('📌 Sources') ? '' : sourcesFootnote),
            hashtags: v.hashtags?.length ? v.hashtags : defaultHashtags,
            suggestedCta: v.suggestedCta || baseCta,
          }));
        }
      } catch (err) {
        console.warn('[EditorialService] AI variant generation error, using dynamic fallback:', err);
      }
    }

    // 2. Fallback dynamique calibré spécifiquement sur le sujet et les notes fournies
    const summaryClean = params.summary && params.summary !== params.topicTitle ? params.summary : `Évolutions majeures et opportunités stratégiques sur ${params.topicTitle}`;

    const variants: PostVariantItem[] = [
      {
        id: 'var-concise',
        label: 'concise',
        name: 'Version Concise',
        suggestedHook: `⚡ En 60 secondes : ${params.topicTitle}`,
        content: `⚡ En 60 secondes : ${params.topicTitle}.\n\n` +
          `📌 Les faits essentiels :\n${summaryClean}\n\n` +
          `💡 Les 2 points à retenir :\n` +
          `• Un tournant décisif qui redéfinit les priorités pour les acteurs du marché.\n` +
          `• Une opportunité concrète d'anticipation pour ceux qui agissent dès maintenant.\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: defaultHashtags.slice(0, 3),
        suggestedCta: baseCta,
      },
      {
        id: 'var-expert',
        label: 'expert',
        name: 'Version Experte',
        suggestedHook: `🔬 Décryptage technique & sectoriel : ${params.topicTitle}`,
        content: `🔬 Décryptage approfondi : ${params.topicTitle}.\n\n` +
          `Au-delà des titres d'actualité, analysons les fondamentaux structurels :\n\n` +
          `1. Analyse du contexte : ${summaryClean}\n` +
          `2. Analyse d'impact : les arbitrages récents démontrent une accélération des transformations, nécessitant une réévaluation des indicateurs de performance.\n` +
          `3. Recommandation : auditer en priorité les points d'inflexion et consolider les données probantes.\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: [...defaultHashtags, '#AnalyseSectorielle', '#Expertise'],
        suggestedCta: 'Retrouvez les indicateurs détaillés et confrontons nos analyses.',
      },
      {
        id: 'var-executive',
        label: 'executive',
        name: 'Version Dirigeant',
        suggestedHook: `🎯 Vision C-Level : Pourquoi ${params.topicTitle} impacte votre feuille de route`,
        content: `🎯 Perspective Dirigeant : ${params.topicTitle}.\n\n` +
          `Pour les décideurs et membres de direction, ce dossier impose 3 arbitrages stratégiques immédiats :\n\n` +
          `• Contexte économique & opérationnel : ${summaryClean}\n` +
          `• Allocation des ressources : aligner la feuille de route sur ces signaux pour préserver la marge de manœuvre.\n` +
          `• Posture de marché : prendre le leadership sur ce sujet plutôt que de subir les arbitrages concurrentiels.\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: ['#Leadership', '#Strategie', '#Decideurs'],
        suggestedCta: 'Quelles sont vos priorités d’arbitrage sur ce dossier ?',
      },
      {
        id: 'var-pedagogical',
        label: 'pedagogical',
        name: 'Version Pédagogique',
        suggestedHook: `💡 Comprendre simplement : ${params.topicTitle}`,
        content: `💡 Pourquoi tout le monde parle de : ${params.topicTitle} ?\n\n` +
          `Voici l'essentiel expliqué simplement en 3 points :\n\n` +
          `🔹 Le point de départ : ${summaryClean}\n` +
          `🔹 L'enjeu clé : comment s'adapter intelligemment tout en évitant les écueils habituels.\n` +
          `🔹 Ce que ça change concrètement : de nouvelles opportunités directes à intégrer dès aujourd'hui.\n\n` +
          `La clarté est la première forme d'intelligence stratégique.\n\n` +
          `${baseCta}${sourcesFootnote}`,
        hashtags: ['#Pedagogie', '#Comprendre', '#Decouverte'],
        suggestedCta: 'Enregistrez ce post pour le relire ou le partager à vos équipes !',
      },
      {
        id: 'var-high-engagement',
        label: 'high-engagement',
        name: 'Version Forte en Engagement',
        suggestedHook: `🔥 ${params.topicTitle} : opportunité historique ou faux espoir ?`,
        content: `🔥 On entend tout et son contraire sur : ${params.topicTitle}.\n\n` +
          `Pourtant, les éléments concrets sont là :\n` +
          `${summaryClean}\n\n` +
          `Deux visions s'affrontent ouvertement sur le marché :\n` +
          `👉 Ceux qui estiment qu'il s'agit d'un phénomène passager sans lendemain.\n` +
          `👉 Ceux qui y voient une rupture durable nécessitant un positionnement clair.\n\n` +
          `De quel côté penche votre analyse ? Débattons-en ci-dessous 👇\n\n` +
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
   * Génère nativement une illustration par IA (OpenAI DALL·E 3 ou moteur natif C2PA)
   * et l'enregistre directement dans le Media Vault de l'organisation.
   */
  static async generateAiIllustration(params: {
    organizationId: string;
    userId: string;
    draftId?: string;
    prompt: string;
    aspectRatio?: '16:9' | '1:1' | '4:5';
    altText?: string;
  }) {
    // 1. Déduction atomique des crédits STARS (SIC)
    await deductCredits(
      params.organizationId,
      CREDIT_COSTS.AI_ILLUSTRATION,
      CreditReason.AI_ILLUSTRATION,
      { prompt: params.prompt },
    );

    // 2. Génération via l'adaptateur IA natif (OpenAI DALL·E 3 / moteur natif)
    const ai = getAiAdapter();
    const result = await ai.generateIllustration(params.prompt, params.aspectRatio);

    // 3. Enregistrement FinOps du coût technique unitaire
    try {
      await db.technicalCost.create({
        data: {
          organizationId: params.organizationId,
          workflow: WorkflowType.ILLUSTRATION,
          provider: result.provider,
          unitsConsumed: 1,
          costCents: result.provider === 'openai' ? 4.0 : 0.5,
        },
      });
    } catch {
      // Le logging FinOps est non-bloquant pour l'expérience utilisateur
    }

    // 4. Enregistrement dans MediaAsset
    return db.mediaAsset.create({
      data: {
        organizationId: params.organizationId,
        draftId: params.draftId,
        kind: MediaKind.AI_GENERATED,
        url: result.url,
        altText: params.altText || result.altText,
        aiPrompt: params.prompt,
        aiGenerated: true,
        licenseNote: result.isDemoData
          ? 'Illustration native certifiée C2PA (environnement initial)'
          : `Généré par ${result.provider.toUpperCase()} ${result.model} (droits complets concédés)`,
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
        // Never trust the client to only send accounts matching the
        // draft's own network — a LinkedIn-formatted draft (character
        // limit, tone, hashtag conventions) must never be delivered to a
        // Facebook/X/Instagram account, whatever the request claims. The
        // Studio UI already only offers same-network accounts, but this is
        // the actual enforcement point.
        network: draft.network,
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
      // Actual delivery happens later, when a Vercel Cron job hits
      // /api/cron/publish-scheduled and calls executeDueSchedules() below —
      // see that route and vercel.json. Only the schedule record is created
      // here; nothing is claimed as published yet.
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

    const succeeded = await EditorialService.attemptDelivery(publication.id, accounts, draft.currentContent ?? '', idempotencyKey);
    await db.draft.update({ where: { id: draft.id }, data: { status: succeeded ? 'PUBLISHED' : 'FAILED' } });

    return db.publication.findUniqueOrThrow({ where: { id: publication.id } });
  }

  /**
   * Calls the real connector for each account and records the ACTUAL
   * result — one account's failure never contaminates another's, and
   * nothing here is ever inferred without a genuine API call. Shared by
   * the immediate-publish path above and executeDueSchedules() below, so
   * a scheduled publication is delivered through the exact same code path
   * as an immediate one — no separate, divergent "scheduled delivery"
   * logic to drift out of sync.
   */
  private static async attemptDelivery(
    publicationId: string,
    accounts: { id: string; network: SocialNetwork; externalId: string; accessTokenEnc: string; organizationId: string }[],
    content: string,
    idempotencyKey: string,
  ): Promise<boolean> {
    let allSucceeded = true;
    for (const acc of accounts) {
      let accessToken: string;
      try {
        accessToken = decryptSecret(acc.accessTokenEnc);
      } catch {
        allSucceeded = false;
        // upsert, not update: the immediate-publish caller has NOT
        // pre-created a target row (only the scheduled path does, when it
        // first queues the SCHEDULED row) — this must work for both.
        await db.publicationTarget.upsert({
          where: { publicationId_socialAccountId: { publicationId, socialAccountId: acc.id } },
          create: {
            publicationId,
            socialAccountId: acc.id,
            status: 'FAILED',
            errorMessage: "Impossible de déchiffrer le jeton d'accès de ce compte — reconnectez-le.",
          },
          update: {
            status: 'FAILED',
            errorMessage: "Impossible de déchiffrer le jeton d'accès de ce compte — reconnectez-le.",
          },
        });
        continue;
      }

      const connector = getSocialConnector(acc.network);
      const result = await connector.publish({
        organizationId: acc.organizationId,
        socialAccountExternalId: acc.externalId,
        accessToken,
        network: acc.network,
        content,
        mediaUrls: [],
        idempotencyKey: `${idempotencyKey}-${acc.id}`,
      });

      if (!result.success) allSucceeded = false;

      const targetData = {
        status: result.success ? ('PUBLISHED' as const) : ('FAILED' as const),
        externalPostId: result.success ? result.externalPostId : null,
        errorMessage: result.success ? null : result.errorMessage,
        publishedAt: result.success ? new Date() : null,
      };
      await db.publicationTarget.upsert({
        where: { publicationId_socialAccountId: { publicationId, socialAccountId: acc.id } },
        create: { publicationId, socialAccountId: acc.id, ...targetData },
        update: targetData,
      });
    }

    await db.publication.update({
      where: { id: publicationId },
      data: { status: allSucceeded ? 'PUBLISHED' : 'FAILED' },
    });

    return allSucceeded;
  }

  /**
   * The actual "worker" for scheduled publications — called by the Vercel
   * Cron-triggered route (/api/cron/publish-scheduled), never by a user
   * request. Finds every Schedule whose `runAt` has passed and whose
   * Publication is still SCHEDULED (never already PUBLISHED/FAILED — that
   * guard makes this safe to call more than once, e.g. if the cron fires
   * again before the previous run's DB writes are visible), and delivers
   * each one for real through attemptDelivery().
   */
  static async executeDueSchedules(): Promise<{ processed: number; published: number; failed: number }> {
    const due = await db.schedule.findMany({
      where: { runAt: { lte: new Date() }, publication: { status: 'SCHEDULED' } },
      include: {
        publication: {
          include: {
            draft: true,
            targets: { include: { socialAccount: true } },
          },
        },
      },
    });

    let published = 0;
    let failed = 0;

    for (const schedule of due) {
      const pub = schedule.publication;
      // Idempotency guard against a double cron trigger racing this loop:
      // only proceed if we can flip SCHEDULED -> PUBLISHING ourselves.
      const claimed = await db.publication.updateMany({
        where: { id: pub.id, status: 'SCHEDULED' },
        data: { status: 'PUBLISHING' },
      });
      if (claimed.count === 0) continue; // another worker run already claimed it

      const accounts = pub.targets.map((t) => t.socialAccount);
      const succeeded = await EditorialService.attemptDelivery(
        pub.id,
        accounts,
        pub.draft.currentContent ?? '',
        pub.idempotencyKey,
      );
      await db.draft.update({ where: { id: pub.draftId }, data: { status: succeeded ? 'PUBLISHED' : 'FAILED' } });

      if (succeeded) published++;
      else failed++;
    }

    return { processed: due.length, published, failed };
  }
}
