'use server';

import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import {
  CommentIntelligenceService,
  type CommentFilterParams,
} from '@/server/services/comments/comment.service';
import {
  type SocialNetwork,
  type CommentSentiment,
  type CommentCategory,
  type CommentPriorityLevel,
  type CommentStatus,
  type TeamQueue,
} from '@prisma/client';

export async function listCommentsAction(
  orgSlug: string,
  filters: Omit<CommentFilterParams, 'organizationId'>,
) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const result = await CommentIntelligenceService.listComments({
      organizationId: ctx.organization.id,
      ...filters,
    });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

export async function getCommentDetailsAction(orgSlug: string, commentId: string) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const comment = await CommentIntelligenceService.getCommentDetails(
      ctx.organization.id,
      commentId,
    );
    return { ok: true, comment };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

export async function addInternalNoteAction(
  orgSlug: string,
  commentId: string,
  body: string,
) {
  try {
    const ctx = await resolveTenant(orgSlug);
    if (!body || body.trim().length === 0) {
      throw new Error('Le corps de la note ne peut être vide');
    }
    const note = await CommentIntelligenceService.addInternalNote({
      organizationId: ctx.organization.id,
      commentId,
      authorId: ctx.userId,
      body: body.trim(),
    });
    return { ok: true, note };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

export async function generateSuggestionsAction(
  orgSlug: string,
  commentId: string,
  brandVoiceId?: string,
) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const suggestions = await CommentIntelligenceService.generateReplySuggestions({
      organizationId: ctx.organization.id,
      commentId,
      brandVoiceId,
    });
    return { ok: true, suggestions };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de génération' };
  }
}

export async function transitionStatusAction(
  orgSlug: string,
  commentId: string,
  toStatus: CommentStatus,
  replyContent?: string,
  reason?: string,
) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const updated = await CommentIntelligenceService.transitionStatus({
      organizationId: ctx.organization.id,
      commentId,
      toStatus,
      actorUserId: ctx.userId,
      replyContent,
      reason,
    });
    return { ok: true, comment: updated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

export async function assignCommentAction(
  orgSlug: string,
  commentId: string,
  assignedUserId?: string | null,
  assignedTeam?: TeamQueue,
) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const updated = await CommentIntelligenceService.assignComment({
      organizationId: ctx.organization.id,
      commentId,
      assignedUserId,
      assignedTeam,
      actorUserId: ctx.userId,
    });
    return { ok: true, comment: updated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
}

export async function convertToOpportunityAction(
  orgSlug: string,
  commentId: string,
  type: 'LEAD' | 'SUPPORT_TICKET' | 'TASK',
) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const res = await CommentIntelligenceService.convertToOpportunity({
      organizationId: ctx.organization.id,
      commentId,
      actorUserId: ctx.userId,
      type,
    });
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de conversion' };
  }
}

export async function convertToPublicationAction(orgSlug: string, commentId: string) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const res = await CommentIntelligenceService.convertToPublication({
      organizationId: ctx.organization.id,
      commentId,
      actorUserId: ctx.userId,
    });
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de conversion' };
  }
}

export async function detectCrisisAnomalyAction(orgSlug: string) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const res = await CommentIntelligenceService.detectCrisisAnomaly(ctx.organization.id);
    return { ok: true, ...res };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de détection' };
  }
}

export async function publishCommentReplyAction(
  orgSlug: string,
  commentId: string,
  replyContent: string,
) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const comment = await db.socialComment.findFirst({
      where: { id: commentId, organizationId: ctx.organization.id },
    });
    if (!comment) throw new Error('Commentaire introuvable');

    if (comment.isSensitive) {
      throw new Error(
        'Gouvernance de sécurité : ce commentaire traite d’un sujet sensible/juridique. La publication directe est bloquée sans validation d’un spécialiste.',
      );
    }

    if (!replyContent || replyContent.trim().length === 0) {
      throw new Error('La réponse ne peut pas être vide.');
    }

    // Inscription en base & audit
    const updated = await CommentIntelligenceService.transitionStatus({
      organizationId: ctx.organization.id,
      commentId,
      toStatus: 'REPLIED',
      actorUserId: ctx.userId,
      replyContent: replyContent.trim(),
      reason: `Réponse officielle publiée par ${ctx.userId} sur ${comment.platform}`,
    });

    return { ok: true, comment: updated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de publication' };
  }
}

/**
 * Initialise des commentaires d'exemple réalistes pour les tests et la démonstration
 */
export async function seedSampleCommentsAction(orgSlug: string) {
  try {
    const ctx = await resolveTenant(orgSlug);
    const orgId = ctx.organization.id;

    // Échantillon représentatif de commentaires sur les 4 réseaux
    const samples = [
      {
        platform: 'LINKEDIN' as SocialNetwork,
        externalCommentId: `ext_li_${Date.now()}_1`,
        authorName: 'Alexandre Meyer',
        authorUsername: 'alex-meyer-strat',
        authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        content:
          'Excellente analyse sur la convergence IA et souveraineté des données. Quels sont vos tarifs pour une PME de 45 collaborateurs ? Avez-vous une démo disponible cette semaine ?',
        postContextSummary: 'Publication LinkedIn : "Pourquoi la souveraineté technologique devient le KPI n°1 des Comex"',
      },
      {
        platform: 'X' as SocialNetwork,
        externalCommentId: `ext_x_${Date.now()}_2`,
        authorName: 'Sophie Laroche',
        authorUsername: 'sophie_tech_eu',
        content:
          'Bravo pour le rapport trimestriel ! Vos prévisions sur l’automatisation des rédactions se vérifient déjà point par point. Hâte de voir la suite 🔥',
        postContextSummary: 'Post X / Twitter : "Benchmark 2026 de l’impact des LLM verticaux sur les médias"',
      },
      {
        platform: 'INSTAGRAM' as SocialNetwork,
        externalCommentId: `ext_insta_${Date.now()}_3`,
        authorName: 'Marc Vaudeville',
        authorUsername: 'marc_design_lab',
        content:
          'Impossible de me connecter à mon tableau de bord depuis ce matin, ça affiche une erreur 500 récurrente. C’est urgent, pouvez-vous corriger rapidement ?',
        postContextSummary: 'Post Instagram : "Nouvelle interface Studio Éditorial STARS"',
      },
      {
        platform: 'FACEBOOK' as SocialNetwork,
        externalCommentId: `ext_fb_${Date.now()}_4`,
        authorName: 'Jean-Christophe Bernard',
        authorUsername: 'jc.bernard.legal',
        content:
          'Attention, vos allégations sur notre consortium dans votre dernier article frisent la diffamation. Notre cabinet d’avocats vous met en demeure de retirer ces affirmations sous 48h, sous peine de poursuites pénales.',
        postContextSummary: 'Publication Facebook : "Enquête exclusive sur les lobbies énergétiques"',
      },
      {
        platform: 'LINKEDIN' as SocialNetwork,
        externalCommentId: `ext_li_${Date.now()}_5`,
        authorName: 'Dr. Éléonore Chen',
        authorUsername: 'eleonore-chen-phd',
        content:
          'Pourriez-vous préciser comment vous calculez la pondération des sources académiques dans votre radar mondial ? Y a-t-il une API pour les chercheurs ?',
        postContextSummary: 'Publication LinkedIn : "Méthodologie STARS : de la donnée brute à la décision"',
      },
    ];

    let count = 0;
    for (const sample of samples) {
      await CommentIntelligenceService.ingestComment({
        organizationId: orgId,
        ...sample,
      });
      count++;
    }

    return { ok: true, count };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur d’initialisation' };
  }
}
